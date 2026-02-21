'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StepIndicator } from '@/components/ui/step-indicator';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { HotelProfileStep } from './steps/hotel-profile-step';
import { RoomSetupStep } from './steps/room-setup-step';
import { StaffInviteStep } from './steps/staff-invite-step';
import { StripeConnectStep } from './steps/stripe-connect-step';
import { QrCodeStep } from './steps/qr-code-step';

interface OnboardingStatus {
  step: number;
  hotelProfile: boolean;
  roomsAdded: number;
  staffAdded: number;
  stripeConnected: boolean;
  qrGenerated: number;
}

const STEP_LABELS = ['Hotel Profile', 'Rooms', 'Staff', 'Stripe', 'QR Codes'];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<OnboardingStatus>('/admin/onboarding/status').then((res) => {
      if (res.success && res.data) {
        setStatus(res.data);
        setCurrentStep(res.data.step);
      }
      setLoading(false);
    });
  }, []);

  // Handle Stripe return
  useEffect(() => {
    if (searchParams.get('stripe') === 'complete' && currentStep === 3) {
      // Stripe return - the step component will handle checking status
    }
  }, [searchParams, currentStep]);

  async function advanceStep() {
    const nextStep = currentStep + 1;
    if (nextStep >= 5) {
      // Completed all steps
      await api.put('/admin/onboarding/step', { step: 5 });
      router.push('/admin-dashboard');
      return;
    }
    await api.put('/admin/onboarding/step', { step: nextStep });
    setCurrentStep(nextStep);
    setStatus((prev) => (prev ? { ...prev, step: nextStep } : prev));
  }

  async function skipStep() {
    await advanceStep();
  }

  if (loading) return <LoadingSpinner message="Loading setup wizard..." />;

  if (currentStep >= 5) {
    router.push('/admin-dashboard');
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Set Up Your Hotel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete these steps to start accepting tips
        </p>
      </div>

      <StepIndicator currentStep={currentStep} totalSteps={5} labels={STEP_LABELS} />

      <Card>
        <CardHeader>
          <CardTitle>{STEP_LABELS[currentStep]}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 0 && <HotelProfileStep onComplete={advanceStep} />}
          {currentStep === 1 && <RoomSetupStep onComplete={advanceStep} onSkip={skipStep} />}
          {currentStep === 2 && <StaffInviteStep onComplete={advanceStep} onSkip={skipStep} />}
          {currentStep === 3 && (
            <StripeConnectStep
              onComplete={advanceStep}
              onSkip={skipStep}
              stripeReturn={searchParams.get('stripe')}
            />
          )}
          {currentStep === 4 && <QrCodeStep onComplete={advanceStep} />}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button variant="ghost" onClick={() => router.push('/admin-dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function AdminOnboardingPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading setup wizard..." />}>
      <OnboardingContent />
    </Suspense>
  );
}
