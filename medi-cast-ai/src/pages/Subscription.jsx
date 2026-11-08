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
  Zap,
  ArrowRight,
  HelpCircle,
  RefreshCw,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/lib/SubscriptionContext';
import { SUBSCRIPTION_TIERS, FAQ_ITEMS } from '@/lib/subscriptionPlans';
import { Progress } from '@/components/ui/progress';

export default function Subscription() {
  const {
    plan,
    planId,
    billingInterval,
    usage,
    isPro,
    isEnterprise,
    isProOrHigher,
    isFree,
    upgradePlan
  } = useSubscription();

  const [interval, setInterval] = useState(billingInterval || 'monthly');
  const [activatingPlan, setActivatingPlan] = useState(null);

  const handlePlanSelect = (targetPlanId) => {
    if (targetPlanId === planId && interval === billingInterval) return;
    setActivatingPlan(targetPlanId);
    setTimeout(() => {
      upgradePlan(targetPlanId, interval);
      setActivatingPlan(null);
    }, 450);
  };

  // Quota values
  const videoUsed = usage.videosAnalyzedThisMonth || 0;
  const videoLimit = isProOrHigher ? 'Unlimited' : (plan.limits.videosPerMonth || 3);
  const videoPercent = isProOrHigher ? 100 : Math.min(100, Math.round((videoUsed / (plan.limits.videosPerMonth || 3)) * 100));

  const aiUsed = usage.aiQueriesToday || 0;
  const aiLimit = isProOrHigher ? 'Unlimited' : (plan.limits.aiQueriesPerDay || 10);
  const aiPercent = isProOrHigher ? 100 : Math.min(100, Math.round((aiUsed / (plan.limits.aiQueriesPerDay || 10)) * 100));

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
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
            Intraoperative video AI quota governance, real-time hazard detection access, and team subscriptions
          </p>
        </div>

        {/* Billing Cycle Toggle */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-stone-200/75 border border-stone-300/60 self-start md:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              interval === 'monthly'
                ? 'bg-white text-teal-900 shadow-sm border border-teal-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setInterval('annual')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
              interval === 'annual'
                ? 'bg-white text-teal-900 shadow-sm border border-teal-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* ── Active Membership & Live Quota Dashboard ── */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Active Subscription Status</span>
            <h2 className="text-xl font-bold text-stone-900 font-heading mt-0.5">
              {plan.name} — <span className="text-emerald-600 font-semibold text-base">Active & Operational</span>
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
              {isProOrHigher
                ? `${videoUsed} surgical videos analyzed this month`
                : `${Math.max(0, (plan.limits.videosPerMonth || 3) - videoUsed)} analyses remaining this month`}
            </p>
          </div>

          {/* AI Assistant Queries Meter */}
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                AI Assistant Queries
              </span>
              <span className="text-xs font-bold text-stone-900">
                {isProOrHigher ? 'Unlimited' : `${aiUsed} / ${aiLimit}`}
              </span>
            </div>
            <Progress value={aiPercent} className="h-2 bg-stone-200" />
            <p className="text-[11px] text-stone-500">
              {isProOrHigher
                ? `${aiUsed} queries sent today`
                : `${Math.max(0, (plan.limits.aiQueriesPerDay || 10) - aiUsed)} queries remaining today`}
            </p>
          </div>

          {/* Live PC / OR Camera Stream Access */}
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-red-500" />
                Live Camera Stream
              </span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                isProOrHigher ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isProOrHigher ? 'UNLIMITED OR' : 'PREVIEW TRIAL'}
              </span>
            </div>
            <p className="text-xs text-stone-700 font-medium">
              {isProOrHigher ? 'Full continuous streaming & hazard alerts' : '1 session trial for testing PC camera'}
            </p>
            <p className="text-[11px] text-stone-500">
              {isProOrHigher ? 'Active across all surgical procedures' : 'Upgrade for continuous intraoperative watch'}
            </p>
          </div>

          {/* Clinical Word Reports (.docx) */}
          <div className="p-4 rounded-2xl bg-stone-50/70 border border-stone-200/80 space-y-2.5">
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

      {/* ── Pricing & Tier Comparison Cards ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900 font-heading">Available Surgical Intelligence Tiers</h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Switch plans with one click — all upgrades are active immediately in your current session
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.values(SUBSCRIPTION_TIERS).map((tier) => {
            const isCurrent = planId === tier.id;
            const price = interval === 'annual' ? tier.priceAnnualMonthly : tier.priceMonthly;

            return (
              <div
                key={tier.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all bg-white relative ${
                  tier.highlight
                    ? 'border-2 border-teal-500 shadow-md ring-1 ring-teal-500/20'
                    : 'border-stone-200 shadow-xs hover:border-stone-300'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 right-6 bg-teal-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Recommended for Surgeons
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 font-heading">{tier.name}</h3>
                      <p className="text-xs text-stone-500 mt-0.5">{tier.description}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="my-5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 font-heading">
                        ${price}
                      </span>
                      <span className="text-xs text-stone-500 font-medium">/ month</span>
                    </div>
                    {tier.priceMonthly > 0 && interval === 'annual' && (
                      <p className="text-[11px] text-teal-700 font-medium mt-1">
                        Billed annually (${tier.priceAnnualMonthly * 12} / year) • Save 20%
                      </p>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 pt-4 border-t border-stone-100">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Included Capabilities:</p>
                    {tier.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                        <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Action Button */}
                <div className="mt-8 pt-4 border-t border-stone-100">
                  {isCurrent ? (
                    <Button
                      disabled
                      className="w-full bg-stone-100 text-stone-600 border border-stone-200 cursor-default font-semibold text-xs sm:text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5 text-teal-600" />
                      Active Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePlanSelect(tier.id)}
                      disabled={activatingPlan === tier.id}
                      className={`w-full font-semibold shadow-sm text-xs sm:text-sm gap-1.5 ${
                        tier.highlight
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : tier.id === 'free'
                            ? 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {activatingPlan === tier.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                          <span>Activating...</span>
                        </>
                      ) : (
                        <>
                          <span>{tier.id === 'free' ? 'Switch to Free Resident' : tier.ctaText}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FAQ Section ── */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-teal-600" />
          <h3 className="text-lg font-bold text-stone-900 font-heading">Frequently Asked Questions</h3>
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
