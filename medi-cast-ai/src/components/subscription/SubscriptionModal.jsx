import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, Shield, Zap, Lock, Crown, ArrowRight } from 'lucide-react';
import { useSubscription } from '@/lib/SubscriptionContext';
import { SUBSCRIPTION_TIERS } from '@/lib/subscriptionPlans';

export default function SubscriptionModal() {
  const {
    isUpgradeModalOpen,
    closeUpgradeModal,
    modalFeatureHint,
    planId,
    upgradePlan,
    billingInterval: currentInterval
  } = useSubscription();

  const [interval, setInterval] = useState(currentInterval || 'monthly');
  const [activatingPlan, setActivatingPlan] = useState(null);

  const handleActivate = (targetPlanId) => {
    setActivatingPlan(targetPlanId);
    setTimeout(() => {
      upgradePlan(targetPlanId, interval);
      setActivatingPlan(null);
    }, 400);
  };

  const proTier = SUBSCRIPTION_TIERS.pro;
  const enterpriseTier = SUBSCRIPTION_TIERS.enterprise;

  return (
    <Dialog open={isUpgradeModalOpen} onOpenChange={(open) => !open && closeUpgradeModal()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl p-0 overflow-hidden bg-white rounded-2xl border-stone-200">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 p-6 text-white relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-teal-400/20 text-teal-300 border border-teal-400/30">
              <Crown className="w-3 h-3" />
              Surgical Intelligence Membership
            </span>
            {modalFeatureHint && (
              <span className="text-xs text-amber-300 font-medium bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                Triggered by: {modalFeatureHint}
              </span>
            )}
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold font-heading text-white">
            Unlock Full Intraoperative AI & Unlimited Video Analyses
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Empower your operating room with real-time hazard detection, unlimited AI surgical consultations, and accredited clinical audits.
          </DialogDescription>

          {/* Billing Interval Switcher */}
          <div className="mt-4 inline-flex items-center p-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15">
            <button
              type="button"
              onClick={() => setInterval('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                interval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setInterval('annual')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                interval === 'annual'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-bold">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {/* Pro Surgeon Card */}
          <div className="rounded-2xl border-2 border-teal-500 bg-gradient-to-b from-teal-50/50 via-white to-white p-5 flex flex-col justify-between shadow-sm relative">
            <div className="absolute -top-3 right-4 bg-teal-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Recommended
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{proTier.name}</h3>
                  <p className="text-xs text-slate-500">{proTier.description}</p>
                </div>
              </div>

              <div className="my-4">
                <span className="text-3xl font-extrabold text-slate-900 font-heading">
                  ${interval === 'annual' ? proTier.priceAnnualMonthly : proTier.priceMonthly}
                </span>
                <span className="text-xs text-slate-500 ml-1">/ month</span>
                {interval === 'annual' && (
                  <p className="text-[11px] text-teal-700 font-medium mt-0.5">Billed annually ($468 / year)</p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">What's Unlocked:</p>
                {proTier.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3">
              {planId === 'pro' ? (
                <Button disabled className="w-full bg-stone-100 text-stone-500 cursor-default">
                  Current Active Plan
                </Button>
              ) : (
                <Button
                  onClick={() => handleActivate('pro')}
                  disabled={activatingPlan === 'pro'}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm text-xs sm:text-sm"
                >
                  {activatingPlan === 'pro' ? 'Activating...' : 'Upgrade to Pro Surgeon'}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Hospital / Enterprise OR Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-indigo-300 transition-all shadow-xs">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-heading">{enterpriseTier.name}</h3>
                  <p className="text-xs text-slate-500">{enterpriseTier.description}</p>
                </div>
              </div>

              <div className="my-4">
                <span className="text-3xl font-extrabold text-slate-900 font-heading">
                  ${interval === 'annual' ? enterpriseTier.priceAnnualMonthly : enterpriseTier.priceMonthly}
                </span>
                <span className="text-xs text-slate-500 ml-1">/ month</span>
                {interval === 'annual' && (
                  <p className="text-[11px] text-indigo-700 font-medium mt-0.5">Billed annually ($1,908 / year)</p>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Hospital Suite Perks:</p>
                {enterpriseTier.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3">
              {planId === 'enterprise' ? (
                <Button disabled className="w-full bg-stone-100 text-stone-500 cursor-default">
                  Current Active Plan
                </Button>
              ) : (
                <Button
                  onClick={() => handleActivate('enterprise')}
                  disabled={activatingPlan === 'enterprise'}
                  variant="outline"
                  className="w-full border-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-900 font-semibold text-xs sm:text-sm"
                >
                  {activatingPlan === 'enterprise' ? 'Activating...' : 'Activate Hospital Suite'}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Guarantee note */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200/80 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-teal-600" />
            <span>Instant activation • Cancel anytime • Zero surgical disruption</span>
          </div>
          <button
            type="button"
            onClick={closeUpgradeModal}
            className="text-stone-500 hover:text-stone-800 text-xs font-medium"
          >
            Continue with Free Resident limits
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
