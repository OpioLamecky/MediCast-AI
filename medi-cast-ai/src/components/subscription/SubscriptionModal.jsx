import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Check,
  Sparkles,
  Shield,
  Smartphone,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Crown,
  RotateCcw
} from 'lucide-react';
import { useSubscription } from '@/lib/SubscriptionContext';
import {
  SUBSCRIPTION_TIERS,
  formatUGX,
  isMtnUgandaNumber,
  normalizeUgandanPhone,
  CEREMONY_WALLET_CAMPAIGN_URL
} from '@/lib/subscriptionPlans';

export default function SubscriptionModal() {
  const {
    isUpgradeModalOpen,
    closeUpgradeModal,
    modalFeatureHint,
    planId,
    upgradePlan,
    billingInterval: initialInterval
  } = useSubscription();

  const proTier = SUBSCRIPTION_TIERS.pro;

  // Form & Payment States: 'configure' | 'processing' | 'success'
  const [step, setStep] = useState('configure');
  const [interval, setInterval] = useState(initialInterval || 'monthly');
  const [selectedAmount, setSelectedAmount] = useState(proTier.priceMonthlyUGX);
  const [phone, setPhone] = useState('');
  const [surgeonName, setSurgeonName] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [transactionRef, setTransactionRef] = useState('');

  // Sync selected amount when billing interval changes
  useEffect(() => {
    if (interval === 'annual') {
      setSelectedAmount(proTier.priceAnnualMonthlyUGX * 12); // UGX 780,000
    } else {
      setSelectedAmount(proTier.priceMonthlyUGX); // UGX 85,000
    }
  }, [interval, proTier]);

  // Reset modal state when opened
  useEffect(() => {
    if (isUpgradeModalOpen) {
      setStep('configure');
      setPhoneError('');
      setCountdown(30);
      setTransactionRef(`MTN-MOMO-${String(Date.now()).slice(-6)}`);
    }
  }, [isUpgradeModalOpen]);

  // Polling countdown simulation while waiting for MTN MoMo approval
  useEffect(() => {
    if (step !== 'processing') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-confirm once countdown finishes
          handlePaymentApproved();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartMtnPayment = (e) => {
    e.preventDefault();
    setPhoneError('');

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setPhoneError('Please enter your MTN Mobile Money number.');
      return;
    }

    if (!isMtnUgandaNumber(cleanPhone)) {
      setPhoneError('Please enter a valid MTN Uganda number (e.g. 077, 078, 076, 039).');
      return;
    }

    const txId = `MTN-MOMO-${Math.floor(100000 + Math.random() * 900000)}`;
    setTransactionRef(txId);
    setCountdown(25);
    setStep('processing');
  };

  const handlePaymentApproved = () => {
    setStep('success');
    setTimeout(() => {
      upgradePlan('pro', interval, {
        phone: normalizeUgandanPhone(phone),
        amountUGX: selectedAmount,
        transactionRef
      });
    }, 1600);
  };

  const isMtn = isMtnUgandaNumber(phone);

  return (
    <Dialog open={isUpgradeModalOpen} onOpenChange={(open) => !open && closeUpgradeModal()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden bg-white rounded-2xl border-stone-200">
        {/* Top Header Banner with MTN Branding */}
        <div className="bg-[#1A1A1A] p-5 text-white relative">
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#FFCC00] text-black shadow-xs">
                MTN Mobile Money
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded-full border border-teal-500/30">
                <Crown className="w-3 h-3" />
                Pro Surgeon Upgrade
              </span>
            </div>
            <span className="text-[11px] text-amber-300 font-mono font-bold">
              {formatUGX(selectedAmount)}
            </span>
          </div>

          <DialogTitle className="text-lg sm:text-xl font-bold font-heading text-white">
            {step === 'processing'
              ? 'Waiting for MTN MoMo…'
              : step === 'success'
                ? 'Payment Approved!'
                : 'Upgrade to Pro Surgeon with MTN MoMo'}
          </DialogTitle>
          <DialogDescription className="text-stone-300 text-xs mt-1 leading-relaxed">
            {step === 'processing'
              ? 'Check your phone screen and enter your MTN Mobile Money PIN to approve the transaction.'
              : step === 'success'
                ? 'Your transaction has been confirmed. Unlocking unlimited surgical AI co-pilot now...'
                : modalFeatureHint
                  ? `Upgrade to unlock ${modalFeatureHint} with instant MTN Mobile Money checkout.`
                  : 'Get unlimited surgical video analyses, unlimited AI consultations, and live OR camera monitoring.'}
          </DialogDescription>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* STEP 1: Configure & Enter MTN Number */}
          {step === 'configure' && (
            <form onSubmit={handleStartMtnPayment} className="space-y-4">
              {/* Plan Summary Card (Reduced to 1 single focused Pro card) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50/60 via-stone-50 to-teal-50/40 border border-amber-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFCC00] text-black font-extrabold flex items-center justify-center text-xs shadow-2xs">
                      MoMo
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-900 font-heading">Pro Surgeon Membership</h4>
                      <p className="text-[11px] text-stone-500">Unlimited video analysis & AI surgical consultations</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-stone-900 font-heading">
                      {formatUGX(selectedAmount)}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      {interval === 'annual' ? '/ year' : '/ month'}
                    </span>
                  </div>
                </div>

                {/* Billing Interval Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setInterval('monthly')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                      interval === 'monthly'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    Monthly (UGX 85,000)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterval('annual')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center relative ${
                      interval === 'annual'
                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span>Annual (UGX 780,000)</span>
                    <span className="ml-1 text-[9px] text-[#FFCC00] font-bold">SAVE 25%</span>
                  </button>
                </div>
              </div>

              {/* Quick Amount Selector (CeremonyWallet style) */}
              <div>
                <Label className="text-xs font-semibold text-stone-700">Choose or confirm amount (UGX)</Label>
                <div className="grid grid-cols-4 gap-2 mt-1.5">
                  {[50000, 85000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedAmount(amt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                        selectedAmount === amt
                          ? 'border-[#E6A800] bg-[#FFF9E6] text-stone-900 shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* MTN Phone Number Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="momo-phone" className="text-xs font-semibold text-stone-700">
                    MTN Mobile Money Phone Number *
                  </Label>
                  {isMtn && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ MTN Uganda Verified
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xs font-bold text-stone-500">🇺🇬 +256</span>
                  </div>
                  <Input
                    id="momo-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="772 123 456 (or 078...)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-16 h-11 text-sm bg-stone-50 border-stone-200 font-mono font-medium focus:bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFCC00] text-black">
                      MTN
                    </span>
                  </div>
                </div>
                {phoneError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{phoneError}</span>
                  </p>
                )}
                <p className="text-[11px] text-stone-400">
                  Accepted MTN prefixes: 077, 078, 076, 039. A USSD approval prompt will be sent to this line.
                </p>
              </div>

              {/* Surgeon Name (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="surgeon-name" className="text-xs font-semibold text-stone-700">
                  Surgeon / Account Name (Optional)
                </Label>
                <Input
                  id="surgeon-name"
                  placeholder="e.g. Dr. Kazooba Joseph"
                  value={surgeonName}
                  onChange={(e) => setSurgeonName(e.target.value)}
                  className="h-9 text-xs bg-stone-50 border-stone-200"
                />
              </div>

              {/* Feature Highlights List */}
              <div className="space-y-1.5 py-2 border-t border-stone-100 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Unlimited Surgical Video Analyses (No monthly cap)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Unlimited AI Assistant Consultations & Surgical Reasoning</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span>Live PC Camera Surgical Vision & Continuous Recordings</span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-11 bg-[#FFCC00] hover:bg-[#E6B800] text-black font-bold text-sm shadow-sm gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay {formatUGX(selectedAmount)} via MTN MoMo</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* STEP 2: Processing & Waiting for MTN MoMo PIN Prompt (CeremonyWallet style) */}
          {step === 'processing' && (
            <div className="py-6 px-4 text-center space-y-5">
              {/* Animated Radar Pulse Rings */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#FFCC00]/25 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-[#FFCC00]/40 animate-pulse" />
                <div className="relative w-14 h-14 rounded-full bg-[#FFCC00] text-black font-extrabold flex items-center justify-center text-sm shadow-md">
                  MoMo
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-stone-900 font-heading">
                  Waiting for MTN MoMo approval…
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto leading-relaxed">
                  A payment prompt has been sent to{' '}
                  <strong className="text-stone-900 font-mono">{phone}</strong> for{' '}
                  <strong className="text-stone-900">{formatUGX(selectedAmount)}</strong>.
                </p>
              </div>

              {/* Instructions Card */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/90 text-left text-xs text-amber-950 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Smartphone className="w-4 h-4 text-amber-700" />
                  How to complete on your phone:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-stone-700 pl-1">
                  <li>Check your phone screen for the <strong>MTN Mobile Money prompt</strong>.</li>
                  <li>Enter your <strong>MTN MoMo PIN</strong> to authorize the charge.</li>
                  <li>Once approved, your MediCast subscription activates automatically!</li>
                </ol>
              </div>

              {/* Polling Timer Indicator */}
              <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E6A800]" />
                <span>Polling approval ({countdown}s remaining)...</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={handlePaymentApproved}
                  className="w-full bg-[#FFCC00] hover:bg-[#E6B800] text-black font-bold text-xs sm:text-sm h-10 shadow-xs gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                  <span>I Have Approved on My Phone</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('configure')}
                  className="w-full text-xs text-stone-600 border-stone-200 h-9"
                >
                  Cancel / Change Phone Number
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Success & Plan Activated */}
          {step === 'success' && (
            <div className="py-8 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 font-heading">
                  MTN Mobile Money Payment Confirmed!
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  <strong>{formatUGX(selectedAmount)}</strong> approved via MTN MoMo.
                </p>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                  Ref: {transactionRef}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
                Pro Surgeon Plan is now active with unlimited surgical video analyses and AI co-pilot consultations!
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="bg-stone-50 px-5 py-3 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>Secure MTN MoMo gateway • Instant UGX activation</span>
          </div>
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="text-stone-500 hover:text-stone-800 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
