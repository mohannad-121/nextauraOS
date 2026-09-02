import type { LucideIcon } from 'lucide-react';
import {
  CreditCard,
  FileSignature,
  PieChart,
  Leaf,
  Users,
  Clock,
  UserPlus,
  Calendar as CalendarIcon,
  Award,
  Car,
  Wallet,
  Mail,
  MessageSquare,
  ClipboardList,
  Share2,
  FileText,
  BarChart3,
  Contact,
} from 'lucide-react';
import type { AppView } from '../context/AppContext';

export interface NextAuraServiceDefinition {
  key: string;
  appId: AppView;
  name: string;
  category: 'finance' | 'hr' | 'marketing' | 'global';
  categoryLabel: string;
  description: string;
  icon: LucideIcon;
  defaultSubView?: string;
  route: string;
  isCore?: boolean;
}

export const NEXTAURA_SERVICES: NextAuraServiceDefinition[] = [
  // FINANCE
  {
    key: 'invoicing',
    appId: 'invoicing',
    name: 'Invoicing & Payments',
    category: 'finance',
    categoryLabel: 'Finance',
    description: 'Create multi-currency invoices, manage billing, track customer receivables, and automate payment reminders.',
    icon: CreditCard,
    route: '/invoicing',
  },
  {
    key: 'accounting',
    appId: 'accounting',
    name: 'Accounting & General Ledger',
    category: 'finance',
    categoryLabel: 'Finance',
    description: 'Double-entry general ledger, chart of accounts, automated journal entries, bank reconciliation, and financial reports.',
    icon: CreditCard,
    route: '/accounting',
  },
  {
    key: 'expenses',
    appId: 'expenses',
    name: 'Expenses & Corporate Cards',
    category: 'finance',
    categoryLabel: 'Finance',
    description: 'Employee expense reporting, multi-level approval workflows, card management, and receipt OCR matching.',
    icon: CreditCard,
    route: '/expenses',
  },
  {
    key: 'sign',
    appId: 'sign',
    name: 'NextAura Sign (E-Signature)',
    category: 'finance',
    categoryLabel: 'Finance',
    description: 'Legally binding e-signatures, document preparation, audit trail logging, and customer agreement workflows.',
    icon: FileSignature,
    route: '/sign',
  },
  {
    key: 'equity',
    appId: 'equity',
    name: 'Equity & Cap Table',
    category: 'finance',
    categoryLabel: 'Finance',
    description: 'Cap table tracking, share issuance, ESOP option grants management, and interactive funding dilution simulator.',
    icon: PieChart,
    route: '/equity',
  },
  {
    key: 'esg',
    appId: 'esg',
    name: 'ESG & Carbon Accounting',
    category: 'finance',
    categoryLabel: 'Finance',
    description: 'Corporate sustainability tracking, Scope 1-3 carbon calculator, ESG scorecard, and regulatory compliance reports.',
    icon: Leaf,
    route: '/esg',
  },

  // HUMAN RESOURCES
  {
    key: 'employees',
    appId: 'employees',
    name: 'Employee Directory & Org Chart',
    category: 'hr',
    categoryLabel: 'Human Resources',
    description: 'Centralized employee profiles, compensation history, private compliance details, and interactive organizational chart.',
    icon: Users,
    route: '/employees',
  },
  {
    key: 'attendance',
    appId: 'attendance',
    name: 'Attendance & Kiosk Tracking',
    category: 'hr',
    categoryLabel: 'Human Resources',
    description: 'Real-time time clock, break tracking, kiosk mode, overtime calculations, and daily workforce presence board.',
    icon: Clock,
    route: '/attendance',
  },
  {
    key: 'recruitment',
    appId: 'recruitment',
    name: 'Recruitment & ATS Pipeline',
    category: 'hr',
    categoryLabel: 'Human Resources',
    description: 'Applicant tracking system (ATS), Kanban hiring pipeline, job openings publisher, and atomic candidate onboarding.',
    icon: UserPlus,
    route: '/recruitment',
  },
  {
    key: 'time_off',
    appId: 'time-off',
    name: 'Time Off & Leave Management',
    category: 'hr',
    categoryLabel: 'Human Resources',
    description: 'Vacation request approvals, leave balance tracking, team holiday calendar, and automatic global calendar sync.',
    icon: CalendarIcon,
    route: '/time-off',
  },
  {
    key: 'appraisals',
    appId: 'appraisals',
    name: 'Appraisals & Goals (OKRs)',
    category: 'hr',
    categoryLabel: 'Human Resources',
    description: 'Performance review cycles, 360-degree self & manager reviews, goal tracking, and OKR alignment scorecards.',
    icon: Award,
    route: '/appraisals',
  },
  {
    key: 'fleet',
    appId: 'fleet',
    name: 'Fleet & Asset Management',
    category: 'hr',
    categoryLabel: 'Human Resources',
    description: 'Company vehicle assignments, mileage log, maintenance scheduling, vendor tracking, and automated expense logging.',
    icon: Car,
    route: '/fleet',
  },
  {
    key: 'payroll',
    appId: 'payroll',
    name: 'Payroll Processing & GL Sync',
    category: 'hr',
    categoryLabel: 'Human Resources',
    description: 'Monthly payroll runs, gross-to-net tax calculations, automated payslip generation, and GL journal entry posting.',
    icon: Wallet,
    route: '/payroll',
  },

  // MARKETING
  {
    key: 'email_marketing',
    appId: 'email',
    name: 'Email Marketing & Campaigns',
    category: 'marketing',
    categoryLabel: 'Marketing',
    description: 'Rich HTML email builder, audience segmentation, campaign scheduling, open/click rate tracking, and template vault.',
    icon: Mail,
    route: '/email',
  },
  {
    key: 'sms_marketing',
    appId: 'sms',
    name: 'SMS Marketing & Broadcasts',
    category: 'marketing',
    categoryLabel: 'Marketing',
    description: 'Direct mobile SMS messaging campaigns, short-code delivery, customer engagement, and analytics reporting.',
    icon: MessageSquare,
    route: '/sms',
  },
  {
    key: 'surveys',
    appId: 'surveys',
    name: 'Surveys & CSAT Feedback',
    category: 'marketing',
    categoryLabel: 'Marketing',
    description: 'Interactive feedback surveys, Net Promoter Score (NPS) tracking, customer satisfaction metrics, and response analytics.',
    icon: ClipboardList,
    route: '/surveys',
  },
  {
    key: 'social_marketing',
    appId: 'social',
    name: 'Social Marketing & Scheduling',
    category: 'marketing',
    categoryLabel: 'Marketing',
    description: 'Multi-platform social media post scheduler (LinkedIn, Twitter, Facebook), account connection, and engagement metrics.',
    icon: Share2,
    route: '/social',
  },

  // GLOBAL / CRM PLATFORM
  {
    key: 'contacts',
    appId: 'contacts',
    name: 'Contacts & CRM Directory',
    category: 'global',
    categoryLabel: 'Global Platform',
    description: 'Unified customer, vendor, partner, and lead directory with activity timelines and account balances.',
    icon: Contact,
    route: '/contacts',
    isCore: true,
  },
  {
    key: 'documents',
    appId: 'documents',
    name: 'Document Vault & Vault Search',
    category: 'global',
    categoryLabel: 'Global Platform',
    description: 'Secure enterprise file storage, document categorization, version control, and instant search.',
    icon: FileText,
    route: '/documents',
    isCore: true,
  },
  {
    key: 'analytics',
    appId: 'analytics',
    name: 'Analytics Center',
    category: 'global',
    categoryLabel: 'Global Platform',
    description: 'Cross-module executive business intelligence, revenue analytics, workforce metrics, and growth forecasts.',
    icon: BarChart3,
    route: '/analytics',
    isCore: true,
  },
];

export const getServiceByKey = (key: string): NextAuraServiceDefinition | undefined => {
  return NEXTAURA_SERVICES.find((s) => s.key === key);
};

export const getServiceByAppId = (appId: AppView): NextAuraServiceDefinition | undefined => {
  return NEXTAURA_SERVICES.find((s) => s.appId === appId);
};
