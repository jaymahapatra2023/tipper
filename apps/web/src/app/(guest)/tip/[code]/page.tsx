'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TipStatus } from '@tipper/shared';
import type { QrResolveResponse, TipConfirmation } from '@tipper/shared';

const tipFormSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  checkInDate: z.string().min(1, 'Check-in date is required'),
  checkOutDate: z.string().min(1, 'Check-out date is required'),
  tipMethod: z.enum(['per_day', 'flat']),
  amountPerDay: z.number().optional(),
  totalAmount: z.number().min(100, 'Minimum tip is $1.00'),
  message: z.string().max(500).optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().email().optional().or(z.literal('')),
});

type TipFormData = z.infer<typeof tipFormSchema>;

type Step =
  | 'loading'
  | 'error'
  | 'room'
  | 'dates'
  | 'amount'
  | 'message'
  | 'payment'
  | 'confirmation';

export default function TipPage() {
  const params = useParams();
  const code = params.code as string;

  const [step, setStep] = useState<Step>('loading');
  const [error, setError] = useState('');
  const [hotelInfo, setHotelInfo] = useState<QrResolveResponse | null>(null);
  const [confirmation, setConfirmation] = useState<TipConfirmation | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const form = useForm<TipFormData>({
    resolver: zodResolver(tipFormSchema),
    defaultValues: {
      tipMethod: 'flat',
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
        setStep('room');
      } else {
        setError(res.error?.message || 'Invalid QR code');
        setStep('error');
      }
    });
  }, [code, form]);

  const tipMethod = form.watch('tipMethod');
  const checkInDate = form.watch('checkInDate');
  const checkOutDate = form.watch('checkOutDate');

  const numberOfDays =
    checkInDate && checkOutDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
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

  async function handleSubmit(data: TipFormData) {
    if (!hotelInfo) return;

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
      // In production, this would trigger Stripe Payment Element
      // For now, show confirmation
      setConfirmation({
        tipId: res.data.tipId,
        hotelName: hotelInfo.hotelName,
        roomNumber: data.roomNumber,
        amount: data.totalAmount,
        currency: hotelInfo.currency,
        status: TipStatus.PROCESSING,
        createdAt: new Date().toISOString(),
      });
      setStep('confirmation');
    } else {
      setError(res.error?.message || 'Failed to process tip');
    }
  }

  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Invalid QR Code</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please scan a valid QR code from your hotel room.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'confirmation' && confirmation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success text-2xl">
              ✓
            </div>
            <CardTitle>Thank You!</CardTitle>
            <CardDescription>Your tip has been sent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hotel</span>
                <span className="font-medium">{confirmation.hotelName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room</span>
                <span className="font-medium">{confirmation.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-lg">
                  {formatCurrency(confirmation.amount, confirmation.currency)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receiptEmail">Send receipt to (optional)</Label>
              <div className="flex gap-2">
                <Input id="receiptEmail" type="email" placeholder="your@email.com" />
                <Button variant="outline" size="sm">
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{hotelInfo?.hotelName}</CardTitle>
          <CardDescription>Leave a tip for your room&apos;s cleaning staff</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step 1: Room Confirmation */}
            {step === 'room' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="roomNumber">Room Number</Label>
                  <Input id="roomNumber" {...form.register('roomNumber')} />
                  {form.formState.errors.roomNumber && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.roomNumber.message}
                    </p>
                  )}
                </div>
                <Button type="button" className="w-full" onClick={() => setStep('dates')}>
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Stay Dates */}
            {step === 'dates' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="checkInDate">Check-in Date</Label>
                  <Input id="checkInDate" type="date" {...form.register('checkInDate')} />
                </div>
                <div>
                  <Label htmlFor="checkOutDate">Check-out Date</Label>
                  <Input id="checkOutDate" type="date" {...form.register('checkOutDate')} />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep('room')}
                  >
                    Back
                  </Button>
                  <Button type="button" className="flex-1" onClick={() => setStep('amount')}>
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Tip Amount */}
            {step === 'amount' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={tipMethod === 'flat' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => form.setValue('tipMethod', 'flat')}
                  >
                    Flat Amount
                  </Button>
                  <Button
                    type="button"
                    variant={tipMethod === 'per_day' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => form.setValue('tipMethod', 'per_day')}
                  >
                    Per Day
                  </Button>
                </div>

                {tipMethod === 'per_day' && (
                  <p className="text-sm text-muted-foreground text-center">
                    {numberOfDays} day{numberOfDays !== 1 ? 's' : ''} of stay
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {hotelInfo?.suggestedAmounts.map((amount) => (
                    <Button
                      key={amount}
                      type="button"
                      variant={selectedAmount === amount ? 'default' : 'outline'}
                      onClick={() => handleAmountSelect(amount)}
                    >
                      {formatCurrency(amount, hotelInfo.currency)}
                    </Button>
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
                      onChange={(e) => {
                        const cents = Math.round(parseFloat(e.target.value) * 100);
                        if (cents > 0) handleAmountSelect(cents);
                      }}
                    />
                  </div>
                </div>

                {tipMethod === 'per_day' && selectedAmount && (
                  <p className="text-center font-medium">
                    Total: {formatCurrency(selectedAmount * numberOfDays, hotelInfo?.currency)}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep('dates')}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={!selectedAmount}
                    onClick={() => setStep('message')}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Message & Payment */}
            {step === 'message' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="guestName">Your Name (optional)</Label>
                  <Input id="guestName" {...form.register('guestName')} placeholder="John Doe" />
                </div>
                <div>
                  <Label htmlFor="guestEmail">Email for Receipt (optional)</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    {...form.register('guestEmail')}
                    placeholder="you@example.com"
                  />
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

                <div className="rounded-lg bg-muted p-4">
                  <div className="flex justify-between text-sm">
                    <span>Tip Amount</span>
                    <span className="font-medium">
                      {formatCurrency(form.getValues('totalAmount'), hotelInfo?.currency)}
                    </span>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep('amount')}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Processing...' : 'Pay & Tip'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
