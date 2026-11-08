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
    <div className="min-h-screen bg-[#FAF8F5] p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-8 w-full max-w-full overflow-x-hidden">
      {/* ── Top Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-heading">
              Surgical Intelligence Membership & Plans
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isProOrHigher ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-stone-100 text-stone-700 border border-stone-200'
            }`}>
              <Crown className="w-3.5 h-3.5 text-teal-600" />
              <span>Current: {plan.name}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1">
            Intraoperative AI video quotas, real-time hazard alerts & MTN Mobile Money subscription in UGX
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-stone-200/75 border border-stone-300/60 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
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
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              interval === 'annual'
                ? 'bg-white text-stone-900 shadow-sm border border-stone-300'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Annual (UGX 780,000)</span>
            <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
              SAVE 25%
            </span>
          </button>
        </div>
      </div>

      {/* ── Active Membership & Live Quota Dashboard ── */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Active Plan Status</span>
              {lastPayment && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
                  Paid via MTN MoMo
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-stone-900 font-heading mt-0.5">
              {plan.name} — <span className="text-emerald-600 font-semibold text-base">Active & Ready</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              Monthly quotas reset on the 1st of each month
            </span>
          </div>
        </div>

        {/* Live Usage Progress Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Video Analyses Meter */}
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Video className="w-4 h-4 text-teal-600" />
                Video Analyses
              </span>
              <span className="text-xs font-bold text-stone-900">
                {isProOrHigher ? 'Unlimited' : `${videoUsed} / ${videoLimit}`}
              </span>
            </div>
            <Progress value={videoPercent} className="h-2 bg-stone-200" />
            <p className="text-[11px] text-stone-500">
              {isProOrHigher ? 'Unlimited intraoperative surgical reviews' : `${Math.max(0, (plan.limits.videosPerMonth || 3) - videoUsed)} analyses remaining this month`}
            </p>
          </div>

          {/* AI Assistant Questions Meter */}
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                AI Assistant
              </span>
              <span className="text-xs font-bold text-stone-900">
                {isProOrHigher ? 'Unlimited' : `${aiUsed} / ${aiLimit}`}
              </span>
            </div>
            <Progress value={aiPercent} className="h-2 bg-stone-200" />
            <p className="text-[11px] text-stone-500">
              {isProOrHigher ? 'Continuous surgical queries & risk reasoning' : `${Math.max(0, (plan.limits.aiQueriesPerDay || 10) - aiUsed)} queries remaining today`}
            </p>
          </div>

          {/* Live PC Surgery Streaming Feature Card */}
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-rose-600" />
                Live OR Stream
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isProOrHigher ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isProOrHigher ? 'UNLIMITED' : '1 TRIAL'}
              </span>
            </div>
            <p className="text-xs text-stone-700 font-medium">
              {isProOrHigher ? 'Continuous PC camera / laparoscope stream' : 'Preview trial session available'}
            </p>
            <p className="text-[11px] text-stone-500">
              {isProOrHigher ? 'Full hazard alerts & real-time telemetry' : 'Upgrade for continuous intraoperative streaming'}
            </p>
          </div>

          {/* Clinical Word Export Feature Card */}
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Word Audit Reports
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isProOrHigher ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
              }`}>
                {isProOrHigher ? 'UNLOCKED' : 'PRO ONLY'}
              </span>
            </div>
            <p className="text-xs text-stone-700 font-medium">
              {isProOrHigher ? 'Formal post-operative .docx generation' : 'Standard on-screen summary available'}
            </p>
            <p className="text-[11px] text-stone-500">
              {isProOrHigher ? 'Accredited institutional report templates' : 'Unlock deep Word downloads with Pro'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Reduced Tier Cards (Free Resident vs Pro Surgeon) ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-heading">Choose Your Membership</h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Payments are securely processed in Ugandan Shillings (UGX) via MTN Mobile Money.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Resident Tier (Free) */}
          <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-stone-900 font-heading">{freeTier.name}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">{freeTier.description}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold uppercase">
                  Basic
                </span>
              </div>

              <div className="my-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-heading">
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
                    <Check className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-stone-100">
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
          <div className="rounded-3xl border-2 border-teal-600 bg-gradient-to-b from-slate-900 via-teal-950 to-slate-950 text-white p-6 sm:p-7 flex flex-col justify-between shadow-xl relative">
            <div className="absolute -top-3.5 right-6 bg-teal-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5 border border-teal-400/40">
              <Sparkles className="w-3.5 h-3.5 text-teal-200" />
              <span>Recommended for Surgeons</span>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-heading">{proTier.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#FFCC00] text-black">
                      MTN MoMo
                    </span>
                  </div>
                  <p className="text-xs text-teal-100/80 mt-0.5">{proTier.description}</p>
                </div>
              </div>

              {/* Price in UGX */}
              <div className="my-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-teal-300 font-heading">
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
              <div className="p-2.5 rounded-xl bg-teal-900/60 border border-teal-500/30 text-[11px] text-teal-100 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  <span>To: <strong>{MEDICAST_PAYMENT_CONFIG.accountName}</strong> c/o {MEDICAST_PAYMENT_CONFIG.recipientName}</span>
                </div>
                <span className="font-mono font-bold text-teal-200">{MEDICAST_PAYMENT_CONFIG.recipientPhone}</span>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-2.5 pt-4 border-t border-teal-800/60 text-stone-200">
                <p className="text-[11px] font-bold uppercase tracking-wider text-teal-300">Everything Unlocked:</p>
                {proTier.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-stone-100">
                    <Check className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button: Opens MTN MoMo Modal */}
            <div className="mt-8 pt-4 border-t border-teal-800/60">
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
        <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold text-stone-900 font-heading">MTN Mobile Money Payment History</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {paymentHistory.map((rec) => (
              <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-stone-900">{rec.provider} • {rec.phone}</p>
                  <p className="text-[11px] text-stone-500">
                    Paid to {rec.recipient || `${MEDICAST_PAYMENT_CONFIG.accountName} (${MEDICAST_PAYMENT_CONFIG.recipientPhone})`}
                  </p>
                  <p className="text-[11px] text-stone-400 font-mono">Ref: {rec.transactionRef} • {new Date(rec.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-stone-900">{formatUGX(rec.amountUGX)}</span>
                  <span className="block text-[10px] text-emerald-600 font-semibold uppercase">Approved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FAQ Section ── */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-stone-900 font-heading">MTN Mobile Money & Subscription FAQ</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-stone-50/70 border border-stone-100 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-stone-900">{item.q}</h4>
              <p className="text-xs text-stone-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
