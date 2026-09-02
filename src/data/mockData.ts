import type {
  Organization,
  User,
  Invoice,
  Customer,
  Account,
  JournalEntry,
  BankTransaction,
  Expense,
  CorporateCard,
  SignDocument,
  Shareholder,
  OptionGrant,
  ESGMetric,
  CarbonActivity,
  ESGInitiative,
  Contact,
  NotificationItem,
  AuditLogItem,
  // HR Types
  Employee,
  Department,
  JobPosition,
  AttendanceRecord,
  JobOpening,
  Candidate,
  Interview,
  JobOffer,
  TimeOffRequest,
  Appraisal,
  EmployeeGoal,
  Vehicle,
  VehicleMaintenance,
  PayrollRun,
  Payslip,
  // Marketing Types
  EmailCampaign,
  EmailTemplate,
  SMSCampaign,
  Survey,
  SocialAccount,
  SocialPost,
  // Global
  CalendarEvent,
  GlobalApprovalItem,
} from '../types';

export const initialOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'NextAura AI',
    legalName: 'NextAura Technologies Inc.',
    logo: '⚡',
    taxId: 'US-984210948',
    registrationNumber: 'DEL-2024-8831',
    baseCurrency: 'USD',
    country: 'United States',
    address: '100 Montgomery St, Suite 2400, San Francisco, CA 94104',
    fiscalYearEnd: 'December 31',
  },
  {
    id: 'org-2',
    name: 'Al Kamal Group',
    legalName: 'Al Kamal General Trading & Restaurants LLC',
    logo: '💎',
    taxId: 'JO-1194827',
    registrationNumber: 'AMM-2021-492',
    baseCurrency: 'JOD',
    country: 'Jordan',
    address: 'Zahran Street, Building 45, Amman, Jordan',
    fiscalYearEnd: 'December 31',
  },
  {
    id: 'org-3',
    name: 'Arzana Arabia',
    legalName: 'Arzana Arabia Investments Holding',
    logo: '🌐',
    taxId: 'SA-300482910',
    registrationNumber: 'RUH-2023-1104',
    baseCurrency: 'SAR',
    country: 'Saudi Arabia',
    address: 'King Fahd Road, Olaya District, Riyadh, KSA',
    fiscalYearEnd: 'December 31',
  },
];

export const currentUser: User = {
  id: 'usr-1',
  name: 'Mohannad Abuayyash',
  email: 'mohannad@nextaura.ai',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'Owner',
  department: 'Executive Office',
  status: 'Active',
  lastActive: 'Just now',
};

export const initialTeam: User[] = [
  currentUser,
  {
    id: 'usr-2',
    name: 'Sarah Chen',
    email: 'sarah.chen@nextaura.ai',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    role: 'Finance Manager',
    department: 'Finance',
    status: 'Active',
    lastActive: '12m ago',
  },
  {
    id: 'usr-3',
    name: 'Alex Rivera',
    email: 'alex.rivera@nextaura.ai',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'Accountant',
    department: 'Accounting',
    status: 'Active',
    lastActive: '1h ago',
  },
  {
    id: 'usr-4',
    name: 'Farah Al-Hassan',
    email: 'farah@arzana.sa',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'Legal',
    department: 'Legal & Compliance',
    status: 'Active',
    lastActive: '3h ago',
  },
  {
    id: 'usr-5',
    name: 'Moayad Mansour',
    email: 'moayad@alkamal.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'Investor Viewer',
    department: 'Board Member',
    status: 'Active',
    lastActive: 'Yesterday',
  },
];

// Preserved Finance Data
export const initialCustomers: Customer[] = [
  { id: 'cust-1', name: 'Arzana Arabia LLC', company: 'Arzana Arabia Group', email: 'billing@arzana.sa', phone: '+966 11 482 9900', taxId: 'SA-300482910', address: 'Riyadh Financial District, KSA', currency: 'USD', lifetimeRevenue: 142500, outstandingBalance: 18420, avgPaymentDays: 14, invoicesCount: 12 },
  { id: 'cust-2', name: 'Al Kamal Restaurant', company: 'Al Kamal Food Industries', email: 'accounts@alkamal.com', phone: '+962 6 580 1200', taxId: 'JO-1194827', address: 'Amman City Center, Jordan', currency: 'USD', lifetimeRevenue: 98000, outstandingBalance: 8450, avgPaymentDays: 19, invoicesCount: 9 },
  { id: 'cust-3', name: 'Vertex Technologies', company: 'Vertex Systems Inc', email: 'pay@vertex.io', phone: '+1 415 892 1042', taxId: 'US-8839201', address: 'Palo Alto, CA, USA', currency: 'USD', lifetimeRevenue: 230000, outstandingBalance: 0, avgPaymentDays: 7, invoicesCount: 18 },
  { id: 'cust-4', name: 'Nova Health Systems', company: 'Nova Healthcare Corp', email: 'finance@novahealth.org', phone: '+1 617 392 0019', taxId: 'US-7718290', address: 'Boston, MA, USA', currency: 'USD', lifetimeRevenue: 64000, outstandingBalance: 4550, avgPaymentDays: 28, invoicesCount: 6 },
  { id: 'cust-5', name: 'Atlas Construction Group', company: 'Atlas Build Ltd', email: 'invoices@atlasbuild.co.uk', phone: '+44 20 7946 0912', taxId: 'GB-9920192', address: 'London, EC2N 2DB, UK', currency: 'GBP', lifetimeRevenue: 112000, outstandingBalance: 0, avgPaymentDays: 21, invoicesCount: 8 },
];

