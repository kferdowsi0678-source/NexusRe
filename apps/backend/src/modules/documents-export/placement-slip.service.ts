import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Organization } from '../organizations/entities/organization.entity';
import { SubmissionsService } from '../submissions/submissions.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-request';
import { applySlipAccess, resolveSlipAccess } from './placement-slip-access';
import {
  EMPTY_VALUE,
  PlacementSlipModel,
  SlipDocumentRow,
  SlipQuoteRow,
  SlipRow,
  SlipSection,
  buildPlacementSlip,
} from './placement-slip-content';

/**
 * Just enough of an Express response to stream a PDF into, declared locally so
 * this module does not pull in @types/express (see AuthenticatedRequest).
 */
export interface PdfResponse extends NodeJS.WritableStream {
  setHeader(name: string, value: string): void;
}

interface TableColumn {
  header: string;
  /** Share of the content width, 0–1. The columns should sum to 1. */
  width: number;
  align?: 'left' | 'right';
}

interface TableRow {
  cells: string[];
  /** Wrapped full-width line printed under the row, e.g. quote terms. */
  note?: string;
  highlight?: boolean;
}

const NAVY = '#1f2a44';
const INK = '#111827';
const MUTED = '#6b7280';
const RULE = '#d1d5db';
const ACCENT = '#4f46e5';
const BAND = '#f3f4f6';
const ACCEPTED_FILL = '#ecfdf5';
const ACCEPTED_LINE = '#059669';

const MARGIN = 50;
/** Kept clear at the foot of every page for the generated-by strip. */
const FOOTER_RESERVE = 34;
const LABEL_WIDTH = 140;
const CELL_PADDING = 6;

@Injectable()
export class PlacementSlipService {
  constructor(
    private readonly submissionsService: SubmissionsService,
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
  ) {}

  /**
   * Loads the submission and builds the slip for a specific viewer.
   *
   * Authorization is enforced here rather than inherited from
   * SubmissionsService.findOne, which is an unauthenticated lookup. The slip
   * aggregates every market's rate, premium and capacity onto one page, so a
   * reinsurer receives it with its own quotes only.
   */
  async buildModel(
    submissionId: string,
    viewer: AuthenticatedUser,
  ): Promise<PlacementSlipModel> {
    const submission = await this.submissionsService.findOne(submissionId);

    const access = resolveSlipAccess(submission, viewer);
    if (access.kind === 'denied') {
      throw new ForbiddenException('You do not have access to this submission');
    }

    const broker = await this.resolveBroker(submission);

    return buildPlacementSlip(
      { ...submission, quotes: applySlipAccess(submission.quotes, access) },
      { broker, generatedAt: new Date() },
    );
  }

  /**
   * A submission has no broker column. The broker of record, when there is one,
   * is the organisation behind whoever raised the submission — and only when
   * that is not the cedant itself.
   */
  private async resolveBroker(submission: {
    cedantId?: string;
    submittedBy?: { organizationId?: string } | null;
  }): Promise<Organization | null> {
    const organizationId = submission.submittedBy?.organizationId;
    if (!organizationId || organizationId === submission.cedantId) return null;

    const org = await this.organizationsRepository.findOne({ where: { id: organizationId } });
    return org ?? null;
  }

