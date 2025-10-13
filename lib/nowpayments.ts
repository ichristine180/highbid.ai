// NowPayments API Integration
// Documentation: https://documenter.getpostman.com/view/7907941/2s93JusNJt

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1';

interface CreatePaymentParams {
  price_amount: number;
  price_currency: string;
  pay_currency?: string;
  order_id?: string;
  order_description?: string;
  ipn_callback_url?: string;
  success_url?: string;
  cancel_url?: string;
}

interface PaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url?: string;
  created_at: string;
  updated_at: string;
  purchase_id?: string;
  invoice_url?: string;
}

interface MinimumAmountResponse {
  currency_from: string;
  currency_to: string;
  min_amount: number;
}

export class NowPaymentsAPI {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.NEXT_PUBLIC_NOWPAYMENTS_API_KEY || '';
  }

  // Get available currencies
  async getAvailableCurrencies(): Promise<string[]> {
    try {
      const response = await fetch(`${NOWPAYMENTS_API_URL}/currencies`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch currencies');
      }

      const data = await response.json();
      return data.currencies || [];
    } catch (error) {
      console.error('Error fetching currencies:', error);
      return ['btc', 'eth', 'usdt', 'usdc', 'bnb', 'xrp', 'doge', 'ltc'];
    }
  }

  // Get minimum payment amount
  async getMinimumAmount(currency_from: string, currency_to: string = 'usd'): Promise<number> {
    try {
      const response = await fetch(
        `${NOWPAYMENTS_API_URL}/min-amount?currency_from=${currency_from}&currency_to=${currency_to}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch minimum amount');
      }

      const data: MinimumAmountResponse = await response.json();
      return data.min_amount;
    } catch (error) {
      console.error('Error fetching minimum amount:', error);
      return 10; // Default minimum $10
    }
  }

  // Create a payment
  async createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          ipn_callback_url: params.ipn_callback_url || `${window.location.origin}/api/nowpayments/callback`,
          success_url: params.success_url || `${window.location.origin}/dashboard/balance?payment=success`,
          cancel_url: params.cancel_url || `${window.location.origin}/dashboard/balance?payment=cancelled`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create payment: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  // Create invoice (alternative method with payment link)
  async createInvoice(params: CreatePaymentParams): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          ipn_callback_url: params.ipn_callback_url || `${window.location.origin}/api/nowpayments/callback`,
          success_url: params.success_url || `${window.location.origin}/dashboard/balance?payment=success`,
          cancel_url: params.cancel_url || `${window.location.origin}/dashboard/balance?payment=cancelled`,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create invoice: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  // Get payment status
  async getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${NOWPAYMENTS_API_URL}/payment/${paymentId}`, {
        method: 'GET',
        headers: {
          'x-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payment status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw error;
    }
  }

  // Estimate price
  async estimatePrice(amount: number, currency_from: string, currency_to: string): Promise<number> {
    try {
      const response = await fetch(
        `${NOWPAYMENTS_API_URL}/estimate?amount=${amount}&currency_from=${currency_from}&currency_to=${currency_to}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to estimate price');
      }

      const data = await response.json();
      return data.estimated_amount;
    } catch (error) {
      console.error('Error estimating price:', error);
      return amount;
    }
  }
}

export const nowPayments = new NowPaymentsAPI();