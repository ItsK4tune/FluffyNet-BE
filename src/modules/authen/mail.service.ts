import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { env } from 'src/config';

@Injectable()
export class MailService {
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
        from: `"Fluffy Net" <Fluffy Net>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
    }
  }
}
