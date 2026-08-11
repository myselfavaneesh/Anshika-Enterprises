import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Lazily create transporter to ensure env vars are loaded by dotenv first
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('SMTP_USER or SMTP_PASS is not configured in .env. Cannot send email.');
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export const sendInvoiceEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  const transport = getTransporter();

  const mailOptions = {
    from: `"Anshika Enterprises" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlContent,
  };

  const info = await transport.sendMail(mailOptions);
  logger.info(`Email sent successfully: ${info.messageId}`);
};