  /** Renders the model and pipes it straight at the response. */
  streamTo(model: PlacementSlipModel, target: PdfResponse): void {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `Placement Slip ${model.header.reference}`,
        Author: 'NexusRe',
        Subject: model.header.title,
      },
    });

    doc.pipe(target);

    this.drawHeader(doc, model);
    this.drawSummary(doc, model);
    this.drawParties(doc, model);
    this.drawSection(doc, model.riskDetails);
    this.drawDocuments(doc, model.documents);
    this.drawQuotes(doc, model);
    this.drawFooters(doc, model);

    doc.end();
  }

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------

  private drawHeader(doc: PDFKit.PDFDocument, model: PlacementSlipModel): void {
    const width = this.contentWidth(doc);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(ACCENT)
      .text('PLACEMENT SLIP', MARGIN, MARGIN, { width, characterSpacing: 1.2 });

    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(NAVY)
      .text(model.header.title, { width });

    doc
      .moveDown(0.2)
      .font('Helvetica')
      .fontSize(10)
      .fillColor(MUTED)
      .text(
        [
          model.header.reference,
          model.header.type,
          model.header.lineOfBusiness,
          model.header.status,
        ].join('   |   '),
        { width },
      );

    doc.moveDown(0.6);
    this.rule(doc, ACCENT, 1.5);

    if (model.description) {
      doc
        .moveDown(0.6)
        .font('Helvetica')
        .fontSize(10)
        .fillColor(INK)
        .text(model.description, MARGIN, doc.y, { width, align: 'left' });
    }
  }

  private drawSummary(doc: PDFKit.PDFDocument, model: PlacementSlipModel): void {
    this.heading(doc, 'Placement Summary');
    this.drawRows(doc, model.summary);
  }

  private drawParties(doc: PDFKit.PDFDocument, model: PlacementSlipModel): void {
    for (const party of model.parties) {
      this.drawSection(doc, party);
    }
  }

  private drawSection(doc: PDFKit.PDFDocument, section: SlipSection): void {
    this.heading(doc, section.title);
    if (section.rows.length === 0) {
      this.emptyNote(doc, section.emptyMessage ?? 'Nothing recorded.');
      return;
    }
    this.drawRows(doc, section.rows);
  }

  private drawDocuments(doc: PDFKit.PDFDocument, documents: SlipDocumentRow[]): void {
    this.heading(doc, 'Supporting Documents');

    if (documents.length === 0) {
      this.emptyNote(doc, 'No documents have been attached to this submission.');
      return;
    }

    this.table(
      doc,
      [
        { header: 'Document', width: 0.42 },
        { header: 'Category', width: 0.2 },
        { header: 'Size', width: 0.14, align: 'right' },
        { header: 'Uploaded', width: 0.24, align: 'right' },
      ],
      documents.map((row) => ({ cells: [row.name, row.category, row.size, row.uploaded] })),
    );
  }

  private drawQuotes(doc: PDFKit.PDFDocument, model: PlacementSlipModel): void {
    this.heading(doc, 'Market Quotes');

    if (model.quotes.length === 0) {
      this.emptyNote(doc, 'No quotes have been received on this submission.');
    } else {
      this.table(
        doc,
        [
          { header: 'Reinsurer', width: 0.26 },
          { header: 'Type', width: 0.14 },
          { header: 'Status', width: 0.14 },
          { header: 'Share', width: 0.1, align: 'right' },
          { header: 'Rate', width: 0.1, align: 'right' },
          { header: 'Premium', width: 0.26, align: 'right' },
        ],
        model.quotes.map((quote) => ({
          cells: [
            quote.reinsurer,
            quote.quoteType,
            quote.status,
            quote.share,
            quote.rate,
            quote.premium,
          ],
          note:
            quote.terms && quote.terms !== EMPTY_VALUE ? `Terms: ${quote.terms}` : undefined,
          highlight: quote.accepted,
        })),
      );
    }

    if (model.acceptedQuote) {
      this.drawAcceptedQuote(doc, model.acceptedQuote);
    }
  }

  private drawAcceptedQuote(doc: PDFKit.PDFDocument, quote: SlipQuoteRow): void {
    const width = this.contentWidth(doc);
    const rows: SlipRow[] = [
      { label: 'Reinsurer', value: quote.reinsurer },
      { label: 'Quote Type', value: quote.quoteType },
      { label: 'Share', value: quote.share },
      { label: 'Rate', value: quote.rate },
      { label: 'Premium', value: quote.premium },
      { label: 'Valid Until', value: quote.validUntil },
      { label: 'Terms', value: quote.terms },
    ];

    const innerWidth = width - CELL_PADDING * 4;
    const bodyHeight = rows.reduce(
      (total, row) => total + this.rowHeight(doc, row, innerWidth - LABEL_WIDTH),
      0,
    );
    const boxHeight = bodyHeight + 44;

    this.ensureSpace(doc, boxHeight);

    const top = doc.y + 10;
    doc
      .save()
      .roundedRect(MARGIN, top, width, boxHeight, 4)
      .fillAndStroke(ACCEPTED_FILL, ACCEPTED_LINE)
      .restore();

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(ACCEPTED_LINE)
      .text('ACCEPTED / BOUND QUOTE', MARGIN + CELL_PADDING * 2, top + 10, {
        width: innerWidth,
        characterSpacing: 0.8,
      });

    doc.y = top + 26;
    this.drawRows(doc, rows, {
      left: MARGIN + CELL_PADDING * 2,
      width: innerWidth,
      compact: true,
    });

    doc.y = top + boxHeight + 6;
  }

  private drawFooters(doc: PDFKit.PDFDocument, model: PlacementSlipModel): void {
    const range = doc.bufferedPageRange();

    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);

      // Writing below the bottom margin would otherwise spill onto a new page.
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const width = this.contentWidth(doc);
      const y = doc.page.height - MARGIN + 6;

      doc
        .save()
        .moveTo(MARGIN, y - 8)
        .lineTo(MARGIN + width, y - 8)
        .lineWidth(0.5)
        .strokeColor(RULE)
        .stroke()
        .restore();

      doc.font('Helvetica').fontSize(8).fillColor(MUTED);
      doc.text(
        `${model.footer.generatedBy}  |  ${model.header.reference}  |  ${model.footer.generatedAt}`,
        MARGIN,
        y,
        { width, align: 'left', lineBreak: false },
      );
      doc.text(`Page ${index + 1} of ${range.count}`, MARGIN, y, {
        width,
        align: 'right',
        lineBreak: false,
      });

      doc.page.margins.bottom = bottomMargin;
    }
  }

  // -------------------------------------------------------------------------
  // Layout primitives
  // -------------------------------------------------------------------------

  private contentWidth(doc: PDFKit.PDFDocument): number {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
  }

  /** Adds a page when `needed` points would run into the footer strip. */
  private ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
    const limit = doc.page.height - doc.page.margins.bottom - FOOTER_RESERVE;
    if (doc.y + needed > limit) doc.addPage();
  }

  private rule(doc: PDFKit.PDFDocument, color: string, lineWidth = 0.5): void {
    const width = this.contentWidth(doc);
    doc
      .save()
      .moveTo(MARGIN, doc.y)
      .lineTo(MARGIN + width, doc.y)
      .lineWidth(lineWidth)
      .strokeColor(color)
      .stroke()
      .restore();
  }

  private heading(doc: PDFKit.PDFDocument, text: string): void {
    this.ensureSpace(doc, 60);
    doc.moveDown(1);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(NAVY)
      .text(text.toUpperCase(), MARGIN, doc.y, {
        width: this.contentWidth(doc),
        characterSpacing: 0.8,
      });
    doc.moveDown(0.35);
    this.rule(doc, RULE);
    doc.moveDown(0.5);
  }

  private emptyNote(doc: PDFKit.PDFDocument, message: string): void {
    this.ensureSpace(doc, 24);
    doc
      .font('Helvetica-Oblique')
      .fontSize(9.5)
      .fillColor(MUTED)
      .text(message, MARGIN, doc.y, { width: this.contentWidth(doc) });
  }

  private rowHeight(doc: PDFKit.PDFDocument, row: SlipRow, valueWidth: number): number {
    const value = doc
      .font('Helvetica')
      .fontSize(9.5)
      .heightOfString(row.value || EMPTY_VALUE, { width: valueWidth });
    const label = doc
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .heightOfString(row.label, { width: LABEL_WIDTH - CELL_PADDING });
    return Math.max(value, label) + 5;
  }

  private drawRows(
    doc: PDFKit.PDFDocument,
    rows: SlipRow[],
    options: { left?: number; width?: number; compact?: boolean } = {},
  ): void {
    const left = options.left ?? MARGIN;
    const width = options.width ?? this.contentWidth(doc);
    const valueWidth = width - LABEL_WIDTH;

    for (const row of rows) {
      const height = this.rowHeight(doc, row, valueWidth);
      if (!options.compact) this.ensureSpace(doc, height);

      const top = doc.y;

      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(MUTED)
        .text(row.label, left, top, { width: LABEL_WIDTH - CELL_PADDING });

      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(INK)
        .text(row.value || EMPTY_VALUE, left + LABEL_WIDTH, top, { width: valueWidth });

      doc.y = top + height;
    }
  }

  private table(doc: PDFKit.PDFDocument, columns: TableColumn[], rows: TableRow[]): void {
    const width = this.contentWidth(doc);
    const widths = columns.map((column) => column.width * width);

    this.ensureSpace(doc, 60);
    this.tableHeader(doc, columns, widths);

    rows.forEach((row, index) => {
      const height = this.tableRowHeight(doc, row, widths);

      if (doc.y + height > doc.page.height - doc.page.margins.bottom - FOOTER_RESERVE) {
        doc.addPage();
        this.tableHeader(doc, columns, widths);
      }

      const top = doc.y;

      if (row.highlight) {
        doc.save().rect(MARGIN, top, width, height).fill(ACCEPTED_FILL).restore();
      } else if (index % 2 === 1) {
        doc.save().rect(MARGIN, top, width, height).fill(BAND).restore();
      }

      let x = MARGIN;
      columns.forEach((column, columnIndex) => {
        doc
          .font(row.highlight ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .fillColor(INK)
          .text(row.cells[columnIndex] ?? EMPTY_VALUE, x + CELL_PADDING, top + CELL_PADDING, {
            width: widths[columnIndex] - CELL_PADDING * 2,
            align: column.align ?? 'left',
            lineBreak: true,
          });
        x += widths[columnIndex];
      });

      if (row.note) {
        doc
          .font('Helvetica-Oblique')
          .fontSize(8.5)
          .fillColor(MUTED)
          .text(row.note, MARGIN + CELL_PADDING, top + height - this.noteHeight(doc, row, width), {
            width: width - CELL_PADDING * 2,
          });
      }

      doc.y = top + height;

      doc
        .save()
        .moveTo(MARGIN, doc.y)
        .lineTo(MARGIN + width, doc.y)
        .lineWidth(0.5)
        .strokeColor(RULE)
        .stroke()
        .restore();
    });
  }

  private tableHeader(
    doc: PDFKit.PDFDocument,
    columns: TableColumn[],
    widths: number[],
  ): void {
    const width = this.contentWidth(doc);
    const top = doc.y;
    const height = 20;

    doc.save().rect(MARGIN, top, width, height).fill(NAVY).restore();

    let x = MARGIN;
    columns.forEach((column, index) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#ffffff')
        .text(column.header.toUpperCase(), x + CELL_PADDING, top + 6, {
          width: widths[index] - CELL_PADDING * 2,
          align: column.align ?? 'left',
          lineBreak: false,
        });
      x += widths[index];
    });

    doc.y = top + height;
  }

  private noteHeight(doc: PDFKit.PDFDocument, row: TableRow, width: number): number {
    if (!row.note) return 0;
    return (
      doc
        .font('Helvetica-Oblique')
        .fontSize(8.5)
        .heightOfString(row.note, { width: width - CELL_PADDING * 2 }) + 2
    );
  }

  private tableRowHeight(doc: PDFKit.PDFDocument, row: TableRow, widths: number[]): number {
    const tallest = row.cells.reduce((max, cell, index) => {
      const height = doc
        .font('Helvetica')
        .fontSize(9)
        .heightOfString(cell || EMPTY_VALUE, { width: widths[index] - CELL_PADDING * 2 });
      return Math.max(max, height);
    }, 0);

    return tallest + CELL_PADDING * 2 + this.noteHeight(doc, row, this.contentWidth(doc));
  }
}
