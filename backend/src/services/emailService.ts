import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Configure the transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendInvoiceEmail = async (
  to: string,
  subject: string,
  htmlContent: string
): Promise<void> => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP_USER or SMTP_PASS is not configured in .env. Skipping email sending.');
      return;
    }

    const mailOptions = {
      from: `"Anshika Enterprises" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
  } catch (error: any) {
    logger.error('Error sending email', { error: error.message, stack: error.stack });
    // Not throwing error to prevent stopping the main business logic
  }
};