export const initialInvoices: Invoice[] = [
  { id: 'inv-101', number: 'INV-2026-0042', customerId: 'cust-1', customerName: 'Arzana Arabia LLC', customerEmail: 'billing@arzana.sa', issueDate: '2026-08-15', dueDate: '2026-09-15', status: 'Sent', currency: 'USD', subtotal: 16000, taxTotal: 2400, discountTotal: 0, total: 18420, amountPaid: 0, amountDue: 18420, paymentTerms: 'Net 30', notes: 'Enterprise SaaS Annual License & AI Suite Integration.', items: [{ id: 'itm-1', description: 'NextAura Enterprise License (100 seats)', quantity: 1, unitPrice: 12000, taxRate: 15, discount: 0, amount: 12000 }, { id: 'itm-2', description: 'Custom Data Pipeline & API Integration', quantity: 1, unitPrice: 4000, taxRate: 15, discount: 0, amount: 4000 }], createdAt: '2026-08-15T10:00:00Z' },
  { id: 'inv-102', number: 'INV-2026-0041', customerId: 'cust-2', customerName: 'Al Kamal Restaurant', customerEmail: 'accounts@alkamal.com', issueDate: '2026-07-20', dueDate: '2026-08-20', status: 'Overdue', currency: 'USD', subtotal: 7500, taxTotal: 950, discountTotal: 0, total: 8450, amountPaid: 0, amountDue: 8450, paymentTerms: 'Net 30', notes: 'POS Accounting Sync & Inventory Module.', items: [{ id: 'itm-3', description: 'Accounting Core & POS Gateway', quantity: 1, unitPrice: 7500, taxRate: 12.67, discount: 0, amount: 7500 }], createdAt: '2026-07-20T14:30:00Z' },
  { id: 'inv-103', number: 'INV-2026-0040', customerId: 'cust-3', customerName: 'Vertex Technologies', customerEmail: 'pay@vertex.io', issueDate: '2026-08-01', dueDate: '2026-08-15', status: 'Paid', currency: 'USD', subtotal: 28000, taxTotal: 0, discountTotal: 1000, total: 27000, amountPaid: 27000, amountDue: 0, paymentTerms: 'Net 15', notes: 'Payment received via Wire Transfer #WT-882190.', items: [{ id: 'itm-4', description: 'Custom Financial Engine Deployment', quantity: 1, unitPrice: 28000, taxRate: 0, discount: 1000, amount: 27000 }], createdAt: '2026-08-01T09:15:00Z' },
];

export const initialAccounts: Account[] = [
  { id: 'acc-1000', code: '1000', name: 'Silicon Valley Bank - Main Operating', category: 'Assets', type: 'Bank', balance: 142850, currency: 'USD', isBank: true },
  { id: 'acc-1050', code: '1050', name: 'Stripe Merchant Cash Account', category: 'Assets', type: 'Bank', balance: 41770, currency: 'USD', isBank: true },
  { id: 'acc-1100', code: '1100', name: 'Accounts Receivable (AR)', category: 'Assets', type: 'Current Asset', balance: 31420, currency: 'USD' },
  { id: 'acc-2000', code: '2000', name: 'Accounts Payable (AP)', category: 'Liabilities', type: 'Current Liability', balance: 14280, currency: 'USD' },
  { id: 'acc-3000', code: '3000', name: 'Common Stock Equity', category: 'Equity', type: 'Equity', balance: 100000, currency: 'USD' },
  { id: 'acc-4000', code: '4000', name: 'SaaS Subscription Revenue', category: 'Revenue', type: 'Revenue', balance: 74500, currency: 'USD' },
  { id: 'acc-6000', code: '6000', name: 'Salaries & Payroll Expense', category: 'Expenses', type: 'Operating Expense', balance: 148420, currency: 'USD' },
];

export const initialJournalEntries: JournalEntry[] = [
  { id: 'je-1', entryNumber: 'JE-2026-0089', date: '2026-08-30', reference: 'PAY-88190', description: 'Received customer payment from Vertex Technologies', status: 'Posted', postedBy: 'Alex Rivera', totalDebit: 27000, totalCredit: 27000, lines: [{ id: 'jel-1', accountId: 'acc-1000', accountCode: '1000', accountName: 'Silicon Valley Bank - Main Operating', description: 'Wire payment for INV-0040', debit: 27000, credit: 0 }, { id: 'jel-2', accountId: 'acc-1100', accountCode: '1100', accountName: 'Accounts Receivable (AR)', description: 'Clear AR for Vertex Technologies', debit: 0, credit: 27000 }] },
];

export const initialBankTransactions: BankTransaction[] = [
  { id: 'bt-1', bankAccountId: 'acc-1000', date: '2026-09-01', description: 'Adobe Creative Cloud Subscription', amount: -54.99, payee: 'Adobe Systems Inc', status: 'Suggested', suggestedMatch: { accountId: 'acc-6100', accountName: '6100 — Software Subscriptions', confidence: 98, reason: 'Matched historical vendor rule' } },
];

