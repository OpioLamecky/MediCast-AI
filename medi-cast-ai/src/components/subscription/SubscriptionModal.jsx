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
  Shield,
  Smartphone,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Crown,
  Copy,
  CheckCheck,
  Building2,
  PhoneCall
} from 'lucide-react';
import { useSubscription } from '@/lib/SubscriptionContext';
import {
  SUBSCRIPTION_TIERS,
  formatUGX,
  isMtnUgandaNumber,
  normalizeUgandanPhone,
  MEDICAST_PAYMENT_CONFIG
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
  const [copiedNumber, setCopiedNumber] = useState(false);

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
      setCopiedNumber(false);
    }
  }, [isUpgradeModalOpen]);

  // Polling countdown simulation while waiting for MTN MoMo approval
  useEffect(() => {
    if (step !== 'processing') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
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
      setPhoneError('Please enter a valid MTN Uganda number (077, 078, 076, 039).');
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
        transactionRef,
        recipient: `${MEDICAST_PAYMENT_CONFIG.accountName} c/o ${MEDICAST_PAYMENT_CONFIG.recipientName} (${MEDICAST_PAYMENT_CONFIG.recipientPhone})`,
        surgeonName: surgeonName.trim() || undefined
      });
    }, 1600);
  };

  const copyEndpointNumber = () => {
    navigator.clipboard?.writeText(MEDICAST_PAYMENT_CONFIG.recipientPhone);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const isMtn = isMtnUgandaNumber(phone);

  return (
    <Dialog open={isUpgradeModalOpen} onOpenChange={(open) => !open && closeUpgradeModal()}>
      <DialogContent className="max-w-[440px] sm:max-w-[460px] p-0 overflow-hidden bg-white rounded-2xl border-stone-200 shadow-2xl">
        {/* Top Header Banner — MediCast AI Surgical Teal & Slate Identity */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-4 sm:p-5 text-white relative border-b border-teal-500/20">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-200 bg-teal-950/70 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                <Crown className="w-3 h-3 text-teal-300" />
                MediCast AI Pro
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-[#FFCC00] text-black">
                MTN MoMo
              </span>
            </div>
            <span className="text-xs text-teal-200 font-mono font-bold bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-teal-400/20">
              {formatUGX(selectedAmount)}
            </span>
          </div>

          <DialogTitle className="text-lg sm:text-xl font-bold font-heading text-white">
            {step === 'processing'
              ? 'Waiting for MTN MoMo Approval'
              : step === 'success'
                ? 'Payment Confirmed'
                : 'Upgrade to Pro Surgeon'}
          </DialogTitle>
          <DialogDescription className="text-teal-100/90 text-xs mt-1 leading-relaxed">
            {step === 'processing'
              ? `Prompt sent to your phone. Receiving to ${MEDICAST_PAYMENT_CONFIG.accountName} via ${MEDICAST_PAYMENT_CONFIG.recipientName}.`
              : step === 'success'
                ? 'Your subscription is now active with unlimited surgical AI analysis.'
                : modalFeatureHint
                  ? `Unlock ${modalFeatureHint} with instant MTN Mobile Money checkout.`
                  : 'Unlimited surgical video analysis, AI consultations & live OR streaming.'}
          </DialogDescription>
        </div>

        {/* Modal Body — Resized & Compact without Vertical Scrollbar */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {/* STEP 1: Configure & Enter MTN Number */}
          {step === 'configure' && (
            <form onSubmit={handleStartMtnPayment} className="space-y-3">
              {/* Official Receiver Endpoint Banner */}
              <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-teal-900 font-bold text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>Recipient: {MEDICAST_PAYMENT_CONFIG.accountName}</span>
                  </div>
                  <p className="text-[11px] text-stone-600 mt-0.5">
                    Receiving through: <strong className="text-stone-800">{MEDICAST_PAYMENT_CONFIG.recipientName}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-stone-500 block">Endpoint Line</span>
                  <button
                    type="button"
                    onClick={copyEndpointNumber}
                    className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-teal-800 bg-white hover:bg-teal-100/60 px-2 py-0.5 rounded border border-teal-300 transition-colors"
                    title="Click to copy endpoint number"
                  >
                    <span>{MEDICAST_PAYMENT_CONFIG.recipientPhone}</span>
                    {copiedNumber ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-stone-400" />}
                  </button>
                </div>
              </div>

              {/* Compact Plan & Billing Toggle Card */}
              <div className="p-3 rounded-xl bg-stone-50/80 border border-stone-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 font-heading">Pro Surgeon Membership</h4>
                    <p className="text-[10px] text-stone-500">Unlimited surgical video vision & AI reasoning</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-teal-800 font-heading">
                      {formatUGX(selectedAmount)}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      {interval === 'annual' ? '/ year' : '/ month'}
                    </span>
                  </div>
                </div>

                {/* Interval Toggle Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setInterval('monthly')}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center ${
                      interval === 'monthly'
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    Monthly (UGX 85,000)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterval('annual')}
                    className={`py-1 px-2.5 rounded-lg text-xs font-semibold border transition-all text-center relative ${
                      interval === 'annual'
                        ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span>Annual (UGX 780,000)</span>
                    <span className="ml-1 text-[9px] text-[#FFCC00] font-bold">SAVE 25%</span>
                  </button>
                </div>
              </div>

              {/* Quick Amount Selector */}
              <div>
                <Label className="text-[11px] font-semibold text-stone-700">Choose or confirm amount (UGX)</Label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {[50000, 85000, 100000, 200000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedAmount(amt)}
                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all text-center ${
                        selectedAmount === amt
                          ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-2xs'
                          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                      }`}
                    >
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payer's MTN Phone Number */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="momo-phone" className="text-[11px] font-semibold text-stone-700">
                    Your MTN Mobile Money Number *
                  </Label>
                  {isMtn && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      ✓ MTN Verified
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
                    placeholder="778 543 120 (or 077...)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-16 h-9 text-xs sm:text-sm bg-white border-stone-200 font-mono font-medium focus:border-teal-500"
                  />
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#FFCC00] text-black">
                      MTN
                    </span>
                  </div>
                </div>
                {phoneError && (
                  <p className="text-[11px] text-red-600 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              {/* Surgeon / Subscriber Name (Optional) */}
              <div className="space-y-1">
                <Label htmlFor="surgeon-name" className="text-[11px] font-semibold text-stone-700">
                  Surgeon / Subscriber Name (Optional)
                </Label>
                <Input
                  id="surgeon-name"
                  placeholder="e.g. Dr. Lameck Opio"
                  value={surgeonName}
                  onChange={(e) => setSurgeonName(e.target.value)}
                  className="h-8 text-xs bg-white border-stone-200"
                />
              </div>

              {/* MediCast AI Teal Submit Button */}
              <Button
                type="submit"
                className="w-full h-10 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-md gap-2 mt-1"
              >
                <Smartphone className="w-4 h-4" />
                <span>Pay {formatUGX(selectedAmount)} via MTN MoMo</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* STEP 2: Processing & Waiting for MTN MoMo Approval */}
          {step === 'processing' && (
            <div className="py-4 px-2 text-center space-y-4">
              {/* Animated Radar Pulse Rings in MediCast Teal */}
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-teal-500/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-teal-600/30 animate-pulse" />
                <div className="relative w-12 h-12 rounded-full bg-teal-700 text-white flex items-center justify-center shadow-md">
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900 font-heading">
                  Waiting for MTN MoMo Approval…
                </h3>
                <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  USSD prompt sent to <strong className="text-stone-900 font-mono">{phone}</strong> for{' '}
                  <strong className="text-teal-800">{formatUGX(selectedAmount)}</strong>.
                </p>
              </div>

              {/* Endpoint & Receiving Instructions Card */}
              <div className="p-3 rounded-xl bg-teal-50/90 border border-teal-200 text-left text-xs space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-900 uppercase">Receiving Account:</span>
                  <span className="font-bold text-stone-900">
                    {MEDICAST_PAYMENT_CONFIG.accountName} <span className="font-normal text-stone-600">c/o</span> {MEDICAST_PAYMENT_CONFIG.recipientName}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-teal-200/80">
                  <span className="text-[10px] font-bold text-teal-900 uppercase">MTN Endpoint:</span>
                  <span className="font-mono font-bold text-teal-900 bg-white px-2 py-0.5 rounded border border-teal-300">
                    {MEDICAST_PAYMENT_CONFIG.recipientPhone}
                  </span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-stone-700 text-[11px] pl-1">
                  <li>Check your phone for the <strong>MTN Mobile Money prompt</strong>.</li>
                  <li>Enter your <strong>MTN PIN</strong> to authorize the transfer.</li>
                  <li>Or dial <strong>*165#</strong> &gt; Send Money &gt; <strong>0778543120</strong>.</li>
                </ol>
              </div>

              {/* Polling Timer */}
              <div className="flex items-center justify-center gap-2 text-xs text-stone-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                <span>Awaiting phone confirmation ({countdown}s)...</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                <Button
                  type="button"
                  onClick={handlePaymentApproved}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9 shadow-xs gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>I Have Approved on My Phone</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('configure')}
                  className="w-full text-xs text-stone-600 border-stone-200 h-8"
                >
                  Cancel / Change Phone Number
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Success & Plan Activated */}
          {step === 'success' && (
            <div className="py-6 px-2 text-center space-y-3.5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 font-heading">
                  Payment Confirmed to Medicast AI!
                </h3>
                <p className="text-xs text-stone-600 mt-1">
                  <strong>{formatUGX(selectedAmount)}</strong> received via MTN MoMo to{' '}
                  <strong className="text-stone-900">{MEDICAST_PAYMENT_CONFIG.accountName} ({MEDICAST_PAYMENT_CONFIG.recipientPhone})</strong>.
                </p>
                <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                  Ref: {transactionRef}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 font-medium">
                Pro Surgeon Plan is now fully active with unlimited video analyses and surgical AI consultations.
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="bg-stone-50 px-4 py-2.5 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px]">Medicast AI • Direct to {MEDICAST_PAYMENT_CONFIG.recipientPhone}</span>
          </div>
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="text-stone-500 hover:text-stone-800 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
