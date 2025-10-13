'use client'

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, ExternalLink, CheckCircle, Search } from 'lucide-react';
import { nowPayments } from '@/lib/nowpayments';
import { createClient } from '@/lib/supabase-client';

interface CryptoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  onSuccess?: () => void;
  existingPaymentUrl?: string;
  existingPaymentId?: string;
}

export function CryptoPaymentModal({
  isOpen,
  onClose,
  amount,
  onSuccess,
  existingPaymentUrl,
  existingPaymentId,
}: CryptoPaymentModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('btc');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [currencies, setCurrencies] = useState<string[]>(['btc', 'eth', 'usdt', 'usdc']);
  const [allCurrencies, setAllCurrencies] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState<'select' | 'payment' | 'processing'>('select');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCurrencies();
      getCurrentUser();
      // Only reset search, but keep payment data for reuse
      setSearchQuery('');

      // If existing payment URL provided, use it
      if (existingPaymentUrl && existingPaymentId) {
        setPaymentData({
          invoice_url: existingPaymentUrl,
          payment_id: existingPaymentId
        });
        setStep('payment');
      } else if (!paymentData) {
        setStep('select');
      }
    }
  }, [isOpen, existingPaymentUrl, existingPaymentId]);

  const getCurrentUser = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadCurrencies = async () => {
    try {
      const availableCurrencies = await nowPayments.getAvailableCurrencies();
      setAllCurrencies(availableCurrencies);

      // Show popular currencies by default
      const popularCurrencies = ['btc', 'eth', 'usdt', 'usdc', 'bnb', 'xrp', 'doge', 'ltc', 'ada', 'matic'];
      const filtered = availableCurrencies.filter(c => popularCurrencies.includes(c));
      if (filtered.length > 0) {
        setCurrencies(filtered);
      } else {
        // Fallback to first 10 currencies if popular ones not found
        setCurrencies(availableCurrencies.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading currencies:', error);
      // Set fallback currencies if API fails
      const fallbackCurrencies = ['btc', 'eth', 'usdt', 'usdc', 'bnb', 'xrp', 'doge', 'ltc'];
      setAllCurrencies(fallbackCurrencies);
      setCurrencies(fallbackCurrencies);
    }
  };

  const getCurrencyName = (code: string) => {
    const names: Record<string, string> = {
      btc: 'Bitcoin',
      eth: 'Ethereum',
      usdt: 'Tether (USDT)',
      usdc: 'USD Coin',
      bnb: 'Binance Coin',
      xrp: 'Ripple',
      doge: 'Dogecoin',
      ltc: 'Litecoin',
      ada: 'Cardano',
      matic: 'Polygon',
    };
    return names[code] || code.toUpperCase();
  };

  const filteredCurrencies = searchQuery
    ? allCurrencies.filter(currency =>
        currency.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getCurrencyName(currency).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currencies;

  // Auto-expand to all currencies when user starts searching
  const displayCurrencies = searchQuery ? filteredCurrencies : currencies;


  const createTransactionRecord = async (payment: any, orderId: string) => {
    try {
      const supabase = createClient();

      // For invoices, NowPayments doesn't return payment_id initially
      // Use order_id for matching instead, which is consistent
      const paymentId = payment.id; // Invoice ID for initial tracking

      console.log('Creating transaction record:', {
        user_id: userId,
        amount: amount,
        payment_id: paymentId,
        payment_url: payment.invoice_url,
        order_id: orderId,
        full_payment_response: payment
      });

      // Store order_id in payment_id initially for webhook matching, will be replaced with real payment_id
      const { data, error } = await supabase.from('transactions').insert({
        user_id: userId,
        type: 'credit',
        amount: amount,
        description: `$${amount} ${selectedCurrency.toUpperCase()} top-up`,
        payment_id: orderId, // Store order_id here for webhook matching
        payment_url: payment.invoice_url,
        status: 'pending'
      });

      if (error) {
        console.error('Transaction insert error:', error);
      } else {
        console.log('Transaction created successfully:', data);
      }
    } catch (error) {
      console.error('Error creating transaction record:', error);
    }
  };

  const handleCreatePayment = async () => {
    // If payment already exists, just open it and go to payment step
    if (paymentData?.invoice_url) {
      console.log('Reusing existing payment:', paymentData.invoice_url);
      setStep('payment');
      window.open(paymentData.invoice_url, '_blank');
      toast({
        title: 'Payment Reopened',
        description: 'Continue your payment in the opened window',
      });
      return;
    }

    console.log('Creating new payment - no existing payment data');

    setLoading(true);
    try {
      const orderId = `topup-${Date.now()}-${userId}`;

      const payment = await nowPayments.createInvoice({
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: selectedCurrency,
        order_id: orderId,
        order_description: `Balance top-up: $${amount}`,
      });

      console.log('📋 Invoice creation response:', payment);

      setPaymentData(payment);
      setStep('payment');

      // Create transaction record with the same order_id
      await createTransactionRecord(payment, orderId);

      // Open invoice URL in new tab if available
      if (payment.invoice_url) {
        window.open(payment.invoice_url, '_blank');
      }

      toast({
        title: 'Payment Created',
        description: 'Complete your payment in the opened window',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (paymentData?.pay_address) {
      navigator.clipboard.writeText(paymentData.pay_address);
      toast({
        title: 'Copied',
        description: 'Payment address copied to clipboard',
      });
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.payment_id) return;

    try {
      const status = await nowPayments.getPaymentStatus(paymentData.payment_id);

      if (status.payment_status === 'finished' || status.payment_status === 'confirmed') {
        setStep('processing');
        toast({
          title: 'Payment Successful',
          description: 'Your balance will be updated shortly',
        });

        // Update balance in database here
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    }
  };

  useEffect(() => {
    if (step === 'payment' && paymentData?.payment_id) {
      const interval = setInterval(checkPaymentStatus, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [step, paymentData]);

  const handleClose = () => {
    setStep('select');
    setPaymentData(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Select Cryptocurrency'}
            {step === 'payment' && 'Complete Payment'}
            {step === 'processing' && 'Processing Payment'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && `Top up $${amount} using cryptocurrency`}
            {step === 'payment' && 'Send payment to the address below'}
            {step === 'processing' && 'Your payment is being processed'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Cryptocurrency</Label>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cryptocurrencies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Currency Selection */}
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {displayCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{currency.toUpperCase()}</span>
                        <span className="text-muted-foreground">{getCurrencyName(currency)}</span>
                      </div>
                    </SelectItem>
                  ))}
                  {displayCurrencies.length === 0 && searchQuery && (
                    <div className="px-2 py-1 text-sm text-muted-foreground">
                      No cryptocurrencies found
                    </div>
                  )}
                </SelectContent>
              </Select>

              {searchQuery && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing {displayCurrencies.length} of {allCurrencies.length} currencies
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery('')}
                    className="text-xs h-6"
                  >
                    Clear
                  </Button>
                </div>
              )}

              {!searchQuery && allCurrencies.length > currencies.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrencies(allCurrencies)}
                  className="w-full text-xs"
                >
                  Show All {allCurrencies.length} Currencies
                </Button>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">You will pay</p>
              <p className="text-2xl font-bold">${amount} USD</p>
              <p className="text-sm text-muted-foreground mt-1">
                in {getCurrencyName(selectedCurrency)}
              </p>
            </div>

            <Button
              onClick={handleCreatePayment}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Payment...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </div>
        )}

        {step === 'payment' && paymentData && (
          <div className="space-y-4">
            {paymentData.invoice_url ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Payment window opened in new tab
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(paymentData.invoice_url, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Payment Page
                  </Button>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Waiting for payment confirmation...
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Send exactly</Label>
                  <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                    {paymentData.pay_amount} {paymentData.pay_currency?.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>To address</Label>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-mono text-xs break-all">{paymentData.pay_address}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="mt-2"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Address
                    </Button>
                  </div>
                </div>

                <div className="text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Waiting for payment confirmation...
                </div>
              </>
            )}
          </div>
        )}

        {step === 'processing' && (
          <div className="py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Payment Received!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Your balance is being updated...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}