export const initialExpenses: Expense[] = [
  { id: 'exp-1', employeeId: 'usr-2', employeeName: 'Sarah Chen', employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', title: 'Client Dinner & Advisory Meeting', merchant: 'STK Steakhouse San Francisco', date: '2026-08-29', category: 'Meals & Entertainment', amount: 142.50, currency: 'USD', status: 'Manager Review', paymentMethod: 'Personal Cash/Card', policyViolations: ['Meal expense exceeds $100 per-person cap'], notes: 'Discussed Q4 expansion with Arzana Arabia executive team.' },
];

export const initialCards: CorporateCard[] = [
  { id: 'crd-1', cardNumber: '•••• •••• •••• 4920', cardHolder: 'Mohannad Abuayyash', expiry: '08/28', type: 'Physical', monthlyLimit: 25000, currentSpend: 6420, status: 'Active' },
  { id: 'crd-2', cardNumber: '•••• •••• •••• 8812', cardHolder: 'Sarah Chen', expiry: '11/27', type: 'Virtual', monthlyLimit: 10000, currentSpend: 2310, status: 'Active' },
];

export const initialSignDocuments: SignDocument[] = [
  { id: 'doc-1', title: 'Series A Investor Rights Agreement', fileName: 'Series_A_Investor_Rights_v3.pdf', fileSize: '2.4 MB', status: 'Partially Signed', createdAt: '2026-08-25', sentAt: '2026-08-25', recipients: [{ id: 'rec-1', name: 'Mohannad Abuayyash', email: 'mohannad@nextaura.ai', role: 'Signer', status: 'Signed', signedAt: '2026-08-26 14:20' }, { id: 'rec-2', name: 'Farah Al-Hassan', email: 'farah@arzana.sa', role: 'Signer', status: 'Viewed' }], fields: [], auditTrail: [] },
];

export const initialShareholders: Shareholder[] = [
  { id: 'sh-1', name: 'Mohannad Abuayyash', email: 'mohannad@nextaura.ai', type: 'Founder', shareClass: 'Common A', sharesCount: 4500000, ownershipPercentage: 45.0, totalInvestment: 150000, issueDate: '2024-01-15' },
  { id: 'sh-2', name: 'Moayad Mansour', email: 'moayad@alkamal.com', type: 'Founder', shareClass: 'Common A', sharesCount: 2500000, ownershipPercentage: 25.0, totalInvestment: 100000, issueDate: '2024-01-15' },
  { id: 'sh-3', name: 'Arzana Arabia Ventures', email: 'cap@arzana.sa', type: 'Investor', shareClass: 'Preferred Series A', sharesCount: 1800000, ownershipPercentage: 18.0, totalInvestment: 3500000, issueDate: '2025-06-01' },
];

export const initialOptionGrants: OptionGrant[] = [
  { id: 'grant-1', employeeName: 'Sarah Chen', role: 'VP of Finance', grantedCount: 250000, strikePrice: 0.25, grantDate: '2024-09-01', vestingStartDate: '2024-09-01', vestedCount: 125000, cliffDate: '2025-09-01', vestingTermYears: 4 },
];

export const initialESGMetrics: ESGMetric[] = [
  { category: 'Environmental', name: 'Carbon Intensity (CO2e / $1M Rev)', currentValue: 12.4, targetValue: 10.0, unit: 'Tons', trend: 'down', status: 'On Track' },
  { category: 'Social', name: 'Gender Diversity in Tech & Ops', currentValue: 44, targetValue: 50, unit: '%', trend: 'up', status: 'On Track' },
];

export const initialCarbonActivities: CarbonActivity[] = [
  { id: 'ca-1', activityType: 'AWS & Cloud Data Center Electricity', scope: 'Scope 2', quantity: 48200, unit: 'kWh', co2eTons: 18.2, date: '2026-08-30' },
];

export const initialESGInitiatives: ESGInitiative[] = [
  { id: 'esgi-1', title: 'Transition Cloud Workloads to 100% Carbon-Free AWS Regions', category: 'Environment', owner: 'Engineering Team', targetDate: '2026-12-31', progress: 85, status: 'In Progress' },
];

// ==========================================
// HUMAN RESOURCES MOCK DATA (NEW)
// ==========================================

export const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    employeeNumber: 'EMP-001',
    name: 'Mohannad Abuayyash',
    email: 'mohannad@nextaura.ai',
    phone: '+1 415 901 8820',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    jobTitle: 'Founder & CEO',
    department: 'Executive Office',
    workLocation: 'San Francisco HQ',
    startDate: '2024-01-15',
    employmentType: 'Full-time',
    status: 'Active',
    baseSalary: 18000,
    payFrequency: 'Monthly',
    skills: [
      { name: 'Enterprise Architecture', level: 'Expert' },
      { name: 'AI & Data Engineering', level: 'Expert' },
      { name: 'Executive Leadership', level: 'Expert' },
    ],
    privateDetails: {
      legalName: 'Mohannad Abuayyash',
      personalEmail: 'mabua@example.com',
      personalPhone: '+1 415 901 8820',
      address: '100 Montgomery St, San Francisco, CA',
      dob: '1992-04-12',
      nationality: 'Jordanian',
      emergencyContact: 'Family Member',
      emergencyPhone: '+1 415 999 0000',
    },
    equipment: [
      { id: 'eq-1', assetName: 'MacBook Pro M3 Max 16"', serialNumber: 'MBP-2024-8891', assignedDate: '2024-01-15', status: 'Assigned' },
      { id: 'eq-2', assetName: 'Pro Display XDR 32"', serialNumber: 'XDR-9921', assignedDate: '2024-01-15', status: 'Assigned' },
    ],
    onboardingProgress: 100,
  },
  {
    id: 'emp-2',
    employeeNumber: 'EMP-002',
    name: 'Moayad Mansour',
    email: 'moayad@alkamal.com',
    phone: '+962 7 9123 4567',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    jobTitle: 'Co-Founder & Technical Lead',
    department: 'Engineering',
    workLocation: 'Amman Tech Hub',
    startDate: '2024-01-15',
    employmentType: 'Full-time',
    status: 'Active',
    baseSalary: 14000,
    payFrequency: 'Monthly',
    skills: [
      { name: 'System Design', level: 'Expert' },
      { name: 'Backend Microservices', level: 'Expert' },
      { name: 'TypeScript', level: 'Advanced' },
    ],
    onboardingProgress: 100,
  },
  {
    id: 'emp-3',
    employeeNumber: 'EMP-003',
    name: 'Sarah Chen',
    email: 'sarah.chen@nextaura.ai',
    phone: '+1 415 882 1092',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    jobTitle: 'VP of Finance & Operations',
    department: 'Finance',
    managerId: 'emp-1',
    managerName: 'Mohannad Abuayyash',
    workLocation: 'San Francisco HQ',
    startDate: '2024-06-01',
    employmentType: 'Full-time',
    status: 'Active',
    baseSalary: 12500,
    payFrequency: 'Monthly',
    skills: [
      { name: 'Financial Planning & Analysis', level: 'Expert' },
      { name: 'GAAP Accounting', level: 'Expert' },
    ],
    onboardingProgress: 100,
  },
  {
    id: 'emp-4',
    employeeNumber: 'EMP-004',
    name: 'Alex Rivera',
    email: 'alex.rivera@nextaura.ai',
    phone: '+1 415 302 9918',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    jobTitle: 'Senior Lead Accountant',
    department: 'Finance',
    managerId: 'emp-3',
    managerName: 'Sarah Chen',
    workLocation: 'San Francisco HQ',
    startDate: '2024-09-01',
    employmentType: 'Full-time',
    status: 'Active',
    baseSalary: 8500,
    payFrequency: 'Monthly',
    skills: [
      { name: 'General Ledger Audit', level: 'Expert' },
      { name: 'Tax Compliance', level: 'Advanced' },
    ],
    onboardingProgress: 100,
  },
  {
    id: 'emp-5',
    employeeNumber: 'EMP-005',
    name: 'Farah Al-Hassan',
    email: 'farah@arzana.sa',
    phone: '+966 50 123 4567',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    jobTitle: 'Head of Legal & Compliance',
    department: 'Legal & Compliance',
    managerId: 'emp-1',
    managerName: 'Mohannad Abuayyash',
    workLocation: 'Riyadh Hub',
    startDate: '2024-11-01',
    employmentType: 'Full-time',
    status: 'Active',
    baseSalary: 11000,
    payFrequency: 'Monthly',
    skills: [
      { name: 'Corporate Contract Law', level: 'Expert' },
      { name: 'Regulatory Compliance', level: 'Expert' },
    ],
    onboardingProgress: 100,
  },
  {
    id: 'emp-6',
    employeeNumber: 'EMP-006',
    name: 'Tariq Al-Mansoor',
    email: 'tariq@nextaura.ai',
    phone: '+966 55 987 6543',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    jobTitle: 'Senior Full Stack Engineer',
    department: 'Engineering',
    managerId: 'emp-2',
    managerName: 'Moayad Mansour',
    workLocation: 'Remote',
    startDate: '2025-02-15',
    employmentType: 'Full-time',
    status: 'Active',
    baseSalary: 9500,
    payFrequency: 'Monthly',
    skills: [
      { name: 'React & Vite', level: 'Expert' },
      { name: 'Node.js Microservices', level: 'Advanced' },
    ],
    onboardingProgress: 100,
  },
  {
    id: 'emp-7',
    employeeNumber: 'EMP-007',
    name: 'Elena Rostova',
    email: 'elena@nextaura.ai',
    phone: '+1 415 771 0022',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    jobTitle: 'Senior Product Designer',
    department: 'Marketing',
    managerId: 'emp-1',
    managerName: 'Mohannad Abuayyash',
    workLocation: 'San Francisco HQ',
    startDate: '2025-03-01',
    employmentType: 'Full-time',
    status: 'Active',
    baseSalary: 9000,
    payFrequency: 'Monthly',
    skills: [
      { name: 'UI/UX Architecture', level: 'Expert' },
      { name: 'Design Systems', level: 'Expert' },
    ],
    onboardingProgress: 100,
  },
];

