// ─────────────────────────────────────────────────────────────
// MediCast AI Surgical Intelligence — Subscription Plans & Tiers
// ─────────────────────────────────────────────────────────────

export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Resident / Free',
    badge: 'Resident Tier',
    description: 'Essential surgical co-pilot & case analysis for surgical residents & trainees.',
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    limits: {
      videosPerMonth: 3,
      aiQueriesPerDay: 10,
      maxVideoMinutes: 20,
      liveSurgeryStreaming: 'trial', // 'trial' allows 1 trial session
      wordReportExport: false,
      priorityGpu: false
    },
    features: [
      '3 surgical video analyses / month',
      '10 AI Surgical Assistant queries / day',
      'Basic surgical phase timeline',
      'Real-time optical clarity telemetry',
      'Standard on-screen risk event summary',
      '1 Live Surgery stream preview trial'
    ],
    highlight: false,
    ctaText: 'Current Plan'
  },
  pro: {
    id: 'pro',
    name: 'Pro Surgeon',
    badge: 'Most Popular',
    description: 'Full intraoperative surgical vision intelligence & unlimited AI consultations for attending surgeons.',
    priceMonthly: 49,
    priceAnnualMonthly: 39, // $468 billed annually (Save 20%)
    limits: {
      videosPerMonth: Infinity,
      aiQueriesPerDay: Infinity,
      maxVideoMinutes: 240, // 4 hours
      liveSurgeryStreaming: 'unlimited',
      wordReportExport: true,
      priorityGpu: true
    },
    features: [
      'Unlimited surgical video analyses',
      'Unlimited AI Surgical Assistant questions',
      'Intraoperative live PC / OR camera streaming',
      'Real-time hemorrhage & vital structure proximity alerts',
      'Comprehensive clinical audit report (.docx) export',
      'Full surgical kinematics & skill scoring',
      'High-priority multimodal Vision AI inference'
    ],
    highlight: true,
    ctaText: 'Upgrade to Pro'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Hospital / OR Suite',
    badge: 'Enterprise',
    description: 'Institutional surgical video governance, department-wide audits, and multi-OR stream integrations.',
    priceMonthly: 199,
    priceAnnualMonthly: 159, // $1,908 billed annually
    limits: {
      videosPerMonth: Infinity,
      aiQueriesPerDay: Infinity,
      maxVideoMinutes: Infinity,
      liveSurgeryStreaming: 'unlimited',
      wordReportExport: true,
      priorityGpu: true,
      departmentMultiSurgeon: true
    },
    features: [
      'Everything in Pro Surgeon',
      'Multi-surgeon surgical department registry',
      'Hospital Morbidity & Mortality (M&M) audit logging',
      'Multi-room OR hardware & scope capture routing',
      'HIPAA & institutional compliance data export',
      'Custom surgical ontology fine-tuning',
      'Dedicated 24/7 clinical AI support & SLA'
    ],
    highlight: false,
    ctaText: 'Activate Hospital Suite'
  }
};

export const FAQ_ITEMS = [
  {
    q: 'Can I cancel or change my plan anytime?',
    a: 'Yes. You can switch between Monthly and Annual billing or downgrade back to the Free Resident tier at any time without penalty.'
  },
  {
    q: 'How are video analysis quotas counted?',
    a: 'Video analysis quotas reset automatically on the 1st of every calendar month. On the Free tier, you can analyze up to 3 surgical videos per month. Pro Surgeon and Hospital Suite include unlimited analyses.'
  },
  {
    q: 'How does AI Assistant daily usage work?',
    a: 'On the Free Resident tier, you have 10 AI surgical queries every day, which resets at midnight. Pro Surgeon and Hospital Suite offer unlimited queries.'
  },
  {
    q: 'Can I use Live PC Camera Surgery on the Free plan?',
    a: 'Free users get a full preview trial of the live surgical streaming module. Unlimited intraoperative streaming and continuous real-time hazard voice warnings require Pro Surgeon or Hospital Suite.'
  }
];
