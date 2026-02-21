import { normalize, diceCoefficient, FUZZY_THRESHOLD } from './fuzzy-match';

type ActionType = { type: 'navigate'; path: string } | { type: 'message' } | { type: 'none' };

interface Intent {
  id: string;
  keywords: string[];
  synonyms: string[];
  roles: string[];
  response: string;
  action: ActionType;
}

export interface CommandResult {
  response: string;
  action: ActionType;
}

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  staff: '/staff-dashboard',
  hotel_admin: '/dashboard',
  platform_admin: '/platform',
};

const ROLE_SETTINGS_MAP: Record<string, string> = {
  staff: '/staff-dashboard/settings',
  hotel_admin: '/dashboard/settings',
  platform_admin: '/platform/settings',
};

const ALL_AUTH_ROLES = ['staff', 'hotel_admin', 'platform_admin'];

const intents: Intent[] = [
  // Greeting
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'greetings'],
    synonyms: ['howdy', 'sup', 'good morning', 'good afternoon'],
    roles: ALL_AUTH_ROLES,
    response: "Hello! I'm here to help you navigate Tipper. Type 'help' to see what I can do.",
    action: { type: 'message' },
  },
  // Help
  {
    id: 'help',
    keywords: ['help', 'commands', 'what can you do'],
    synonyms: ['assist', 'options', 'menu'],
    roles: ALL_AUTH_ROLES,
    response: '', // dynamically generated per role
    action: { type: 'message' },
  },
  // Dashboard — all roles
  {
    id: 'dashboard',
    keywords: ['dashboard', 'home', 'main'],
    synonyms: ['overview', 'start', 'homepage'],
    roles: ALL_AUTH_ROLES,
    response: 'Navigating to your dashboard...',
    action: { type: 'navigate', path: '' }, // resolved per role
  },
  // Settings — all roles
  {
    id: 'settings',
    keywords: ['settings', 'preferences', 'account'],
    synonyms: ['profile', 'configuration', 'config'],
    roles: ALL_AUTH_ROLES,
    response: 'Opening your settings...',
    action: { type: 'navigate', path: '' }, // resolved per role
  },

  // Hotel admin intents
  {
    id: 'staff',
    keywords: ['staff', 'employees', 'team'],
    synonyms: ['workers', 'personnel', 'crew'],
    roles: ['hotel_admin'],
    response: 'Opening staff management...',
    action: { type: 'navigate', path: '/dashboard/staff' },
  },
  {
    id: 'rooms',
    keywords: ['rooms', 'room management'],
    synonyms: ['accommodations', 'suites'],
    roles: ['hotel_admin'],
    response: 'Opening room management...',
    action: { type: 'navigate', path: '/dashboard/rooms' },
  },
  {
    id: 'hotel-analytics',
    keywords: ['analytics', 'reports', 'statistics'],
    synonyms: ['data', 'metrics', 'insights', 'stats'],
    roles: ['hotel_admin'],
    response: 'Opening analytics...',
    action: { type: 'navigate', path: '/dashboard/analytics' },
  },
  {
    id: 'hotel-audit',
    keywords: ['audit', 'audit log', 'activity log'],
    synonyms: ['logs', 'history', 'trail'],
    roles: ['hotel_admin'],
    response: 'Opening audit log...',
    action: { type: 'navigate', path: '/dashboard/audit-log' },
  },
  {
    id: 'qr-codes',
    keywords: ['qr', 'qr codes', 'codes'],
    synonyms: ['scan codes', 'barcodes'],
    roles: ['hotel_admin'],
    response: 'Opening QR code management...',
    action: { type: 'navigate', path: '/dashboard/rooms' },
  },
  {
    id: 'onboarding',
    keywords: ['onboarding', 'setup', 'wizard'],
    synonyms: ['getting started', 'initial setup'],
    roles: ['hotel_admin'],
    response: 'Opening hotel onboarding...',
    action: { type: 'navigate', path: '/onboarding' },
  },

  // Staff intents
  {
    id: 'my-tips',
    keywords: ['tips', 'my tips', 'earnings'],
    synonyms: ['income', 'money', 'received'],
    roles: ['staff'],
    response: 'Opening your tips...',
    action: { type: 'navigate', path: '/staff-dashboard' },
  },
  {
    id: 'payouts-staff',
    keywords: ['payouts', 'withdrawals', 'transfers'],
    synonyms: ['cash out', 'bank transfer', 'withdraw'],
    roles: ['staff'],
    response: 'Opening your payouts...',
    action: { type: 'navigate', path: '/staff-dashboard/payouts' },
  },
  {
    id: 'assignments',
    keywords: ['assignments', 'rooms assigned', 'my rooms'],
    synonyms: ['schedule', 'shifts', 'assigned rooms'],
    roles: ['staff'],
    response: 'Opening your assignments...',
    action: { type: 'navigate', path: '/staff-dashboard/assignments' },
  },

  // Platform admin intents
  {
    id: 'hotels',
    keywords: ['hotels', 'properties', 'manage hotels'],
    synonyms: ['hotel list', 'all hotels'],
    roles: ['platform_admin'],
    response: 'Opening hotel management...',
    action: { type: 'navigate', path: '/platform/hotels' },
  },
  {
    id: 'platform-analytics',
    keywords: ['analytics', 'platform analytics', 'reports'],
    synonyms: ['data', 'metrics', 'platform stats'],
    roles: ['platform_admin'],
    response: 'Opening platform analytics...',
    action: { type: 'navigate', path: '/platform/analytics' },
  },
  {
    id: 'platform-audit',
    keywords: ['audit', 'audit log', 'activity log'],
    synonyms: ['logs', 'history', 'trail'],
    roles: ['platform_admin'],
    response: 'Opening platform audit log...',
    action: { type: 'navigate', path: '/platform/audit-log' },
  },
  {
    id: 'platform-payouts',
    keywords: ['payouts', 'transfers', 'disbursements'],
    synonyms: ['payments', 'payout management'],
    roles: ['platform_admin'],
    response: 'Opening payout management...',
    action: { type: 'navigate', path: '/platform/payouts' },
  },
];