export const initialDepartments: Department[] = [
  { id: 'dept-1', name: 'Executive Office', managerName: 'Mohannad Abuayyash', employeeCount: 2, openPositions: 1, monthlyPayrollCost: 32000 },
  { id: 'dept-2', name: 'Engineering', managerName: 'Moayad Mansour', employeeCount: 28, openPositions: 4, monthlyPayrollCost: 264000 },
  { id: 'dept-3', name: 'Sales & Growth', managerName: 'Marcus Vance', employeeCount: 18, openPositions: 2, monthlyPayrollCost: 142000 },
  { id: 'dept-4', name: 'Marketing', managerName: 'Elena Rostova', employeeCount: 12, openPositions: 1, monthlyPayrollCost: 98000 },
  { id: 'dept-5', name: 'Finance & Accounting', managerName: 'Sarah Chen', employeeCount: 8, openPositions: 0, monthlyPayrollCost: 68000 },
  { id: 'dept-6', name: 'Human Resources', managerName: 'Noura Al-Sayed', employeeCount: 6, openPositions: 1, monthlyPayrollCost: 45000 },
  { id: 'dept-7', name: 'Operations & Legal', managerName: 'Farah Al-Hassan', employeeCount: 10, openPositions: 0, monthlyPayrollCost: 78000 },
];

