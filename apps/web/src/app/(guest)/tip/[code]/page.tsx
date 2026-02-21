'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { stripePromise } from '@/lib/stripe';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { StepIndicator } from '@/components/ui/step-indicator';
import { HotelHero } from '@/components/ui/hotel-hero';
import { AmountSelector } from '@/components/ui/amount-selector';
import { TogglePill } from '@/components/ui/toggle-pill';
import { DatePicker } from '@/components/ui/date-picker';
import { Controller } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { TipStatus } from '@tipper/shared';
import type { QrResolveResponse, TipConfirmation } from '@tipper/shared';

const tipFormSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  checkInDate: z.coerce.date({
    required_error: 'Check-in date is required',
    invalid_type_error: 'Invalid check-in date',
  }),
  checkOutDate: z.coerce.date({
    required_error: 'Check-out date is required',
    invalid_type_error: 'Invalid check-out date',
  }),
  tipMethod: z.enum(['per_day', 'flat']),
  amountPerDay: z.number().optional(),
  totalAmount: z.number().min(100, 'Minimum tip is $1.00'),
  message: z.string().max(500).optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
});

type TipFormData = z.infer<typeof tipFormSchema>;

type Step = 'loading' | 'error' | 'stayDetails' | 'amount' | 'payment' | 'confirmation';

const STEP_NUMBER: Record<string, number> = {
  stayDetails: 1,
  amount: 2,
  payment: 3,
};

function PaymentForm({
  tipData,
  onProcessTip,
  onSuccess,
  onError,
}: {
  tipData: TipFormData;
  onProcessTip: (data: TipFormData) => Promise<string | null>;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handlePayment() {
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg('');

    // First, process the tip with the backend
    const clientSecretFromTipProcess = await onProcessTip(tipData);

    if (!clientSecretFromTipProcess) {
      setErrorMsg('Failed to process tip with backend.');
      onError('Failed to process tip with backend.');
      setProcessing(false);
      return;
    }

    // Now, submit to Stripe
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setErrorMsg(submitError.message || 'Payment failed');
      setProcessing(false);
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      clientSecret: clientSecretFromTipProcess, // Use the clientSecret from the tip process
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      const msg = error.message || 'Payment failed';
      setErrorMsg(msg);
      onError(msg);
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}
      <Button
        type="button"
        variant="gold"
        size="xl"
        className="w-full"
        disabled={!stripe || processing}
        onClick={handlePayment}
      >
        {processing ? 'Processing...' : 'Complete Payment'}
      </Button>
    </div>
  );
}

