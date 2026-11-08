// ─────────────────────────────────────────────────────────────
// MediCast AI Surgical Intelligence — Subscription Plans (UGX & MTN MoMo)
// ─────────────────────────────────────────────────────────────

export const CURRENCY = 'UGX';

export function formatUGX(amount) {
  if (amount === 0) return 'UGX 0';
  if (!amount || isNaN(amount)) return 'UGX 0';
  return `UGX ${Number(amount).toLocaleString()}`;
}

// Official Payment Endpoint & Receiver Configuration
export const MEDICAST_PAYMENT_CONFIG = {
  accountName: 'Medicast AI',
  recipientName: 'Lameck Opio',
  recipientPhone: '0778543120',
  formattedRecipientPhone: '+256 778 543 120',
  network: 'MTN Mobile Money',
  currency: 'UGX',
  ussdPrefix: '*165#'
};

export const MTN_UGANDA_PREFIXES = ['077', '078', '076', '039', '25677', '25678', '25676', '25639'];

export function isMtnUgandaNumber(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('256')) {
    const sub = cleaned.slice(3, 5);
    return ['77', '78', '76', '39'].includes(sub);
  }
  if (cleaned.startsWith('0')) {
    const sub = cleaned.slice(1, 3);
    return ['77', '78', '76', '39'].includes(sub);
  }
  if (cleaned.length === 9) {
    const sub = cleaned.slice(0, 2);
    return ['77', '78', '76', '39'].includes(sub);
  }
  return false;
}

export function normalizeUgandanPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('256') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+256 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

// Reduced, high-conversion tier cards
export const SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: 'Resident Tier',
    badge: 'Free Tier',
    description: 'Essential surgical co-pilot & case analysis for surgical residents and trainees.',
    priceMonthlyUGX: 0,
    priceAnnualMonthlyUGX: 0,
    limits: {
      videosPerMonth: 3,
      aiQueriesPerDay: 10,
      maxVideoMinutes: 20,
      liveSurgeryStreaming: 'trial',
      wordReportExport: false,
      priorityGpu: false
    },
    features: [
      '3 surgical video analyses / month',
      '10 AI Surgical Assistant queries / day',
      'Basic surgical phase timeline & metrics',
      'Real-time optical clarity telemetry',
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
    priceMonthlyUGX: 85000, // UGX 85,000 / month (~$23)
    priceAnnualMonthlyUGX: 65000, // UGX 65,000 / month when paid annually (UGX 780,000 / year)
    quickAmountsUGX: [50000, 85000, 100000, 200000],
    limits: {
      videosPerMonth: Infinity,
      aiQueriesPerDay: Infinity,
      maxVideoMinutes: 240,
      liveSurgeryStreaming: 'unlimited',
      wordReportExport: true,
      priorityGpu: true
    },
    features: [
      'Unlimited surgical video analyses',
      'Unlimited AI Surgical Assistant questions',
      'Intraoperative Live Camera / OR Scope streaming',
      'Continuous hemorrhage & proximity hazard voice alerts',
      'Accredited clinical Word audit report (.docx) export',
      'Full surgical kinematics & skill scoring',
      'Direct MTN Mobile Money receipt to 0778543120'
    ],
    highlight: true,
    ctaText: 'Upgrade with MTN MoMo'
  }
};

export const FAQ_ITEMS = [
  {
    q: 'How does payment with MTN Mobile Money work?',
    a: 'When you click Upgrade, you enter your MTN phone number. MediCast AI triggers an instant MoMo payment prompt. All payments are received under account name Medicast AI through Lameck Opio (0778543120). Enter your MTN MoMo PIN to authorize, and your Pro subscription activates immediately.'
  },
  {
    q: 'What is the official receiver phone number for manual MTN transfers?',
    a: 'The official endpoint for MediCast AI payments is 0778543120 (Registered as Lameck Opio / Medicast AI). You can also dial *165# directly on MTN and send money to 0778543120.'
  },
  {
    q: 'Can I cancel or downgrade my plan anytime?',
    a: 'Yes. You can switch between Monthly and Annual billing or downgrade back to the Free Resident tier at any time without penalty.'
  },
  {
    q: 'How are video analysis quotas counted?',
    a: 'Video analysis quotas reset automatically on the 1st of every calendar month. On the Free Resident tier, you can analyze up to 3 surgical videos per month. Pro Surgeon includes unlimited analyses.'
  },
  {
    q: 'How does AI Assistant daily usage work?',
    a: 'On the Free Resident tier, you have 10 AI surgical queries every day, which resets at midnight. Pro Surgeon offers unlimited consultations.'
  }
];