export const initialJobPositions: JobPosition[] = [
  { id: 'job-p1', title: 'Senior Full Stack Engineer', department: 'Engineering', reportsTo: 'Technical Lead', employmentType: 'Full-time', description: 'Architect high-throughput enterprise APIs and dynamic frontend modules.', requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'] },
  { id: 'job-p2', title: 'AI Infrastructure Engineer', department: 'Engineering', reportsTo: 'CTO', employmentType: 'Full-time', description: 'Deploy LLM data pipelines and high-speed vector indices.', requiredSkills: ['Python', 'PyTorch', 'Kubernetes', 'AWS'] },
  { id: 'job-p3', title: 'Enterprise Account Executive', department: 'Sales & Growth', reportsTo: 'VP Sales', employmentType: 'Full-time', description: 'Drive SaaS enterprise expansions across EMEA & Americas.', requiredSkills: ['B2B Sales', 'CRM', 'SaaS Negotiations'] },
];

export const initialAttendanceRecords: AttendanceRecord[] = [
  { id: 'att-1', employeeId: 'emp-1', employeeName: 'Mohannad Abuayyash', employeeAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', department: 'Executive Office', date: '2026-09-02', checkIn: '08:30 AM', checkOut: '06:15 PM', breakDurationMins: 45, workedHours: 9.0, expectedHours: 8.0, overtimeHours: 1.0, status: 'Checked Out', locationType: 'Office' },
  { id: 'att-2', employeeId: 'emp-2', employeeName: 'Moayad Mansour', employeeAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', department: 'Engineering', date: '2026-09-02', checkIn: '09:00 AM', breakDurationMins: 30, workedHours: 5.5, expectedHours: 8.0, overtimeHours: 0, status: 'Working', locationType: 'Office' },
  { id: 'att-3', employeeId: 'emp-3', employeeName: 'Sarah Chen', employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', department: 'Finance', date: '2026-09-02', checkIn: '08:45 AM', breakDurationMins: 60, workedHours: 5.75, expectedHours: 8.0, overtimeHours: 0, status: 'Working', locationType: 'Office' },
  { id: 'att-4', employeeId: 'emp-6', employeeName: 'Tariq Al-Mansoor', employeeAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', department: 'Engineering', date: '2026-09-02', checkIn: '09:15 AM', breakDurationMins: 30, workedHours: 5.25, expectedHours: 8.0, overtimeHours: 0, status: 'Remote', locationType: 'Remote' },
];

export const initialJobOpenings: JobOpening[] = [
  { id: 'jo-1', title: 'Senior AI Data Pipeline Engineer', department: 'Engineering', location: 'San Francisco HQ / Remote', employmentType: 'Full-time', hiringManager: 'Moayad Mansour', openingsCount: 2, applicantsCount: 48, salaryRange: '$160k - $210k', status: 'Open', description: 'Scale high-throughput fintech data pipelines.', requirements: ['5+ yrs Python/C++', 'Apache Beam/Kafka', 'PostgreSQL'], createdAt: '2026-08-15' },
  { id: 'jo-2', title: 'Enterprise Product Marketing Manager', department: 'Marketing', location: 'San Francisco HQ', employmentType: 'Full-time', hiringManager: 'Elena Rostova', openingsCount: 1, applicantsCount: 24, salaryRange: '$130k - $160k', status: 'Open', description: 'Drive launch campaigns and customer messaging.', requirements: ['4+ yrs B2B SaaS', 'Campaign Analytics'], createdAt: '2026-08-20' },
];

export const initialCandidates: Candidate[] = [
  { id: 'cand-1', name: 'David Miller', email: 'david.miller@example.com', phone: '+1 415 889 0192', location: 'San Francisco, CA', appliedPositionId: 'jo-1', appliedPositionTitle: 'Senior AI Data Pipeline Engineer', department: 'Engineering', stage: 'Technical Interview', source: 'LinkedIn', rating: 5, appliedDate: '2026-08-22', skills: ['Python', 'PyTorch', 'Kafka', 'Spark'] },
  { id: 'cand-2', name: 'Aisha Al-Nuaimi', email: 'aisha.n@example.sa', phone: '+966 54 112 3344', location: 'Riyadh, KSA', appliedPositionId: 'jo-1', appliedPositionTitle: 'Senior AI Data Pipeline Engineer', department: 'Engineering', stage: 'Final Interview', source: 'Referral', rating: 5, appliedDate: '2026-08-18', skills: ['Data Pipeline', 'Ray', 'PostgreSQL'] },
  { id: 'cand-3', name: 'James Peterson', email: 'j.peterson@example.com', phone: '+1 650 491 8820', location: 'Palo Alto, CA', appliedPositionId: 'jo-2', appliedPositionTitle: 'Enterprise Product Marketing Manager', department: 'Marketing', stage: 'Offer', source: 'Company Website', rating: 4, appliedDate: '2026-08-25', skills: ['Product Marketing', 'Copywriting', 'SEO'] },
];

export const initialInterviews: Interview[] = [
  { id: 'int-1', candidateId: 'cand-1', candidateName: 'David Miller', positionTitle: 'Senior AI Data Pipeline Engineer', type: 'Technical', interviewers: ['Moayad Mansour', 'Tariq Al-Mansoor'], date: '2026-09-04', time: '02:00 PM', location: 'Google Meet / Online Video', notes: 'Evaluate architecture design for vector search clusters.' },
  { id: 'int-2', candidateId: 'cand-2', candidateName: 'Aisha Al-Nuaimi', positionTitle: 'Senior AI Data Pipeline Engineer', type: 'Final', interviewers: ['Mohannad Abuayyash'], date: '2026-09-05', time: '11:00 AM', location: 'San Francisco HQ Boardroom', recommendation: 'Strong Hire' },
];

export const initialJobOffers: JobOffer[] = [
  { id: 'off-1', candidateId: 'cand-3', candidateName: 'James Peterson', positionTitle: 'Enterprise Product Marketing Manager', department: 'Marketing', baseSalary: 145000, startDate: '2026-10-01', status: 'Sent' },
];

export const initialTimeOffRequests: TimeOffRequest[] = [
  { id: 'tor-1', employeeId: 'emp-4', employeeName: 'Alex Rivera', employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', department: 'Finance', leaveType: 'Annual Leave', startDate: '2026-09-12', endDate: '2026-09-16', totalDays: 5, reason: 'Family vacation and rest.', status: 'Pending', createdAt: '2026-09-01' },
  { id: 'tor-2', employeeId: 'emp-6', employeeName: 'Tariq Al-Mansoor', employeeAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', department: 'Engineering', leaveType: 'Sick Leave', startDate: '2026-08-28', endDate: '2026-08-29', totalDays: 2, reason: 'Flu recovery.', status: 'Approved', approvedBy: 'Moayad Mansour', createdAt: '2026-08-28' },
];

export const initialAppraisals: Appraisal[] = [
  { id: 'app-1', employeeId: 'emp-3', employeeName: 'Sarah Chen', employeeAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', jobTitle: 'VP of Finance & Operations', department: 'Finance', managerName: 'Mohannad Abuayyash', cycleTitle: 'Q3 2026 Executive Review', stage: 'Manager Review', overallRating: 4.8, selfRating: 4.7, managerRating: 4.9, goalsOnTrackCount: 4, status: 'In Progress' },
  { id: 'app-2', employeeId: 'emp-4', employeeName: 'Alex Rivera', employeeAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', jobTitle: 'Senior Lead Accountant', department: 'Finance', managerName: 'Sarah Chen', cycleTitle: 'Annual Performance Review 2026', stage: 'Completed', overallRating: 4.5, selfRating: 4.4, managerRating: 4.6, goalsOnTrackCount: 3, status: 'Completed' },
];

export const initialEmployeeGoals: EmployeeGoal[] = [
  { id: 'eg-1', employeeId: 'emp-3', title: 'Automate Month-End Ledger Close to 2 Days', category: 'Finance Architecture', dueDate: '2026-09-30', progress: 85, status: 'On Track' },
  { id: 'eg-2', employeeId: 'emp-2', title: 'Deploy Distributed Vector Indexing Cluster', category: 'Engineering Infrastructure', dueDate: '2026-10-15', progress: 60, status: 'On Track' },
];

export const initialVehicles: Vehicle[] = [
  { id: 'veh-1', name: 'Executive Tesla Model S', make: 'Tesla', model: 'Model S Plaid', year: 2025, licensePlate: 'SF-992-EV', vin: '5YJSA1E28P100298', assignedEmployeeName: 'Mohannad Abuayyash', odometerKm: 14200, monthlyCost: 1250, status: 'Assigned' },
  { id: 'veh-2', name: 'Riyadh Hub Executive Sedan', make: 'Genesis', model: 'G90', year: 2024, licensePlate: 'RUH-4821', vin: 'KMTG941829012', assignedEmployeeName: 'Farah Al-Hassan', odometerKm: 22400, monthlyCost: 980, status: 'Assigned' },
  { id: 'veh-3', name: 'Amman Tech Shuttle Van', make: 'Mercedes-Benz', model: 'Sprinter 2500', year: 2024, licensePlate: 'AMM-7782', vin: 'W1W90663510992', odometerKm: 34100, monthlyCost: 850, status: 'Available' },
];

export const initialVehicleMaintenance: VehicleMaintenance[] = [
  { id: 'vm-1', vehicleId: 'veh-1', vehicleName: 'Executive Tesla Model S', type: 'Tires', date: '2026-08-15', vendor: 'Tesla Service Center SF', cost: 680, odometerKm: 12500, nextServiceDate: '2027-02-15' },
];

export const initialPayrollRuns: PayrollRun[] = [
  { id: 'payrun-1', periodName: 'August 2026 Full Payroll', month: 'August', year: 2026, status: 'Paid', employeeCount: 84, grossPayTotal: 184200, deductionsTotal: 35780, employerCostsTotal: 18420, netPayTotal: 148420, payDate: '2026-08-28' },
  { id: 'payrun-2', periodName: 'September 2026 Regular Payroll', month: 'September', year: 2026, status: 'Review', employeeCount: 84, grossPayTotal: 188500, deductionsTotal: 36200, employerCostsTotal: 18850, netPayTotal: 152300, payDate: '2026-09-28' },
];

export const initialPayslips: Payslip[] = [
  { id: 'ps-1', payrollRunId: 'payrun-1', employeeId: 'emp-3', employeeName: 'Sarah Chen', employeeRole: 'VP of Finance', department: 'Finance', baseSalary: 12500, allowances: [{ name: 'Housing & Travel', amount: 1500 }], overtimePay: 0, bonusPay: 1000, grossPay: 15000, taxDeduction: 2850, insuranceDeduction: 650, netPay: 11500 },
  { id: 'ps-2', payrollRunId: 'payrun-1', employeeId: 'emp-4', employeeName: 'Alex Rivera', employeeRole: 'Senior Lead Accountant', department: 'Finance', baseSalary: 8500, allowances: [{ name: 'Transport', amount: 500 }], overtimePay: 350, bonusPay: 0, grossPay: 9350, taxDeduction: 1680, insuranceDeduction: 420, netPay: 7250 },
];

// ==========================================
// MARKETING MOCK DATA (NEW)
// ==========================================

export const initialEmailCampaigns: EmailCampaign[] = [
  { id: 'ec-1', name: 'Q3 Enterprise Finance Suite Announcement', subject: 'Introducing NextAura: The Unified Business Operating System', senderName: 'Mohannad Abuayyash', senderEmail: 'mohannad@nextaura.ai', targetSegment: 'Enterprise Customers & Leads', recipientCount: 14250, status: 'Sent', sentCount: 14250, deliveryRate: 99.4, openRate: 41.8, clickRate: 8.4, unsubscribeRate: 0.1, scheduledDate: '2026-08-20' },
  { id: 'ec-2', name: 'September Product Roadmap Newsletter', subject: 'What we built this month at NextAura AI', senderName: 'NextAura Product Team', senderEmail: 'newsletter@nextaura.ai', targetSegment: 'All Subscribed Users', recipientCount: 28400, status: 'Scheduled', sentCount: 0, deliveryRate: 0, openRate: 0, clickRate: 0, unsubscribeRate: 0, scheduledDate: '2026-09-08' },
];

export const initialEmailTemplates: EmailTemplate[] = [
  { id: 'tmpl-1', name: 'Modern Product Announcement', subject: 'New Feature Release', category: 'Product Launch', thumbnailUrl: '⚡', htmlContent: '<h1>Welcome</h1>' },
  { id: 'tmpl-2', name: 'Monthly Executive Newsletter', subject: 'Monthly Roundup', category: 'Newsletter', thumbnailUrl: '📰', htmlContent: '<h1>Digest</h1>' },
  { id: 'tmpl-3', name: 'Customer Onboarding Welcome', subject: 'Welcome onboard', category: 'Lifecycle', thumbnailUrl: '👋', htmlContent: '<h1>Greetings</h1>' },
];

export const initialSMSCampaigns: SMSCampaign[] = [
  { id: 'sms-1', name: 'Riyadh FinTech Summit Exclusive Offer', targetSegment: 'Saudi Arabia Enterprise Leads', message: 'Join NextAura AI at Riyadh FinTech Summit. Claim your VIP pass at nextaura.link/riyadh26', status: 'Sent', recipientCount: 1840, sentCount: 1840, deliveryRate: 96.4, clickRate: 14.2, sentDate: '2026-08-25' },
];

export const initialSurveys: Survey[] = [
  { id: 'surv-1', title: 'Q3 Enterprise Customer Satisfaction (CSAT)', category: 'CSAT', questionsCount: 5, responsesCount: 142, completionRate: 94.2, avgScore: 4.8, status: 'Active' },
];

export const initialSocialAccounts: SocialAccount[] = [
  { id: 'soc-acc-1', platform: 'LinkedIn', accountName: 'NextAura AI Corporate', handle: '@nextaura', followersCount: 42800, connectedStatus: 'Connected' },
  { id: 'soc-acc-2', platform: 'Twitter', accountName: '@NextAuraAI', handle: '@nextauraai', followersCount: 18400, connectedStatus: 'Connected' },
  { id: 'soc-acc-3', platform: 'Instagram', accountName: '@nextaura.ai', handle: '@nextaura.ai', followersCount: 9500, connectedStatus: 'Connected' },
];

export const initialSocialPosts: SocialPost[] = [
  { id: 'soc-post-1', content: 'Excited to unveil our upgraded Business Operating System! Manage Finance, HR, Payroll & Marketing from one unified platform. 🚀 #FinTech #SaaS #Enterprise', platforms: ['LinkedIn', 'Twitter'], status: 'Published', scheduledFor: '2026-08-30 10:00 AM', engagement: { likes: 342, comments: 48, shares: 89, clicks: 612 } },
  { id: 'soc-post-2', content: 'Why CFOs are switching from disconnected tools to unified business finance. Read our full whitepaper on NextAura Insights.', platforms: ['LinkedIn'], status: 'Scheduled', scheduledFor: '2026-09-05 09:00 AM', engagement: { likes: 0, comments: 0, shares: 0, clicks: 0 } },
];

// ==========================================
// GLOBAL PLATFORM MOCK DATA (NEW)
// ==========================================

export const initialCalendarEvents: CalendarEvent[] = [
  { id: 'cal-1', title: 'Technical Interview — David Miller', date: '2026-09-04', time: '02:00 PM', module: 'HR', color: '#ec4899', type: 'Interview' },
  { id: 'cal-2', title: 'September Payroll Disbursement', date: '2026-09-28', time: '09:00 AM', module: 'HR', color: '#10b981', type: 'Payroll' },
  { id: 'cal-3', title: 'September Product Newsletter Dispatch', date: '2026-09-08', time: '10:00 AM', module: 'Marketing', color: '#f43f5e', type: 'Campaign' },
  { id: 'cal-4', title: 'Q3 Financial Audit & Board Meeting', date: '2026-09-15', time: '02:00 PM', module: 'Finance', color: '#3b82f6', type: 'Meeting' },
];

export const initialGlobalApprovals: GlobalApprovalItem[] = [
  { id: 'appr-1', module: 'Expenses', title: 'STK Steakhouse Client Dinner ($142.50)', description: 'Client entertainment for Arzana Arabia executive deal', requestedBy: 'Sarah Chen', amount: 142.50, date: '2026-08-29', status: 'Pending', resourceId: 'exp-1' },
  { id: 'appr-2', module: 'Leave', title: 'Annual Leave Request (5 Days)', description: 'Alex Rivera vacation request', requestedBy: 'Alex Rivera', date: '2026-09-01', status: 'Pending', resourceId: 'tor-1' },
  { id: 'appr-3', module: 'Recruitment', title: 'Product Marketing Manager Offer', description: 'Annual base $145,000 + equity option grant', requestedBy: 'James Peterson', amount: 145000, date: '2026-08-30', status: 'Pending', resourceId: 'cand-1' },
];

export const initialContacts: Contact[] = [
  { id: 'cnt-1', name: 'Arzana Arabia LLC', company: 'Arzana Arabia Group', email: 'billing@arzana.sa', phone: '+966 11 482 9900', roles: ['Customer', 'Shareholder', 'Signatory'], totalBusiness: 368420 },
  { id: 'cnt-2', name: 'Al Kamal Restaurant', company: 'Al Kamal Food Corp', email: 'accounts@alkamal.com', phone: '+962 6 580 1200', roles: ['Customer', 'Signatory'], totalBusiness: 106450 },
  { id: 'cnt-3', name: 'Amazon Web Services', company: 'Amazon.com Inc', email: 'aws-billing@amazon.com', phone: '+1 800 300 9981', roles: ['Vendor'], totalBusiness: 48200 },
  { id: 'cnt-4', name: 'Sarah Chen', company: 'NextAura AI', email: 'sarah.chen@nextaura.ai', phone: '+1 415 901 8820', roles: ['Employee', 'Signatory'], totalBusiness: 0 },
];

export const initialNotifications: NotificationItem[] = [
  { id: 'ntf-1', title: 'Invoice Overdue Alert', message: 'INV-2026-0041 for Al Kamal Restaurant ($8,450) is 12 days overdue.', time: '10m ago', read: false, type: 'invoice', linkApp: 'invoicing' },
  { id: 'ntf-2', title: 'Leave Request Pending', message: 'Alex Rivera requested 5 days Annual Leave.', time: '30m ago', read: false, type: 'hr', linkApp: 'time-off' },
  { id: 'ntf-3', title: 'Expense Review Pending', message: 'Sarah Chen submitted expense STK Steakhouse ($142.50).', time: '1h ago', read: false, type: 'expense', linkApp: 'expenses' },
  { id: 'ntf-4', title: 'Email Campaign Sent', message: 'Q3 Enterprise Suite Announcement achieved 41.8% open rate.', time: '3h ago', read: true, type: 'marketing', linkApp: 'email' },
];

export const initialAuditLogs: AuditLogItem[] = [
  { id: 'log-1', timestamp: '2026-09-02 23:45:12', userName: 'Mohannad Abuayyash', userEmail: 'mohannad@nextaura.ai', action: 'CREATE_INVOICE', module: 'Invoicing', details: 'Created draft invoice INV-2026-0042 for $18,420.00', ip: '192.168.1.1' },
  { id: 'log-2', timestamp: '2026-09-02 21:10:05', userName: 'Sarah Chen', userEmail: 'sarah.chen@nextaura.ai', action: 'POST_JOURNAL_ENTRY', module: 'Accounting', details: 'Posted JE-2026-0089 for $27,000.00', ip: '64.233.160.15' },
  { id: 'log-3', timestamp: '2026-09-02 18:30:40', userName: 'Alex Rivera', userEmail: 'alex.rivera@nextaura.ai', action: 'SUBMIT_LEAVE_REQUEST', module: 'Human Resources', details: 'Requested 5 days annual leave for Sep 12-16', ip: '172.56.21.9' },
  { id: 'log-4', timestamp: '2026-09-01 14:15:00', userName: 'Farah Al-Hassan', userEmail: 'farah@arzana.sa', action: 'SIGN_DOCUMENT', module: 'Sign', details: 'Viewed document doc-1 (Investor Rights Agreement)', ip: '212.118.140.2' },
];
