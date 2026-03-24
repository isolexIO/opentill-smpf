import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import Stripe from 'npm:stripe@17.4.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_PAYOUT_WEBHOOK_SECRET');

/**
 * Webhook handler for Stripe Connect transfer confirmations
 * Listens for: transfer.paid, transfer.failed, etc.
 */

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Handle different event types
    switch (event.type) {
      case 'transfer.paid':
      case 'transfer.created': {
        const transfer = event.data.object;
        const payoutId = transfer.metadata?.payout_id;

        if (payoutId) {
          await base44.asServiceRole.entities.DealerPayout.update(payoutId, {
            status: 'completed',
            processed_at: new Date().toISOString(),
            payout_destination: {
              ...transfer.metadata,
              stripe_transfer_id: transfer.id,
              transfer_status: transfer.status,
              amount: transfer.amount / 100
            }
          });
        }
        break;
      }

      case 'transfer.failed':
      case 'transfer.reversed': {
        const transfer = event.data.object;
        const payoutId = transfer.metadata?.payout_id;

        if (payoutId) {
          await base44.asServiceRole.entities.DealerPayout.update(payoutId, {
            status: 'failed',
            error_message: transfer.failure_message || 'Transfer failed or reversed',
            payout_destination: {
              ...transfer.metadata,
              stripe_transfer_id: transfer.id,
              transfer_status: transfer.status
            }
          });
        }
        break;
      }
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Stripe payout webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});