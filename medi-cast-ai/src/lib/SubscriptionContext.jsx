import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SUBSCRIPTION_TIERS, formatUGX } from './subscriptionPlans';
import { useToast } from '@/components/ui/use-toast';

const STORAGE_KEY = 'medicast_subscription_state_v2';
const SubscriptionContext = createContext(null);

function getTodayString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getCurrentMonthString() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function loadInitialState() {
  const today = getTodayString();
  const currentMonth = getCurrentMonthString();

  const defaultState = {
    planId: 'free',
    billingInterval: 'monthly',
    subscribedAt: null,
    lastPayment: null,
    paymentHistory: [],
    usage: {
      videosAnalyzedThisMonth: 0,
      aiQueriesToday: 0,
      lastAiQueryDate: today,
      monthResetDate: currentMonth,
      liveSessionsCount: 0
    }
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('medicast_subscription_state_v1');
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);

    // Verify & reset daily/monthly usage if dates rolled over
    const usage = parsed.usage || defaultState.usage;
    let updatedUsage = { ...usage };

    if (usage.monthResetDate !== currentMonth) {
      updatedUsage.videosAnalyzedThisMonth = 0;
      updatedUsage.monthResetDate = currentMonth;
    }

    if (usage.lastAiQueryDate !== today) {
      updatedUsage.aiQueriesToday = 0;
      updatedUsage.lastAiQueryDate = today;
    }

    const validPlan = parsed.planId && SUBSCRIPTION_TIERS[parsed.planId] ? parsed.planId : 'free';

    return {
      planId: validPlan,
      billingInterval: parsed.billingInterval || 'monthly',
      subscribedAt: parsed.subscribedAt || null,
      lastPayment: parsed.lastPayment || null,
      paymentHistory: Array.isArray(parsed.paymentHistory) ? parsed.paymentHistory : [],
      usage: updatedUsage
    };
  } catch (err) {
    console.warn('[Subscription] Error reading storage, falling back to default:', err);
    return defaultState;
  }
}

