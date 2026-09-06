import type { KnowledgeCategory, KnowledgeEntry, KnowledgeNavigation } from '../types.ts';

interface CatalogEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  description: string;
  features: string[];
  subviews: string[];
  workflow: string[];
  aliases: string[];
  related?: string[];
  navigation: KnowledgeNavigation;
}

const patternStems = [
  'what is',
  'tell me about',
  'explain',
  'how does',
  'how do i use',
  'help with',
  'show me',
  'open',
  'go to',
  'what can i do in',
  'common problems with',
  'getting started with',
];

const expandPatterns = (entry: CatalogEntry): string[] => {
  const names = Array.from(new Set([entry.id.replaceAll('_', ' '), entry.title, ...entry.aliases]));
  return Array.from(new Set(names.flatMap((name) => patternStems.map((stem) => `${stem} ${name.toLowerCase()}`))));
};

const enrich = (item: CatalogEntry): KnowledgeEntry => ({
  ...item,
  purpose: item.description,
  actions: item.workflow.map((step) => step.replace(/^(review|view)/i, 'Open and review')),
  commonQuestions: [
    `What is ${item.title}?`,
    `How does ${item.title} work?`,
    `How do I get started with ${item.title}?`,
    `What can I do in ${item.title}?`,
    `Where can I find ${item.title}?`,
    `Which other apps work with ${item.title}?`,
  ],
  commonProblems: [
    `I cannot find ${item.title}`,
    `${item.title} is not enabled`,
    `I need permission to use ${item.title}`,
    `I do not know which step comes next`,
    `The ${item.title} page has no records yet`,
  ],
  examples: [
    `Open ${item.title}`,
    `Explain the ${item.title} workflow`,
    `What can I do here?`,
  ],
  relatedServices: item.related || [],
  suggestedPrompts: [
    `How do I use ${item.title}?`,
    `Open ${item.title}`,
    `What are the main features of ${item.title}?`,
    `What should I do first in ${item.title}?`,
  ],
  patterns: expandPatterns(item),
});

