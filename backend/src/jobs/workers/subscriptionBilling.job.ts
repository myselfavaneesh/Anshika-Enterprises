import prisma from '../../prisma';
import { logger } from '../../utils/logger';
import { sendInvoiceEmail } from '../../services/emailService';

export async function processSubscriptionBillingJob(): Promise<void> {
  logger.info('[Worker:SubscriptionBilling] Checking for due subscription renewals...');

  try {
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { lte: new Date() },
      },
      include: {
        customer: true,
      },
    });

    if (dueSubscriptions.length === 0) {
      logger.info('[Worker:SubscriptionBilling] No subscriptions currently due for renewal.');
      return;
    }

    logger.info(`[Worker:SubscriptionBilling] Found ${dueSubscriptions.length} subscriptions due for billing.`);

    for (const sub of dueSubscriptions) {
      logger.info(`[Worker:SubscriptionBilling] Processing subscription ${sub.id} for customer ${sub.customer.name} (Amount: ₹${sub.amount})`);

      // If customer has an email, send renewal notice
      if (sub.customer.email && process.env.SMTP_USER) {
        const emailBody = `
          <h3>Subscription Renewal Notice</h3>
          <p>Dear ${sub.customer.name},</p>
          <p>Your subscription plan <strong>${sub.planName}</strong> (₹${sub.amount}) was due on ${new Date(sub.nextBillingDate).toLocaleDateString('en-IN')}.</p>
          <p>Please contact Anshika Enterprises to ensure uninterrupted service.</p>
        `;

        try {
          await sendInvoiceEmail(
            sub.customer.email,
            `Subscription Renewal: ${sub.planName} - Anshika Enterprises`,
            emailBody
          );
        } catch (emailErr: any) {
          logger.warn(`[Worker:SubscriptionBilling] Failed to send email for sub ${sub.id}:`, { error: emailErr.message });
        }
      }

      // Advance nextBillingDate based on interval
      const nextDate = new Date(sub.nextBillingDate);
      if (sub.billingInterval === 'MONTHLY') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      } else {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate: nextDate },
      });

      logger.info(`[Worker:SubscriptionBilling] Advanced subscription ${sub.id} nextBillingDate to ${nextDate.toISOString()}`);
    }
  } catch (error: any) {
    logger.error('[Worker:SubscriptionBilling] Error processing subscription billing job:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
