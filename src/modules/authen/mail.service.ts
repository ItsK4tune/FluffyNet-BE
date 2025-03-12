import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { env } from 'src/config';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

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
      return { message: 'Email sent successfully' };
    } catch (error) {
      throw new Error('Failed to send email');
    }
  }
}
