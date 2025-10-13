import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

interface NowPaymentsWebhook {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id?: string;
  created_at: string;
  updated_at: string;
  outcome_amount?: number;
  outcome_currency?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const webhook: NowPaymentsWebhook = JSON.parse(body);

    // Log the webhook for debugging
    console.log('🔔 NowPayments webhook received:', JSON.stringify(webhook, null, 2));
    console.log('🔄 Payment status:', webhook.payment_status);
    console.log('📝 Order ID:', webhook.order_id);
    console.log('💳 Webhook Payment ID:', webhook.payment_id);
    console.log('💰 Payment Amount:', webhook.price_amount);


    // Verify webhook signature
    const signature = request.headers.get('x-nowpayments-sig');
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Verify API key is configured
    const apiKey = process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY;
    if (!apiKey) {
      console.error('NowPayments API key not configured');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Only process successful payments
    if (webhook.payment_status === 'finished' || webhook.payment_status === 'confirmed') {
      console.log('✅ Processing successful payment');
      await processSuccessfulPayment(webhook);
    } else if (webhook.payment_status === 'failed' || webhook.payment_status === 'refunded') {
      console.log('❌ Processing failed payment');
      await processFailedPayment(webhook);
    } else {
      console.log('⏳ Payment status not processed:', webhook.payment_status);
    }

    // Always respond with 200 to acknowledge receipt
    return NextResponse.json({ status: 'received' });
  } catch (error) {
    console.error('Error processing NowPayments webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processSuccessfulPayment(webhook: NowPaymentsWebhook) {
  try {
    // Extract user ID from order_id (format: "topup-{timestamp}-{userId}")
    const userId = extractUserIdFromOrderId(webhook.order_id);
    if (!userId) {
      console.error('Could not extract user ID from order_id:', webhook.order_id);
      return;
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update user balance using the database function
    const { data: newBalance, error: balanceError } = await supabase
      .rpc('update_user_balance', {
        p_user_id: userId,
        p_amount: webhook.price_amount,
        p_operation: 'add'
      });

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
    } else {
      console.log(`Updated balance for user ${userId}: $${newBalance}`);
    }

    // Find transaction by order_id stored in payment_id field
    console.log(`🔍 Looking for transaction with order_id: ${webhook.order_id}`);

    const { data: matchingTransactions, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('amount', webhook.price_amount)
      .eq('payment_id', webhook.order_id);

    if (findError) {
      console.error('❌ Error finding transaction by order_id:', findError);
    } else {
      console.log(`📋 Found ${matchingTransactions?.length || 0} matching transactions:`, matchingTransactions);
    }

    // Update the first matching transaction (should be unique due to order_id)
    const transactionToUpdate = matchingTransactions?.[0];
    if (transactionToUpdate) {
      const { data: updateData, error: transactionError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          payment_id: webhook.payment_id.toString(), // Store the final payment_id from webhook
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionToUpdate.id)
        .select();

      if (transactionError) {
        console.error('❌ Error updating transaction:', transactionError);
      } else {
        console.log(`✅ Transaction updated successfully:`, updateData?.[0]);
      }
    } else {
      console.log(`⚠️ No matching transaction found for order: ${webhook.order_id}`);

      // Debug: show recent transactions
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('id, description, amount, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('📋 Recent transactions for debugging:', recentTransactions);
    }


    console.log(`Successfully processed payment for user ${userId}: +$${webhook.price_amount}`);
  } catch (error) {
    console.error('Error in processSuccessfulPayment:', error);
  }
}

async function processFailedPayment(webhook: NowPaymentsWebhook) {
  try {
    const userId = extractUserIdFromOrderId(webhook.order_id);
    if (!userId) return;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Record failed transaction
    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'credit',
        amount: webhook.price_amount,
        description: `Failed top-up via ${webhook.pay_currency.toUpperCase()}`,
        payment_id: webhook.payment_id,
        status: 'failed',
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error recording failed transaction:', error);
    }

    console.log(`Recorded failed payment for user ${userId}: $${webhook.price_amount}`);
  } catch (error) {
    console.error('Error in processFailedPayment:', error);
  }
}

function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.warn('No signature provided in webhook');
    return true; // Allow for testing - remove in production
  }

  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!ipnSecret) {
    console.warn('IPN secret not configured');
    return true; // Allow for testing - remove in production
  }

  try {
    // NowPayments uses HMAC-SHA512 for signature verification
    const expectedSignature = crypto
      .createHmac('sha512', ipnSecret)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

function extractUserIdFromOrderId(orderId: string): string | null {
  // Order_id format: "topup-{timestamp}-{userId}" where userId is a UUID with dashes
  // Example: "topup-1759701483198-c740c555-758b-4b16-8ac9-196cd040d580"

  if (!orderId.startsWith('topup-')) {
    return null;
  }

  // Remove "topup-" prefix and find the timestamp
  const withoutPrefix = orderId.substring(6); // Remove "topup-"
  const timestampMatch = withoutPrefix.match(/^(\d+)-(.+)$/);

  if (timestampMatch) {
    return timestampMatch[2]; // Return the user ID part (everything after timestamp)
  }

  return null;
}