function getHelpResponse(role: string): string {
  const available = intents.filter(
    (i) => i.roles.includes(role) && i.id !== 'help' && i.id !== 'greeting',
  );
  const commands = available.map((i) => `• ${i.keywords[0]}`).join('\n');
  return `Here's what I can help with:\n\n${commands}\n\nYou can also type "start testing" to enter testing mode and report bugs or enhancements.`;
}

function resolveAction(intent: Intent, role: string): ActionType {
  if (intent.id === 'dashboard') {
    return { type: 'navigate', path: ROLE_DASHBOARD_MAP[role] || '/dashboard' };
  }
  if (intent.id === 'settings') {
    return { type: 'navigate', path: ROLE_SETTINGS_MAP[role] || '/dashboard/settings' };
  }
  return intent.action;
}

export function parseCommand(message: string, role: string): CommandResult {
  const normalized = normalize(message);
  const roleIntents = intents.filter((i) => i.roles.includes(role));

  // Exact keyword match
  for (const intent of roleIntents) {
    for (const keyword of intent.keywords) {
      if (normalized === normalize(keyword) || normalized.includes(normalize(keyword))) {
        if (intent.id === 'help') {
          return { response: getHelpResponse(role), action: { type: 'message' } };
        }
        return { response: intent.response, action: resolveAction(intent, role) };
      }
    }
  }

  // Synonym match
  for (const intent of roleIntents) {
    for (const synonym of intent.synonyms) {
      if (normalized === normalize(synonym) || normalized.includes(normalize(synonym))) {
        if (intent.id === 'help') {
          return { response: getHelpResponse(role), action: { type: 'message' } };
        }
        return { response: intent.response, action: resolveAction(intent, role) };
      }
    }
  }

  // Fuzzy match
  let bestMatch: Intent | null = null;
  let bestScore = 0;
  for (const intent of roleIntents) {
    const allTerms = [...intent.keywords, ...intent.synonyms];
    for (const term of allTerms) {
      const score = diceCoefficient(normalized, normalize(term));
      if (score > bestScore && score >= FUZZY_THRESHOLD) {
        bestScore = score;
        bestMatch = intent;
      }
    }
  }

  if (bestMatch) {
    if (bestMatch.id === 'help') {
      return { response: getHelpResponse(role), action: { type: 'message' } };
    }
    return { response: bestMatch.response, action: resolveAction(bestMatch, role) };
  }

  return {
    response: "I didn't understand that. Type 'help' to see what I can do.",
    action: { type: 'none' },
  };
}