export function SubscriptionProvider({ children }) {
  const [state, setState] = useState(loadInitialState);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [modalFeatureHint, setModalFeatureHint] = useState('');
  const { toast } = useToast();

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('medicast_subscription_change', { detail: state }));
      }
    } catch (err) {
      console.warn('[Subscription] Save error:', err);
    }
  }, [state]);

  const planId = state.planId;
  const currentPlan = SUBSCRIPTION_TIERS[planId] || SUBSCRIPTION_TIERS.free;
  const isPro = planId === 'pro';
  const isProOrHigher = isPro;
  const isFree = planId === 'free';

  // Quota calculation helpers
  const canAnalyzeVideo = useCallback(() => {
    if (isProOrHigher) {
      return { allowed: true, remaining: Infinity, limit: Infinity, plan: currentPlan.name };
    }
    const limit = currentPlan.limits.videosPerMonth;
    const used = state.usage.videosAnalyzedThisMonth || 0;
    const remaining = Math.max(0, limit - used);
    return {
      allowed: remaining > 0,
      remaining,
      limit,
      used,
      plan: currentPlan.name,
      reason: remaining > 0 ? null : `Free Resident quota reached (${limit}/${limit} videos analyzed this month). Upgrade with MTN Mobile Money to Pro Surgeon for unlimited video analyses.`
    };
  }, [isProOrHigher, currentPlan, state.usage.videosAnalyzedThisMonth]);

  const canUseAiAssistant = useCallback(() => {
    if (isProOrHigher) {
      return { allowed: true, remaining: Infinity, limit: Infinity, plan: currentPlan.name };
    }
    const today = getTodayString();
    const used = state.usage.lastAiQueryDate === today ? (state.usage.aiQueriesToday || 0) : 0;
    const limit = currentPlan.limits.aiQueriesPerDay;
    const remaining = Math.max(0, limit - used);
    return {
      allowed: remaining > 0,
      remaining,
      limit,
      used,
      plan: currentPlan.name,
      reason: remaining > 0 ? null : `Daily free limit reached (${limit}/${limit} AI questions today). Upgrade with MTN Mobile Money to Pro Surgeon for unlimited surgical reasoning.`
    };
  }, [isProOrHigher, currentPlan, state.usage.lastAiQueryDate, state.usage.aiQueriesToday]);

  const recordVideoAnalysis = useCallback(() => {
    setState(prev => {
      const currentMonth = getCurrentMonthString();
      const isNewMonth = prev.usage.monthResetDate !== currentMonth;
      return {
        ...prev,
        usage: {
          ...prev.usage,
          monthResetDate: currentMonth,
          videosAnalyzedThisMonth: (isNewMonth ? 0 : prev.usage.videosAnalyzedThisMonth) + 1
        }
      };
    });
  }, []);

  const recordAiQuery = useCallback(() => {
    setState(prev => {
      const today = getTodayString();
      const isNewDay = prev.usage.lastAiQueryDate !== today;
      return {
        ...prev,
        usage: {
          ...prev.usage,
          lastAiQueryDate: today,
          aiQueriesToday: (isNewDay ? 0 : prev.usage.aiQueriesToday) + 1
        }
      };
    });
  }, []);

  const recordLiveSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      usage: {
        ...prev.usage,
        liveSessionsCount: (prev.usage.liveSessionsCount || 0) + 1
      }
    }));
  }, []);

  const openUpgradeModal = useCallback((featureHint = '') => {
    setModalFeatureHint(featureHint);
    setIsUpgradeModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setIsUpgradeModalOpen(false);
    setModalFeatureHint('');
  }, []);

  const upgradePlan = useCallback((newPlanId, interval = 'monthly', paymentDetails = null) => {
    if (!SUBSCRIPTION_TIERS[newPlanId]) return;

    const paymentRecord = paymentDetails ? {
      id: `momo_${Date.now()}`,
      provider: 'MTN Mobile Money',
      phone: paymentDetails.phone || '',
      amountUGX: paymentDetails.amountUGX || (interval === 'annual' ? SUBSCRIPTION_TIERS[newPlanId].priceAnnualMonthlyUGX * 12 : SUBSCRIPTION_TIERS[newPlanId].priceMonthlyUGX),
      transactionRef: paymentDetails.transactionRef || `MTN-MOMO-${String(Date.now()).slice(-6)}`,
      date: new Date().toISOString(),
      status: 'approved'
    } : null;

    setState(prev => ({
      ...prev,
      planId: newPlanId,
      billingInterval: interval,
      subscribedAt: new Date().toISOString(),
      lastPayment: paymentRecord || prev.lastPayment,
      paymentHistory: paymentRecord ? [paymentRecord, ...prev.paymentHistory] : prev.paymentHistory
    }));

    setIsUpgradeModalOpen(false);

    const planInfo = SUBSCRIPTION_TIERS[newPlanId];
    if (newPlanId === 'free') {
      toast({
        title: 'Switched to Free Resident Tier',
        description: 'Your account is now on the Free Resident tier.'
      });
    } else {
      toast({
        title: `Payment Received via MTN MoMo!`,
        description: `${planInfo.name} is now active (${paymentRecord ? formatUGX(paymentRecord.amountUGX) : ''}). Unlimited Video Analyses & AI Consultations unlocked!`
      });
    }
  }, [toast]);

  const value = {
    plan: currentPlan,
    planId,
    billingInterval: state.billingInterval,
    subscribedAt: state.subscribedAt,
    lastPayment: state.lastPayment,
    paymentHistory: state.paymentHistory,
    usage: state.usage,
    isPro,
    isProOrHigher,
    isFree,
    canAnalyzeVideo,
    canUseAiAssistant,
    recordVideoAnalysis,
    recordAiQuery,
    recordLiveSession,
    upgradePlan,
    isUpgradeModalOpen,
    modalFeatureHint,
    openUpgradeModal,
    closeUpgradeModal
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
