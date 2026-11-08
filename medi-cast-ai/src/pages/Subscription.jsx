import React, { useState } from 'react';
import {
  Crown,
  Check,
  Sparkles,
  Shield,
  Video,
  MessageSquare,
  Radio,
  FileText,
  Smartphone,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Receipt,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/lib/SubscriptionContext';
import { SUBSCRIPTION_TIERS, formatUGX, FAQ_ITEMS, MEDICAST_PAYMENT_CONFIG } from '@/lib/subscriptionPlans';
import { Progress } from '@/components/ui/progress';

export default function Subscription() {
  const {
    plan,
    planId,
    billingInterval,
    usage,
    isProOrHigher,
    upgradePlan,
    openUpgradeModal,
    paymentHistory,
    lastPayment
  } = useSubscription();

  const [interval, setInterval] = useState(billingInterval || 'monthly');

  // Quota values
  const videoUsed = usage.videosAnalyzedThisMonth || 0;
  const videoLimit = isProOrHigher ? 'Unlimited' : (plan.limits.videosPerMonth || 3);
  const videoPercent = isProOrHigher ? 100 : Math.min(100, Math.round((videoUsed / (plan.limits.videosPerMonth || 3)) * 100));

  const aiUsed = usage.aiQueriesToday || 0;
  const aiLimit = isProOrHigher ? 'Unlimited' : (plan.limits.aiQueriesPerDay || 10);
  const aiPercent = isProOrHigher ? 100 : Math.min(100, Math.round((aiUsed / (plan.limits.aiQueriesPerDay || 10)) * 100));

  const freeTier = SUBSCRIPTION_TIERS.free;
  const proTier = SUBSCRIPTION_TIERS.pro;

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 w-full overflow-x-hidden">
      {/* ── Top Page Header (Responsive Wrap & Tight Bounds) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-stone-900 font-heading">
              Surgical Intelligence Membership
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isProOrHigher ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-stone-100 text-stone-700 border border-stone-200'
            }`}>
              <Crown className="w-3.5 h-3.5 text-teal-600" />
              <span>Current: {plan.name}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Intraoperative AI video quotas, real-time hazard alerts & MTN Mobile Money subscription in UGX
          </p>
        </div>

        {/* Billing Cycle Toggle — Grid on Mobile / Inline on Sm+ */}
        <div className="grid grid-cols-2 sm:inline-flex items-center p-1 rounded-2xl bg-stone-200/75 border border-stone-300/60 w-full sm:w-auto shrink-0 shadow-inner">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all text-center ${
              interval === 'monthly'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-300'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Monthly (UGX 85,000)
          </button>
          <button
            type="button"
            onClick={() => setInterval('annual')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 text-center ${
              interval === 'annual'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-300'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Annual (UGX 780k)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-teal-600 text-white text-[9px] font-bold">
              -25%
            </span>
          </button>
        </div>
      </div>

      {/* ── Active Membership & Live Quota Dashboard ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 p-4 sm:p-6 shadow-xs space-y-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Active Plan Status</span>
              {lastPayment && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                  Paid via MTN MoMo
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-stone-900 font-heading mt-0.5">
              {plan.name} — <span className="text-emerald-600 font-semibold text-sm sm:text-base">Active & Ready</span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-stone-500 text-xs">
            <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span>Monthly quotas reset on the 1st</span>
          </div>
        </div>

        {/* Live Usage Progress Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Video Analyses Meter */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-teal-600" />
                Video Analyses
              </span>
              <span className="text-xs font-bold text-stone-900">
                {isProOrHigher ? 'Unlimited' : `${videoUsed} / ${videoLimit}`}
              </span>
            </div>
            <Progress value={videoPercent} className="h-1.5 bg-stone-200" />
            <p className="text-[11px] text-stone-500 leading-tight">
              {isProOrHigher ? 'Unlimited intraoperative reviews' : `${Math.max(0, (plan.limits.videosPerMonth || 3) - videoUsed)} analyses remaining`}
            </p>
          </div>

          {/* AI Assistant Questions Meter */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                AI Assistant
              </span>
              <span className="text-xs font-bold text-stone-900">
                {isProOrHigher ? 'Unlimited' : `${aiUsed} / ${aiLimit}`}
              </span>
            </div>
            <Progress value={aiPercent} className="h-1.5 bg-stone-200" />
            <p className="text-[11px] text-stone-500 leading-tight">
              {isProOrHigher ? 'Continuous surgical reasoning' : `${Math.max(0, (plan.limits.aiQueriesPerDay || 10) - aiUsed)} queries remaining today`}
            </p>
          </div>

          {/* Live PC Surgery Streaming Feature Card */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-rose-600" />
                Live OR Stream
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isProOrHigher ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isProOrHigher ? 'UNLIMITED' : '1 TRIAL'}
              </span>
            </div>
            <p className="text-xs text-stone-700 font-medium">
              {isProOrHigher ? 'Continuous camera / OR scope stream' : 'Preview trial session available'}
            </p>
            <p className="text-[11px] text-stone-500 leading-tight">
              {isProOrHigher ? 'Full hazard alerts & telemetry' : 'Upgrade for continuous streaming'}
            </p>
          </div>

          {/* Clinical Word Export Feature Card */}
          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Word Audit Reports
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isProOrHigher ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
              }`}>
                {isProOrHigher ? 'UNLOCKED' : 'PRO ONLY'}
              </span>
            </div>
            <p className="text-xs text-stone-700 font-medium">
              {isProOrHigher ? 'Post-operative .docx generation' : 'On-screen summary available'}
            </p>
            <p className="text-[11px] text-stone-500 leading-tight">
              {isProOrHigher ? 'Accredited clinical templates' : 'Unlock deep Word export with Pro'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Reduced Tier Cards (Free Resident vs Pro Surgeon) ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-stone-900 font-heading">Choose Your Membership</h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Payments are securely processed in Ugandan Shillings (UGX) via MTN Mobile Money.
          </p>
        </div>

        {/* Grid is 1 column on mobile/tablet and 2 columns ONLY on lg (1024px+) to prevent tight card pinching */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {/* Card 1: Resident Tier (Free) */}
          <div className="rounded-2xl sm:rounded-3xl border border-stone-200 bg-white p-5 sm:p-7 flex flex-col justify-between shadow-2xs overflow-hidden">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 font-heading">{freeTier.name}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">{freeTier.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold uppercase shrink-0">
                  Basic
                </span>
              </div>

              <div className="my-4 sm:my-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-stone-900 font-heading">
                    UGX 0
                  </span>
                  <span className="text-xs text-stone-500 font-medium">/ forever</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">Free forever for resident learning</p>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-stone-100">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Included Features:</p>
                {freeTier.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                    <Check className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 border-t border-stone-100">
              {planId === 'free' ? (
                <Button disabled className="w-full bg-stone-100 text-stone-500 cursor-default font-semibold text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-1.5 text-stone-400" />
                  Current Active Plan
                </Button>
              ) : (
                <Button
                  onClick={() => upgradePlan('free')}
                  variant="outline"
                  className="w-full border-stone-200 text-stone-700 font-semibold text-xs sm:text-sm"
                >
                  Downgrade to Free Resident
                </Button>
              )}
            </div>
          </div>

          {/* Card 2: Pro Surgeon (MediCast AI Surgical Teal & Slate Identity) */}
          <div className="rounded-2xl sm:rounded-3xl border-2 border-teal-600 bg-gradient-to-b from-slate-900 via-teal-950 to-slate-950 text-white p-5 sm:p-7 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div>
              {/* Internal Badge Header (No Negative Margins) */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FFCC00] text-black shrink-0">
                  MTN MoMo
                </span>
                <span className="inline-flex items-center gap-1.5 bg-teal-600/90 text-white text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-teal-400/40 shadow-xs shrink-0">
                  <Sparkles className="w-3 h-3 text-teal-200" />
                  Recommended
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-heading">{proTier.name}</h3>
                <p className="text-xs text-teal-100/80 mt-0.5">{proTier.description}</p>
              </div>

              {/* Price in UGX */}
              <div className="my-4 sm:my-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-teal-300 font-heading">
                    {interval === 'annual' ? formatUGX(proTier.priceAnnualMonthlyUGX) : formatUGX(proTier.priceMonthlyUGX)}
                  </span>
                  <span className="text-xs text-teal-200/80 font-medium">/ month</span>
                </div>
                {interval === 'annual' ? (
                  <p className="text-[11px] text-teal-300 font-medium mt-1">
                    Billed annually ({formatUGX(proTier.priceAnnualMonthlyUGX * 12)} / year) • Save 25%
                  </p>
                ) : (
                  <p className="text-[11px] text-teal-200/70 font-medium mt-1">
                    Billed monthly in UGX via MTN Mobile Money
                  </p>
                )}
              </div>

              {/* Receiver Info Strip */}
              <div className="p-2.5 rounded-xl bg-teal-900/60 border border-teal-500/30 text-[11px] text-teal-100 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span className="truncate">To: <strong>{MEDICAST_PAYMENT_CONFIG.accountName}</strong> c/o {MEDICAST_PAYMENT_CONFIG.recipientName}</span>
                </div>
                <span className="font-mono font-bold text-teal-200 shrink-0">{MEDICAST_PAYMENT_CONFIG.recipientPhone}</span>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-4 border-t border-teal-800/60 text-stone-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-300">Everything Unlocked:</p>
                {proTier.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-stone-100">
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button: Opens MTN MoMo Modal */}
            <div className="mt-6 sm:mt-8 pt-4 border-t border-teal-800/60">
              {planId === 'pro' ? (
                <div className="space-y-2">
                  <Button disabled className="w-full bg-teal-950 text-teal-300 cursor-default font-semibold text-xs sm:text-sm border border-teal-700/60">
                    <CheckCircle2 className="w-4 h-4 mr-1.5 text-teal-400" />
                    Pro Plan Active via MTN MoMo
                  </Button>
                  <Button
                    onClick={() => openUpgradeModal('Renew or Switch MoMo Number')}
                    variant="outline"
                    className="w-full border-teal-700/60 bg-teal-900/40 hover:bg-teal-900 text-teal-200 text-xs h-8"
                  >
                    Change MTN Phone or Renew
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => openUpgradeModal('Subscription Page')}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-md gap-2"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Upgrade with MTN Mobile Money</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Receipts / History ── */}
      {paymentHistory.length > 0 && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 p-4 sm:p-6 shadow-xs space-y-3 overflow-hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-stone-900 font-heading">MTN Mobile Money Payment History</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {paymentHistory.map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 truncate">{rec.provider} • {rec.phone}</p>
                  <p className="text-[11px] text-stone-500 truncate">
                    Paid to {rec.recipient || `${MEDICAST_PAYMENT_CONFIG.accountName} (${MEDICAST_PAYMENT_CONFIG.recipientPhone})`}
                  </p>
                  <p className="text-[11px] text-stone-400 font-mono truncate">Ref: {rec.transactionRef} • {new Date(rec.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-stone-900">{formatUGX(rec.amountUGX)}</span>
                  <span className="block text-[10px] text-emerald-600 font-semibold uppercase">Approved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAQ Section ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 p-5 sm:p-7 shadow-xs space-y-4 overflow-hidden">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-teal-600 shrink-0" />
          <h3 className="text-base sm:text-lg font-bold text-stone-900 font-heading">MTN Mobile Money & Subscription FAQ</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-stone-50/70 border border-stone-100 space-y-1.5 overflow-hidden">
              <h4 className="text-xs sm:text-sm font-bold text-stone-900 leading-snug">{item.q}</h4>
              <p className="text-xs text-stone-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