export default function TipPage() {
  const params = useParams();
  const code = params.code as string;

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState('');
  const [hotelInfo, setHotelInfo] = useState<QrResolveResponse | null>(null);
  const [confirmation, setConfirmation] = useState<TipConfirmation | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const [tipData, setTipData] = useState<{ tipId: string; amount: number } | null>(null);

  const form = useForm<TipFormData>({
    resolver: zodResolver(tipFormSchema),
    defaultValues: {
      roomNumber: '',
      checkInDate: undefined,
      checkOutDate: undefined,
      tipMethod: 'flat',
      amountPerDay: undefined,
      totalAmount: 0,
      message: '',
      guestName: '',
      guestEmail: '',
    },
  });

  useEffect(() => {
    api.get<QrResolveResponse>(`/qr/${code}`).then((res) => {
      if (res.success && res.data) {
        setHotelInfo(res.data);
        form.setValue('roomNumber', res.data.roomNumber);
        setStep('stayDetails');
      } else {
        setError(res.error?.message || 'Invalid QR code');
        setStep('error');
      }
    });
  }, [code]); // only re-run when code changes

  const tipMethod = form.watch('tipMethod');
  const checkInDate = form.watch('checkInDate');
  const checkOutDate = form.watch('checkOutDate');

  const numberOfDays =
    checkInDate && checkOutDate
      ? Math.max(
          1,
          Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)),
        )
      : 1;

  function handleAmountSelect(amount: number) {
    setSelectedAmount(amount);
    if (tipMethod === 'per_day') {
      form.setValue('amountPerDay', amount);
      form.setValue('totalAmount', amount * numberOfDays);
    } else {
      form.setValue('totalAmount', amount);
    }
  }

  async function handleSubmit(data: TipFormData): Promise<string | null> {
    if (!hotelInfo) return null;

    const res = await api.post<{ tipId: string; clientSecret: string | null }>('/tips', {
      qrCode: code,
      roomId: hotelInfo.roomId,
      guestName: data.guestName || undefined,
      guestEmail: data.guestEmail || undefined,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      tipMethod: data.tipMethod,
      amountPerDay: data.amountPerDay,
      totalAmount: data.totalAmount,
      message: data.message || undefined,
    });

    if (res.success && res.data) {
      setTipData({ tipId: res.data.tipId, amount: data.totalAmount });
      return res.data.clientSecret;
    } else {
      setError(res.error?.message || 'Failed to process tip');
      return null;
    }
  }

  function handlePaymentSuccess() {
    if (!hotelInfo || !tipData) return;
    setConfirmation({
      tipId: tipData.tipId,
      hotelName: hotelInfo.hotelName,
      roomNumber: form.getValues('roomNumber'),
      amount: tipData.amount,
      currency: hotelInfo.currency,
      status: TipStatus.PROCESSING,
      createdAt: new Date().toISOString(),
    });
    setStep('confirmation');
  }

  if (step === 'loading') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="loading"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 items-center justify-center p-4"
        >
          <div className="w-full max-w-md space-y-6">
            <Skeleton className="h-[100px] w-full" /> {/* HotelHero skeleton */}
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-10 w-3/4" /> {/* Label skeleton */}
                <Skeleton className="h-10 w-full" /> {/* Input skeleton */}
                <Skeleton className="h-10 w-3/4" /> {/* Label skeleton */}
                <Skeleton className="h-10 w-full" /> {/* Input skeleton */}
                <Skeleton className="h-10 w-3/4" /> {/* Label skeleton */}
                <Skeleton className="h-10 w-full" /> {/* Input skeleton */}
                <Skeleton className="h-12 w-full" /> {/* Button skeleton */}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (step === 'error') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="error"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 items-center justify-center p-4"
        >
          <Card className="w-full max-w-md">
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <p className="text-lg font-semibold text-destructive">Invalid QR Code</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <p className="text-sm text-muted-foreground">
                Please scan a valid QR code from your hotel room.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (step === 'confirmation' && confirmation) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="confirmation"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 items-center justify-center p-4"
        >
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
              <CheckCircle2 className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Thank You!</h2>
              <p className="mt-2 text-muted-foreground">Your generosity is appreciated</p>
            </div>
            <Card>
              <CardContent className="pt-6 divide-y divide-border/50">
                <div className="flex justify-between pb-3">
                  <span className="text-muted-foreground">Hotel</span>
                  <span className="font-medium">{confirmation.hotelName}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-muted-foreground">Room</span>
                  <span className="font-medium">{confirmation.roomNumber}</span>
                </div>
                <div className="flex justify-between pt-3">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(confirmation.amount, confirmation.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary/70" />
              <span>100% goes directly to your cleaning staff</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (step === 'payment' && stripePromise) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="payment"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="flex flex-1 flex-col p-4 pt-6"
        >
          <div className="mx-auto w-full max-w-md space-y-6">
            <StepIndicator currentStep={3} totalSteps={3} />
            <div className="text-center">
              <h2 className="text-xl font-bold tracking-tight">Complete Payment</h2>
              <p className="mt-1 text-muted-foreground">
                {formatCurrency(tipData?.amount ?? 0, hotelInfo?.currency)} tip for{' '}
                {hotelInfo?.hotelName}
              </p>
            </div>
            <div className="space-y-5">
              <div>
                <Label htmlFor="guestName">Your Name (optional)</Label>
                <Input id="guestName" {...form.register('guestName')} placeholder="John Doe" />
              </div>
              <div>
                <Label htmlFor="message">Message for Staff (optional)</Label>
                <Textarea
                  id="message"
                  {...form.register('message')}
                  placeholder="Thank you for keeping our room clean!"
                  maxLength={500}
                />
              </div>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tip Amount</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(form.getValues('totalAmount'), hotelInfo?.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <div className="h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <CardContent className="pt-6">
                <Elements
                  stripe={stripePromise}
                  options={{
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#c9a84c',
                        colorBackground: '#1a2744',
                        colorText: '#f0ece4',
                        colorDanger: '#ef4444',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <PaymentForm
                    tipData={form.getValues() as TipFormData}
                    onProcessTip={handleSubmit}
                    onSuccess={handlePaymentSuccess}
                    onError={(msg) => setError(msg)}
                  />
                </Elements>
              </CardContent>
            </Card>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              <span>100% goes directly to staff</span>
            </div>
            <Button
              type="button"
              variant="gold-outline"
              className="w-full"
              onClick={() => setStep('amount')}
            >
              Back
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const currentStepNum = STEP_NUMBER[step] ?? 1;

  return (
    <div className="flex flex-1 flex-col p-4 pt-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <StepIndicator currentStep={currentStepNum} totalSteps={3} />

        <AnimatePresence mode="wait">
          <motion.div
            key={step} // Unique key for each step to enable exit animations
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="flex-1" // Ensure motion.div takes up space
          >
            {step === 'stayDetails' && (
              <>
                <HotelHero hotelName={hotelInfo?.hotelName ?? ''} />
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div>
                      <Label htmlFor="roomNumber">Room Number</Label>
                      <Input id="roomNumber" {...form.register('roomNumber')} />
                      {form.formState.errors.roomNumber && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.roomNumber.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="checkInDate">Check-in Date</Label>
                      <Controller
                        control={form.control}
                        name="checkInDate"
                        render={({ field }) => (
                          <DatePicker
                            field={{
                              ...field,
                              value: field.value ? new Date(field.value) : undefined,
                            }}
                            disabled={form.formState.isSubmitting}
                          />
                        )}
                      />
                      {form.formState.errors.checkInDate && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.checkInDate.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="checkOutDate">Check-out Date</Label>
                      <Controller
                        control={form.control}
                        name="checkOutDate"
                        render={({ field }) => (
                          <DatePicker
                            field={{
                              ...field,
                              value: field.value ? new Date(field.value) : undefined,
                            }}
                            disabled={form.formState.isSubmitting}
                          />
                        )}
                      />
                      {form.formState.errors.checkOutDate && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.checkOutDate.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="gold"
                      size="xl"
                      className="w-full"
                      onClick={async () => {
                        const valid = await form.trigger([
                          'roomNumber',
                          'checkInDate',
                          'checkOutDate',
                        ]);
                        if (valid) setStep('amount');
                      }}
                    >
                      Confirm My Stay
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Step 2: Tip Amount */}
            {step === 'amount' && (
              <>
                <div className="text-center">
                  <h2 className="text-xl font-bold tracking-tight">Choose Tip Amount</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Select an amount {tipMethod === 'per_day' ? 'per day' : 'for your stay'}
                  </p>
                </div>

                <div className="flex justify-center">
                  <TogglePill
                    options={[
                      { label: 'Total Stay', value: 'flat' },
                      { label: 'Per Day', value: 'per_day' },
                    ]}
                    value={tipMethod}
                    onChange={(v) => form.setValue('tipMethod', v as 'flat' | 'per_day')}
                  />
                </div>

                {tipMethod === 'per_day' && (
                  <p className="text-sm text-muted-foreground text-center">
                    {numberOfDays} day{numberOfDays !== 1 ? 's' : ''} of stay
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-4">
                  {hotelInfo?.suggestedAmounts.map((amt) => (
                    <AmountSelector
                      key={amt}
                      amount={formatCurrency(amt, hotelInfo.currency)}
                      selected={selectedAmount === amt}
                      onClick={() => handleAmountSelect(amt)}
                    />
                  ))}
                </div>

                <div>
                  <Label htmlFor="customAmount">Custom Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="customAmount"
                      type="number"
                      step="0.01"
                      min="1"
                      className="pl-7"
                      value={selectedAmount ? (selectedAmount / 100).toFixed(2) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setSelectedAmount(null);
                          return;
                        }
                        const cents = Math.round(parseFloat(val) * 100);
                        if (cents > 0) handleAmountSelect(cents);
                      }}
                    />
                  </div>
                </div>

                {tipMethod === 'per_day' && selectedAmount && (
                  <p className="text-center text-lg font-semibold text-primary">
                    Total: {formatCurrency(selectedAmount * numberOfDays, hotelInfo?.currency)}
                  </p>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="gold-outline"
                    className="flex-1"
                    onClick={() => setStep('stayDetails')}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="gold"
                    size="xl"
                    className="flex-1"
                    disabled={!selectedAmount}
                    onClick={() => setStep('payment')}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
