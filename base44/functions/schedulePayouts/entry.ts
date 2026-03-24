import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Scheduled Job: Identify and schedule dealer payouts
 * This should run daily via cron
 * 
 * Logic:
 * 1. Find all active dealers with pending payouts
 * 2. Check if payout_hold_days have passed since period_end
 * 3. Mark payouts as "scheduled" if ready
 * 4. Trigger processDealerPayout for scheduled payouts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify root admin access (or system/cron auth)
    const user = await base44.auth.me();
    if (!user || user.role !== 'root_admin') {
      return Response.json({ error: 'Unauthorized - Root admin only' }, { status: 403 });
    }

    const now = new Date();
    const results = {
      scheduled: 0,
      processed: 0,
      failed: 0,
      errors: []
    };

    // Get all pending payouts
    const pendingPayouts = await base44.asServiceRole.entities.DealerPayout.filter({
      status: 'pending'
    });

    for (const payout of pendingPayouts) {
      try {
        // Load dealer to check hold period
        const dealers = await base44.asServiceRole.entities.Dealer.filter({ id: payout.dealer_id });
        if (!dealers || dealers.length === 0) {
          console.log(`Dealer ${payout.dealer_id} not found for payout ${payout.id}`);
          continue;
        }

        const dealer = dealers[0];
        const holdDays = dealer.payout_hold_days || 7;
        
        // Calculate when payout should be scheduled
        const periodEnd = new Date(payout.period_end);
        const scheduledDate = new Date(periodEnd);
        scheduledDate.setDate(scheduledDate.getDate() + holdDays);

        // If scheduled date has passed, schedule the payout
        if (scheduledDate <= now) {
          // Check minimum payout threshold
          const minimumPayout = dealer.payout_minimum || 20.0;
          
          if (payout.commission_amount < minimumPayout) {
            // Carryover to next period
            await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
              status: 'on_hold',
              notes: `Below minimum payout threshold of $${minimumPayout}. Amount will carry over to next period.`
            });
            continue;
          }

          // Mark as scheduled
          await base44.asServiceRole.entities.DealerPayout.update(payout.id, {
            status: 'scheduled',
            scheduled_at: now.toISOString()
          });

          results.scheduled++;

          // Trigger processing
          try {
            const processResult = await base44.functions.invoke('processDealerPayout', {
              payout_id: payout.id
            });

            if (processResult.data.success) {
              results.processed++;
            } else {
              results.failed++;
              results.errors.push({
                payout_id: payout.id,
                error: processResult.data.error
              });
            }
          } catch (processError) {
            console.error(`Error processing payout ${payout.id}:`, processError);
            results.failed++;
            results.errors.push({
              payout_id: payout.id,
              error: processError.message
            });
          }
        }
      } catch (error) {
        console.error(`Error handling payout ${payout.id}:`, error);
        results.errors.push({
          payout_id: payout.id,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Schedule payouts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});