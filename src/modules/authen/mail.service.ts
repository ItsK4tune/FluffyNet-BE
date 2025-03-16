import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { env } from 'src/config';

@Injectable()
export class MailService {
  private readonly logger: Logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.mailer.sender,
        pass: env.mailer.password,
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    try {
      const mailOptions = {
        from: `"Social Network" <${env.mailer.sender}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log('Email sent!');
    } catch (error) {
      this.logger.log('Failed to send email')
    }
  }
}