const catalog: CatalogEntry[] = [
  {
    id: 'invoicing', category: 'Finance', title: 'Invoicing',
    description: 'Create customer invoices, track receivables, and follow every bill from draft to payment.',
    features: ['Multi-currency invoices', 'Customer records', 'Tax-aware line items', 'Payment and overdue status'],
    subviews: ['Invoices', 'Customers', 'Products', 'Reporting', 'New invoice'],
    workflow: ['Choose a customer', 'Add products or line items', 'Review taxes and totals', 'Save, send, and track payment'],
    aliases: ['invoice', 'invoices', 'billing', 'receivables', 'customer invoice'], related: ['contacts', 'accounting'], navigation: { app: 'invoicing' },
  },
  {
    id: 'accounting', category: 'Finance', title: 'Accounting',
    description: 'Maintain the chart of accounts, journals, general ledger, reconciliation, and financial reports.',
    features: ['Double-entry journals', 'General ledger', 'Bank reconciliation', 'Financial reports'],
    subviews: ['Overview', 'Ledger', 'Journal entry', 'Reconciliation', 'Reports'],
    workflow: ['Review the chart of accounts', 'Post a balanced journal', 'Reconcile bank activity', 'Run financial reports'],
    aliases: ['ledger', 'general ledger', 'journal', 'bookkeeping', 'reconciliation'], related: ['invoicing', 'expenses', 'payroll'], navigation: { app: 'accounting', subView: 'ledger' },
  },
  {
    id: 'expenses', category: 'Finance', title: 'Expenses',
    description: 'Capture employee spend, receipts, approvals, reimbursements, and corporate card activity.',
    features: ['Expense reports', 'Receipt details', 'Approval queue', 'Corporate cards'],
    subviews: ['Expenses', 'Approvals', 'Corporate cards'],
    workflow: ['Submit an expense', 'Attach supporting details', 'Review policy and approval status', 'Approve or reimburse'],
    aliases: ['expense', 'spend', 'receipt', 'reimbursement', 'corporate card'], related: ['approvals', 'accounting'], navigation: { app: 'expenses' },
  },
  {
    id: 'sign', category: 'Finance', title: 'NextAura Sign',
    description: 'Prepare agreements, place fields, assign recipients, and track electronic signatures.',
    features: ['Document preparation', 'Recipient fields', 'Signing status', 'Audit trail'],
    subviews: ['Documents', 'Prepare agreement', 'Signer experience'],
    workflow: ['Prepare or upload a document', 'Place signature fields', 'Assign recipients', 'Send and monitor completion'],
    aliases: ['e signature', 'esign', 'signature', 'agreement', 'signing'], related: ['documents', 'contacts'], navigation: { app: 'sign' },
  },
  {
    id: 'equity', category: 'Finance', title: 'Equity & Cap Table',
    description: 'Track ownership, shareholders, option grants, and financing dilution scenarios.',
    features: ['Cap table', 'Share classes', 'Option grants', 'Dilution simulator'],
    subviews: ['Overview', 'Cap table', 'Dilution simulator'],
    workflow: ['Review ownership', 'Maintain shareholder records', 'Record option grants', 'Model a funding scenario'],
    aliases: ['cap table', 'shares', 'shareholders', 'options', 'dilution'], related: ['employees', 'contacts'], navigation: { app: 'equity', subView: 'cap-table' },
  },
  {
    id: 'esg', category: 'Finance', title: 'ESG & Carbon Accounting',
    description: 'Record sustainability activity, calculate Scope 1–3 emissions, and review ESG progress.',
    features: ['Carbon activities', 'Scope classification', 'CO₂e calculation', 'ESG scorecards'],
    subviews: ['ESG overview', 'Carbon calculator'],
    workflow: ['Record an activity', 'Select its emissions scope', 'Calculate CO₂e', 'Review sustainability reporting'],
    aliases: ['carbon', 'emissions', 'sustainability', 'scope 1', 'scope 2', 'scope 3'], related: ['expenses', 'fleet'], navigation: { app: 'esg' },
  },
  {
    id: 'employees', category: 'People', title: 'Employees',
    description: 'Manage employee profiles, departments, reporting managers, work details, and compensation access.',
    features: ['Employee directory', 'Detailed profiles', 'Departments', 'Manager relationships', 'Profile photos'],
    subviews: ['Directory', 'Employee detail', 'Organization chart'],
    workflow: ['Create departments', 'Add an employee', 'Assign a reporting manager', 'Maintain employment details'],
    aliases: ['employee', 'people', 'team', 'staff', 'directory', 'headcount'], related: ['organization_chart', 'attendance', 'payroll'], navigation: { app: 'employees' },
  },
  {
    id: 'organization_chart', category: 'People', title: 'Organization Chart',
    description: 'Visualize reporting relationships built from employee manager assignments.',
    features: ['Manager hierarchy', 'Department context', 'Employee cards', 'Reporting relationships'],
    subviews: ['Organization chart'],
    workflow: ['Add employee profiles', 'Assign each reporting manager', 'Open the organization chart', 'Review reporting gaps'],
    aliases: ['org chart', 'organisation chart', 'hierarchy', 'reporting lines', 'manager tree'], related: ['employees', 'departments'], navigation: { app: 'employees', subView: 'org-chart' },
  },
  {
    id: 'attendance', category: 'People', title: 'Attendance',
    description: 'Track clock-in state, work location, breaks, overtime, and daily attendance records.',
    features: ['Clock in and out', 'Break tracking', 'Kiosk mode', 'Attendance log'],
    subviews: ['Who is working', 'Attendance log', 'Kiosk'],
    workflow: ['Choose a work location', 'Clock in', 'Track breaks', 'Clock out and review the day'],
    aliases: ['attendence', 'time clock', 'clock in', 'clock out', 'absence', 'who is working'], related: ['employees', 'time_off'], navigation: { app: 'attendance' },
  },
  {
    id: 'recruitment', category: 'People', title: 'Recruitment',
    description: 'Publish openings and move candidates through applications, interviews, offers, and hiring.',
    features: ['Job openings', 'Candidate pipeline', 'Interviews', 'Offers', 'Hire-to-employee flow'],
    subviews: ['Overview', 'Candidate pipeline', 'Job openings'],
    workflow: ['Create a job opening', 'Add candidates', 'Move hiring stages', 'Interview, offer, and hire'],
    aliases: ['ats', 'candidate', 'hiring', 'jobs', 'applicant', 'interview'], related: ['employees', 'calendar'], navigation: { app: 'recruitment', subView: 'kanban' },
  },
  {
    id: 'time_off', category: 'People', title: 'Time Off',
    description: 'Manage leave requests, approval decisions, balances, and team availability.',
    features: ['Leave requests', 'Approval flow', 'Team leave calendar', 'Balance visibility'],
    subviews: ['My requests', 'Pending approvals', 'Team calendar'],
    workflow: ['Create a leave request', 'Review dates and balance', 'Approve or reject', 'Sync approved leave to Calendar'],
    aliases: ['time off', 'leave', 'vacation', 'holiday', 'absence request'], related: ['attendance', 'calendar', 'approvals'], navigation: { app: 'time-off', subView: 'requests' },
  },
  {
    id: 'appraisals', category: 'People', title: 'Appraisals & Goals',
    description: 'Run performance review cycles, self and manager reviews, goals, and OKRs.',
    features: ['Review cycles', 'Self review', 'Manager review', 'Goals and OKRs'],
    subviews: ['Review cycles', 'Goals and OKRs'],
    workflow: ['Create a review cycle', 'Collect self feedback', 'Complete manager review', 'Track goals and outcomes'],
    aliases: ['appraisal', 'performance review', 'review cycle', 'goals', 'okr'], related: ['employees'], navigation: { app: 'appraisals' },
  },
  {
    id: 'fleet', category: 'People', title: 'Fleet & Assets',
    description: 'Manage company vehicles, employee assignments, odometers, vendors, and maintenance.',
    features: ['Vehicle directory', 'Employee assignments', 'Odometer tracking', 'Maintenance schedule'],
    subviews: ['Vehicles', 'Maintenance'],
    workflow: ['Add a vehicle', 'Assign an employee', 'Record mileage', 'Schedule and record maintenance'],
    aliases: ['vehicle', 'vehicles', 'cars', 'asset', 'maintenance', 'odometer'], related: ['employees', 'expenses'], navigation: { app: 'fleet' },
  },
  {
    id: 'payroll', category: 'People', title: 'Payroll',
    description: 'Prepare monthly payroll runs, calculate gross-to-net pay, generate payslips, approve, and post totals.',
    features: ['Payroll runs', 'Gross-to-net calculation', 'Payslips', 'Approval', 'General ledger synchronization'],
    subviews: ['Payroll overview', 'Monthly runs', 'Payslips'],
    workflow: ['Create a draft payroll run', 'Review employee calculations', 'Generate payslips', 'Approve and post to accounting'],
    aliases: ['pay roll', 'payslip', 'salary processing', 'monthly payroll', 'wages', 'net pay'], related: ['employees', 'accounting', 'approvals'], navigation: { app: 'payroll', subView: 'runs' },
  },
  {
    id: 'email_marketing', category: 'Marketing', title: 'Email Marketing',
    description: 'Build reusable templates and targeted email campaigns, then schedule and review delivery results.',
    features: ['Campaign builder', 'Templates', 'Audience selection', 'Scheduling', 'Open and click metrics'],
    subviews: ['Campaigns', 'New campaign', 'Templates'],
    workflow: ['Choose a template', 'Write the campaign', 'Select an audience', 'Schedule and review results'],
    aliases: ['email campaign', 'newsletter', 'mailing', 'email template', 'campaign email'], related: ['contacts', 'calendar'], navigation: { app: 'email' },
  },
  {
    id: 'sms_marketing', category: 'Marketing', title: 'SMS Marketing',
    description: 'Create concise mobile broadcasts for selected contact audiences and monitor delivery.',
    features: ['SMS broadcasts', 'Audience selection', 'Recipient count', 'Scheduling', 'Delivery status'],
    subviews: ['Broadcasts', 'Create SMS'],
    workflow: ['Write a concise message', 'Choose an audience', 'Review recipient count', 'Schedule or send'],
    aliases: ['sms', 'text campaign', 'text message', 'broadcast', 'mobile message'], related: ['contacts'], navigation: { app: 'sms' },
  },
  {
    id: 'surveys', category: 'Marketing', title: 'Surveys & CSAT',
    description: 'Build feedback forms, publish them, and review response, completion, CSAT, and NPS results.',
    features: ['Survey builder', 'Question types', 'Response collection', 'CSAT and NPS metrics'],
    subviews: ['Surveys', 'Responses', 'Create survey'],
    workflow: ['Create a survey', 'Add questions', 'Publish to an audience', 'Review responses and scores'],
    aliases: ['survey', 'feedback', 'csat', 'nps', 'questionnaire', 'form'], related: ['contacts', 'analytics'], navigation: { app: 'surveys' },
  },
  {
    id: 'social_marketing', category: 'Marketing', title: 'Social Marketing',
    description: 'Compose and schedule posts across connected social channels and monitor engagement.',
    features: ['Connected accounts', 'Post composer', 'Multi-channel scheduling', 'Engagement metrics'],
    subviews: ['Content calendar', 'Compose post', 'Connected accounts'],
    workflow: ['Connect an account', 'Compose content', 'Choose channels', 'Schedule and review engagement'],
    aliases: ['social', 'social media', 'post scheduling', 'linkedin post', 'facebook post', 'content calendar'], related: ['calendar', 'analytics'], navigation: { app: 'social' },
  },
  {
    id: 'contacts', category: 'Platform', title: 'Contacts',
    description: 'Maintain shared customer, vendor, partner, lead, and investor records for connected workflows.',
    features: ['Contact directory', 'Business roles', 'Company details', 'Balances and status'],
    subviews: ['Contacts', 'Contact detail'],
    workflow: ['Add a contact', 'Assign business roles', 'Maintain company details', 'Use the record in connected apps'],
    aliases: ['contact', 'crm', 'customer', 'vendor', 'partner', 'lead'], related: ['invoicing', 'sign', 'email_marketing'], navigation: { app: 'contacts' },
  },
  {
    id: 'documents', category: 'Platform', title: 'Documents',
    description: 'Organize, categorize, search, and retrieve secure workspace files and supporting records.',
    features: ['Document vault', 'Categories', 'Search', 'Version-oriented organization'],
    subviews: ['Document vault', 'Search'],
    workflow: ['Add a document', 'Choose a category', 'Maintain its details', 'Search and open it later'],
    aliases: ['document', 'file', 'vault', 'folder', 'document search', 'files'], related: ['sign', 'expenses'], navigation: { app: 'documents' },
  },
  {
    id: 'calendar', category: 'Platform', title: 'Calendar',
    description: 'See dates and events generated across workspace workflows in one shared schedule.',
    features: ['Cross-app events', 'Event creation', 'Dates and times', 'Source-module context'],
    subviews: ['Calendar'],
    workflow: ['Create or receive an event', 'Review the shared schedule', 'Open the related workflow', 'Keep dates current'],
    aliases: ['event', 'schedule', 'meeting', 'dates', 'workspace calendar'], related: ['time_off', 'recruitment', 'marketing'], navigation: { app: 'calendar' },
  },
  {
    id: 'approvals', category: 'Platform', title: 'Approvals',
    description: 'Review business decisions waiting across expenses, leave, payroll, recruitment, Sign, and ESG.',
    features: ['Pending queue', 'Source-module context', 'Decision status', 'Cross-app visibility'],
    subviews: ['Approval center'],
    workflow: ['Open the pending queue', 'Review the source record', 'Confirm permissions', 'Approve or reject in its owning app'],
    aliases: ['approval', 'pending approval', 'needs approval', 'review queue', 'decision'], related: ['expenses', 'time_off', 'payroll'], navigation: { app: 'approvals' },
  },
  {
    id: 'analytics', category: 'Platform', title: 'Analytics',
    description: 'Explore record-based trends and operating metrics across enabled NextAura services.',
    features: ['Cross-app metrics', 'Operational trends', 'Executive summaries', 'Source-record navigation'],
    subviews: ['Analytics center'],
    workflow: ['Choose a business area', 'Review available metrics', 'Inspect a trend', 'Return to source records for action'],
    aliases: ['reporting', 'reports', 'metrics', 'insights', 'dashboard', 'business intelligence'], related: ['invoicing', 'employees', 'marketing'], navigation: { app: 'analytics' },
  },
  {
    id: 'home', category: 'Product', title: 'Home', description: 'See a concise workspace overview, recent activity, enabled services, and items needing attention.',
    features: ['Workspace overview', 'Recent activity', 'Needs attention', 'Category explanations'], subviews: ['Workspace Home'],
    workflow: ['Open Home', 'Review attention items', 'Continue into an enabled app'], aliases: ['workspace home', 'homepage', 'overview'], related: ['my_apps', 'all_apps'], navigation: { app: 'home' },
  },
  {
    id: 'my_apps', category: 'Product', title: 'My Apps', description: 'Open only the services enabled for the current workspace.',
    features: ['Enabled app cards', 'Personalized catalog', 'Direct app access', 'Service status'], subviews: ['My Apps'],
    workflow: ['Open My Apps', 'Choose an enabled service', 'Continue to its default view'], aliases: ['my apps', 'enabled apps', 'active apps', 'apps i have'], related: ['all_apps', 'services'], navigation: { app: 'launchpad' },
  },
  {
    id: 'all_apps', category: 'Product', title: 'All Apps', description: 'Browse the complete NextAura service catalog and distinguish active services from available additions.',
    features: ['Complete catalog', 'Category browsing', 'Active status', 'Add-service guidance'], subviews: ['All Apps'],
    workflow: ['Browse by category', 'Open an active app', 'Learn about a disabled app', 'Request service activation'], aliases: ['all apps', 'app catalog', 'available apps', 'browse apps'], related: ['my_apps', 'service_selection'], navigation: { app: 'launchpad' },
  },
  {
    id: 'pricing', category: 'Product', title: 'Pricing', description: 'Compare One App Free, Standard, and Custom plans on monthly or annual billing.',
    features: ['One App Free', 'Standard', 'Custom', 'Monthly and yearly billing'], subviews: ['Pricing'],
    workflow: ['Open Pricing', 'Choose a billing cycle', 'Compare plan scope', 'Continue to a controlled next step'], aliases: ['price', 'plans', 'standard plan', 'custom plan', 'free plan', 'subscription'], related: ['services'], navigation: { app: 'pricing' },
  },
  {
    id: 'services', category: 'Product', title: 'Services', description: 'Represent the finance, people, marketing, and platform applications available to a workspace.',
    features: ['Service catalog', 'Workspace entitlements', 'Active status', 'Category grouping'], subviews: ['My Apps', 'All Apps', 'Add services'],
    workflow: ['Browse services', 'Review whether each is active', 'Request or select services', 'Open an enabled app'], aliases: ['service', 'apps', 'modules', 'entitlements'], related: ['my_apps', 'all_apps'], navigation: { app: 'launchpad' },
  },
  {
    id: 'workspaces', category: 'Product', title: 'Workspaces & Organizations', description: 'Keep each company in an isolated tenant with its own members, records, services, and settings.',
    features: ['Tenant isolation', 'Workspace switcher', 'Memberships', 'Independent service entitlements'], subviews: ['Workspace switcher', 'Settings'],
    workflow: ['Join or create a workspace', 'Select the active workspace', 'Work inside its tenant boundary', 'Switch deliberately when needed'], aliases: ['workspace', 'tenant', 'switch workspace', 'business workspace'], related: ['organizations', 'roles', 'permissions'], navigation: { app: 'settings' },
  },
  {
    id: 'organizations', category: 'Product', title: 'Organizations', description: 'Store the legal and operating identity behind each isolated NextAura workspace.',
    features: ['Organization profile', 'Legal and tax details', 'Base currency', 'Country and timezone'], subviews: ['Organization settings', 'Workspace switcher'],
    workflow: ['Create or join an organization', 'Complete its profile', 'Choose its active services', 'Invite members with appropriate roles'], aliases: ['organization', 'organisation', 'company', 'business entity', 'legal entity'], related: ['workspaces', 'roles', 'settings'], navigation: { app: 'settings' },
  },
  {
    id: 'roles', category: 'Product', title: 'Roles', description: 'Describe a member’s responsibilities and contribute to what data and actions are available.',
    features: ['Membership role', 'Module responsibility', 'Role-aware views', 'Server-side checks'], subviews: ['Settings'],
    workflow: ['Open workspace settings', 'Review the membership', 'Assign the appropriate role', 'Re-authenticate if claims need refreshing'], aliases: ['role', 'member role', 'admin', 'manager'], related: ['permissions', 'workspaces'], navigation: { app: 'settings' },
  },
  {
    id: 'permissions', category: 'Product', title: 'Permissions', description: 'Protect workspace data through membership validation, role rules, and row-level security.',
    features: ['Membership validation', 'Role checks', 'Tenant-scoped RLS', 'Protected actions'], subviews: ['Settings'],
    workflow: ['Authenticate', 'Select an authorized workspace', 'Pass membership and role checks', 'Access only permitted records'], aliases: ['permission', 'access', 'security', 'rls', 'authorization'], related: ['roles', 'workspaces'], navigation: { app: 'settings' },
  },
  {
    id: 'service_selection', category: 'Product', title: 'Service Selection', description: 'Choose the applications a workspace needs during onboarding or later service management.',
    features: ['Category selection', 'Service activation', 'Workspace entitlements', 'Controlled confirmation'], subviews: ['Add services'],
    workflow: ['Open service selection', 'Choose services', 'Confirm activation', 'Return to the app catalog'], aliases: ['select services', 'add services', 'activate app', 'enable app', 'onboarding apps'], related: ['services', 'all_apps'], navigation: { app: 'settings', subView: 'services' },
  },
  {
    id: 'authentication', category: 'Product', title: 'Authentication', description: 'Sign users into NextAura with email and password or Google before workspace access is evaluated.',
    features: ['Email sign-in', 'Google OAuth', 'Persistent session', 'Protected workspace boot'], subviews: ['Sign in'],
    workflow: ['Choose a sign-in method', 'Authenticate with Supabase', 'Complete NextAura verification', 'Load the authorized workspace'], aliases: ['auth', 'login', 'log in', 'sign in', 'google login'], related: ['otp', 'permissions'], navigation: { app: 'auth' },
  },
  {
    id: 'otp', category: 'Product', title: 'NextAura OTP', description: 'Add a six-digit verification step to the authenticated session before workspace access.',
    features: ['Six-digit code', 'Session binding', 'Resend controls', 'Server-side verification'], subviews: ['Verification'],
    workflow: ['Request the code', 'Open the verified email inbox', 'Enter six digits', 'Continue into the workspace'], aliases: ['verification code', 'six digit code', '2fa', 'email code', 'one time password'], related: ['authentication'], navigation: { app: 'auth' },
  },
  {
    id: 'settings', category: 'Product', title: 'Settings', description: 'Manage workspace profile, organization preferences, services, account options, and plan information.',
    features: ['Organization settings', 'Service management', 'Account preferences', 'Plan information'], subviews: ['Settings', 'Services'],
    workflow: ['Open Settings', 'Choose the relevant section', 'Review current values', 'Save an authorized change'], aliases: ['setting', 'preferences', 'configuration', 'account settings'], related: ['workspaces', 'services', 'pricing'], navigation: { app: 'settings' },
  },
  {
    id: 'nextaura', category: 'Product', title: 'NextAura', description: 'A unified business operating system connecting finance, people, marketing, and shared platform workflows.',
    features: ['Modular business apps', 'One workspace context', 'Tenant isolation', 'Cross-app workflows', 'NextAura AI assistance'], subviews: ['Home', 'My Apps', 'All Apps', 'Pricing', 'NextAura AI'],
    workflow: ['Sign in securely', 'Choose a workspace', 'Open enabled services', 'Complete connected business workflows'], aliases: ['next aura', 'business operating system', 'business os', 'platform'], related: ['home', 'services', 'workspaces'], navigation: { app: 'home' },
  },
];

