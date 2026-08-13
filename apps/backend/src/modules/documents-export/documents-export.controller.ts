import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PdfResponse, PlacementSlipService } from './placement-slip.service';

@ApiTags('documents-export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class DocumentsExportController {
  constructor(private readonly placementSlipService: PlacementSlipService) {}

  /**
   * The model is built before a single byte is written, so a missing submission
   * still surfaces as a normal JSON 404 rather than a truncated PDF.
   */
  @Get(':id/placement-slip')
  @ApiOperation({ summary: 'Download the placement slip for a submission as a PDF' })
  @ApiProduces('application/pdf')
  async placementSlip(@Param('id') id: string, @Res() res: PdfResponse): Promise<void> {
    const model = await this.placementSlipService.buildModel(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${model.fileName}"`);

    this.placementSlipService.streamTo(model, res);
  }
}
