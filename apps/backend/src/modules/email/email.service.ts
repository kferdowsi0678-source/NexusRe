import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly fromName: string;

  constructor(private configService: ConfigService) {
    this.fromAddress = this.configService.get<string>('EMAIL_FROM') ?? 'noreply@nexusre.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') ?? 'NexusRe';

    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT') ?? 587,
        secure: this.configService.get<boolean>('SMTP_SECURE') ?? false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  async send(options: EmailOptions): Promise<void> {
    try {
      const html = this.renderTemplate(options.template, options.context);
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      if (!this.transporter) {
        console.log('[EmailService] No SMTP config, would send:', {
          to: recipients,
          subject: options.subject,
        });
        return;
      }

      await this.transporter.sendMail({
        from: this.fromName + ' <' + this.fromAddress + '>',
        to: recipients.join(', '),
        subject: options.subject,
        html,
      });

      console.log('[EmailService] Sent to ' + recipients.length + ' recipient(s): ' + options.subject);
    } catch (error) {
      console.error('[EmailService] Send failed:', error);
    }
  }

  private renderTemplate(name: string, context: Record<string, any>): string {
    const templatePath = join(__dirname, 'templates', name + '.hbs');
    try {
      const source = readFileSync(templatePath, 'utf-8');
      const template = Handlebars.compile(source);
      return template(context);
    } catch (error) {
      console.error('[EmailService] Template ' + name + ' not found, using plain text');
      return JSON.stringify(context, null, 2);
    }
  }

  async sendWelcome(to: string, name: string, resetUrl: string) {
    await this.send({
      to,
      subject: 'Welcome to NexusRe',
      template: 'welcome',
      context: { name, resetUrl },
    });
  }

  async sendPasswordReset(to: string, name: string, resetUrl: string) {
    await this.send({
      to,
      subject: 'Reset your NexusRe password',
      template: 'password-reset',
      context: { name, resetUrl },
    });
  }

  async sendQuoteReceived(to: string, submissionTitle: string, reinsurerName: string, detailUrl: string) {
    await this.send({
      to,
      subject: 'New quote on ' + submissionTitle,
      template: 'quote-received',
      context: { submissionTitle, reinsurerName, detailUrl },
    });
  }

  async sendQuoteStatusChanged(
    to: string,
    submissionTitle: string,
    status: string,
    detailUrl: string,
  ) {
    await this.send({
      to,
      subject: 'Quote ' + status + ' on ' + submissionTitle,
      template: 'quote-status-changed',
      context: { submissionTitle, status, detailUrl },
    });
  }

  async sendMessageReceived(to: string, submissionTitle: string, senderName: string, detailUrl: string) {
    await this.send({
      to,
      subject: 'New message on ' + submissionTitle,
      template: 'message-received',
      context: { submissionTitle, senderName, detailUrl },
    });
  }
}