export const NEXTAURA_KNOWLEDGE: KnowledgeEntry[] = catalog.map(enrich);
export const KNOWLEDGE_BY_ID = new Map(NEXTAURA_KNOWLEDGE.map((item) => [item.id, item]));

export const APP_TO_KNOWLEDGE_ID: Record<string, string> = {
  launchpad: 'my_apps', home: 'home', invoicing: 'invoicing', accounting: 'accounting', expenses: 'expenses',
  sign: 'sign', equity: 'equity', esg: 'esg', hr: 'employees', employees: 'employees', attendance: 'attendance',
  recruitment: 'recruitment', 'time-off': 'time_off', appraisals: 'appraisals', fleet: 'fleet', payroll: 'payroll',
  marketing: 'email_marketing', email: 'email_marketing', sms: 'sms_marketing', surveys: 'surveys', social: 'social_marketing',
  calendar: 'calendar', approvals: 'approvals', contacts: 'contacts', documents: 'documents', analytics: 'analytics',
  pricing: 'pricing', settings: 'settings', auth: 'authentication', ai: 'nextaura',
};

export const SERVICE_TO_ENTITLEMENT: Record<string, string> = {
  invoicing: 'invoicing', accounting: 'accounting', expenses: 'expenses', sign: 'sign', equity: 'equity', esg: 'esg',
  employees: 'employees', organization_chart: 'employees', attendance: 'attendance', recruitment: 'recruitment', time_off: 'time_off',
  appraisals: 'appraisals', fleet: 'fleet', payroll: 'payroll', email_marketing: 'email_marketing', sms_marketing: 'sms_marketing',
  surveys: 'surveys', social_marketing: 'social_marketing', contacts: 'contacts', documents: 'documents', analytics: 'analytics',
};

export const TOTAL_KNOWLEDGE_PATTERNS = NEXTAURA_KNOWLEDGE.reduce((total, item) => total + item.patterns.length, 0);
