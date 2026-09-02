export type Currency = 'USD' | 'EUR' | 'GBP' | 'JOD' | 'AED' | 'SAR';

export type UserRole = 
  | 'Owner'
  | 'Administrator'
  | 'Finance Manager'
  | 'Accountant'
  | 'Expense Approver'
  | 'HR Manager'
  | 'HR Officer'
  | 'Recruiter'
  | 'Payroll Manager'
  | 'Marketing Manager'
  | 'Marketing Specialist'
  | 'Content Manager'
  | 'Employee'
  | 'Manager'
  | 'Legal'
  | 'ESG Manager'
  | 'Investor Viewer'
  | 'Read Only';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  department?: string;
  status: 'Active' | 'Inactive' | 'Invited';
  lastActive: string;
}

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  logo: string;
  taxId: string;
  registrationNumber: string;
  baseCurrency: Currency;
  country: string;
  address: string;
  fiscalYearEnd: string;
}

// ==========================================
// FINANCE DOMAIN TYPES (Preserved 100%)
// ==========================================

export type InvoiceStatus = 'Draft' | 'Sent' | 'Viewed' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  currency: Currency;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  paymentTerms: string;
  notes?: string;
  recurringSchedule?: 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly' | 'None';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  taxId: string;
  address: string;
  currency: Currency;
  lifetimeRevenue: number;
  outstandingBalance: number;
  avgPaymentDays: number;
  invoicesCount: number;
}

// Global Platform Models
export interface Contact {
  id: string;
  name: string;
  type?: 'Customer' | 'Vendor' | 'Partner' | 'Shareholder';
  email: string;
  phone: string;
  companyName?: string;
  company?: string;
  roles?: ('Customer' | 'Vendor' | 'Shareholder' | 'Signatory' | 'Lead' | 'Employee')[];
  totalBusiness?: number;
  city?: string;
  country?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'Leave' | 'Payroll' | 'Review' | 'Meeting' | 'Campaign' | 'E-Sign Expiry' | 'Interview' | 'Time Off' | 'Appraisal';
  module: string;
  color: string;
  description?: string;
  attendeesCount?: number;
}

export interface GlobalApprovalItem {
  id: string;
  title: string;
  description?: string;
  amount?: number;
  module: 'Expenses' | 'Leave' | 'Payroll' | 'Recruitment' | 'Sign' | 'ESG';
  requestedBy: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  resourceId: string;
}

export type AccountCategory = 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Expenses';

export interface Account {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  type: string;
  balance: number;
  currency: Currency;
  isBank?: boolean;
}

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  costCenter?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  reference: string;
  description: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  postedBy: string;
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  date: string;
  description: string;
  amount: number;
  payee: string;
  status: 'Unmatched' | 'Suggested' | 'Matched' | 'Reconciled';
  suggestedMatch?: {
    accountName: string;
    accountId: string;
    confidence: number;
    reason: string;
  };
}

export type ExpenseStatus = 'Draft' | 'Submitted' | 'Manager Review' | 'Approved' | 'Rejected' | 'Reimbursed';

export interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  title: string;
  merchant: string;
  date: string;
  category: string;
  amount: number;
  currency: Currency;
  status: ExpenseStatus;
  paymentMethod: 'Personal Cash/Card' | 'Corporate Card';
  receiptUrl?: string;
  policyViolations?: string[];
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface CorporateCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  type: 'Virtual' | 'Physical';
  monthlyLimit: number;
  currentSpend: number;
  status: 'Active' | 'Frozen';
}

export type DocumentStatus = 'Draft' | 'Sent' | 'Viewed' | 'Partially Signed' | 'Completed' | 'Declined' | 'Expired';

export interface SignRecipient {
  id: string;
  name: string;
  email: string;
  role: 'Signer' | 'Approver' | 'Viewer';
  status: 'Pending' | 'Sent' | 'Viewed' | 'Signed';
  signedAt?: string;
}

export interface SignField {
  id: string;
  type: 'Signature' | 'Initials' | 'Date' | 'Text' | 'Checkbox';
  recipientId: string;
  page: number;
  x: number;
  y: number;
  value?: string;
}

export interface SignDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  status: DocumentStatus;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  recipients: SignRecipient[];
  fields: SignField[];
  auditTrail: {
    timestamp: string;
    action: string;
    actor: string;
    ip: string;
  }[];
}

export interface Shareholder {
  id: string;
  name: string;
  email: string;
  type: 'Founder' | 'Investor' | 'Employee' | 'Advisor';
  shareClass: 'Common A' | 'Preferred Series A' | 'Options Pool';
  sharesCount: number;
  ownershipPercentage: number;
  totalInvestment: number;
  issueDate: string;
}

export interface OptionGrant {
  id: string;
  employeeName: string;
  role: string;
  grantedCount: number;
  strikePrice: number;
  grantDate: string;
  vestingStartDate: string;
  vestedCount: number;
  cliffDate: string;
  vestingTermYears: number;
}

export interface ESGMetric {
  category: 'Environmental' | 'Social' | 'Governance';
  name: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
  status: 'On Track' | 'Needs Attention' | 'Exceeded';
}

export interface CarbonActivity {
  id: string;
  activityType: string;
  scope: 'Scope 1' | 'Scope 2' | 'Scope 3';
  quantity: number;
  unit: string;
  co2eTons: number;
  date: string;
}

export interface ESGInitiative {
  id: string;
  title: string;
  category: 'Environment' | 'Social' | 'Governance';
  owner: string;
  targetDate: string;
  progress: number;
  status: 'In Progress' | 'Completed' | 'Planned';
}

// ==========================================
// HUMAN RESOURCES DOMAIN TYPES (NEW)
// ==========================================

export type EmploymentType = 'Full-time' | 'Part-time' | 'Contractor' | 'Intern' | 'Temporary';
export type EmployeeStatus = 'Active' | 'On Leave' | 'Probation' | 'Remote' | 'Suspended' | 'Terminated';

export interface EmployeeSkill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface EmployeePrivateDetails {
  legalName: string;
  personalEmail: string;
  personalPhone: string;
  address: string;
  dob: string;
  nationality: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export interface EmployeeEquipment {
  id: string;
  assetName: string;
  serialNumber: string;
  assignedDate: string;
  status: 'Assigned' | 'Returned' | 'In Maintenance';
}

export interface Employee {
  id: string;
  employeeNumber: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  jobTitle: string;
  department: string;
  managerId?: string;
  managerName?: string;
  workLocation: string;
  startDate: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  baseSalary: number;
  payFrequency: 'Monthly' | 'Bi-Weekly' | 'Weekly';
  skills: EmployeeSkill[];
  privateDetails?: EmployeePrivateDetails;
  equipment?: EmployeeEquipment[];
  onboardingProgress: number; // percentage
}

export interface Department {
  id: string;
  name: string;
  managerName: string;
  employeeCount: number;
  openPositions: number;
  monthlyPayrollCost: number;
}

export interface JobPosition {
  id: string;
  title: string;
  department: string;
  reportsTo: string;
  employmentType: EmploymentType;
  description: string;
  requiredSkills: string[];
}

export type AttendanceStatus = 'Working' | 'On Break' | 'Remote' | 'Checked Out' | 'Absent' | 'On Leave';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  breakDurationMins: number;
  workedHours: number;
  expectedHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  locationType: 'Office' | 'Remote' | 'Field Work';
  correctionRequested?: boolean;
}

export interface AttendanceCorrection {
  id: string;
  recordId: string;
  employeeName: string;
  date: string;
  originalTime: string;
  requestedTime: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

// Recruitment (ATS)
export type CandidateStage = 
  | 'New Applicant'
  | 'Screening'
  | 'Phone Interview'
  | 'Technical Interview'
  | 'Final Interview'
  | 'Offer'
  | 'Hired'
  | 'Rejected';

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  hiringManager: string;
  openingsCount: number;
  applicantsCount: number;
  salaryRange: string;
  status: 'Draft' | 'Open' | 'Paused' | 'Closed';
  description: string;
  requirements: string[];
  createdAt: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  appliedPositionId: string;
  appliedPositionTitle: string;
  department: string;
  stage: CandidateStage;
  source: 'LinkedIn' | 'Company Website' | 'Referral' | 'Indeed' | 'Other';
  rating: number; // 1 to 5
  appliedDate: string;
  resumeUrl?: string;
  skills: string[];
  notes?: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  positionTitle: string;
  type: 'HR Screening' | 'Technical' | 'Manager' | 'Final';
  interviewers: string[];
  date: string;
  time: string;
  location: string;
  notes?: string;
  recommendation?: 'Strong Hire' | 'Hire' | 'Neutral' | 'No Hire' | 'Strong No Hire';
}

export interface JobOffer {
  id: string;
  candidateId: string;
  candidateName: string;
  positionTitle: string;
  department: string;
  baseSalary: number;
  startDate: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Declined';
}

// Time Off
export interface TimeOffType {
  id: string;
  name: string;
  annualAllocationDays: number;
  color: string;
  requiresApproval: boolean;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  department: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay?: boolean;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  createdAt: string;
}

export interface LeaveBalance {
  leaveType: string;
  allocated: number;
  used: number;
  remaining: number;
}

// Appraisals
export interface AppraisalCycle {
  id: string;
  title: string;
  period: string;
  startDate: string;
  deadline: string;
  status: 'Draft' | 'Active' | 'Completed';
}

export interface EmployeeGoal {
  id: string;
  employeeId: string;
  title: string;
  category: string;
  dueDate: string;
  progress: number; // 0 - 100
  status: 'Not Started' | 'On Track' | 'At Risk' | 'Completed';
}

export interface Appraisal {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeAvatar: string;
  jobTitle: string;
  department: string;
  managerName: string;
  cycleTitle: string;
  stage: 'Self Review' | 'Manager Review' | 'Peer Feedback' | 'Calibration' | 'Completed';
  overallRating: number; // 1-5
  selfRating: number;
  managerRating: number;
  goalsOnTrackCount: number;
  status: 'Pending' | 'In Progress' | 'Completed';
}

// Fleet
export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  assignedEmployeeName?: string;
  odometerKm: number;
  monthlyCost: number;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Out of Service';
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: 'Oil Change' | 'Tires' | 'Inspection' | 'Repair';
  date: string;
  vendor: string;
  cost: number;
  odometerKm: number;
  nextServiceDate: string;
}

// Payroll
export interface PayrollRun {
  id: string;
  periodName: string;
  month: string;
  year: number;
  status: 'Draft' | 'Calculation' | 'Review' | 'Approved' | 'Processing' | 'Paid';
  employeeCount: number;
  grossPayTotal: number;
  deductionsTotal: number;
  employerCostsTotal: number;
  netPayTotal: number;
  payDate: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  department: string;
  baseSalary: number;
  allowances: { name: string; amount: number }[];
  overtimePay: number;
  bonusPay: number;
  grossPay: number;
  taxDeduction: number;
  insuranceDeduction: number;
  netPay: number;
}

// ==========================================
// MARKETING DOMAIN TYPES (NEW)
// ==========================================
// Marketing Models
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  status: 'Draft' | 'Scheduled' | 'Sending' | 'Sent';
  scheduledDate?: string;
  sentDate?: string;
  targetSegment?: string;
  recipientCount?: number;
  sentCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  templateId?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  category: string;
  thumbnailUrl: string;
  htmlContent: string;
}

export interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  status: 'Draft' | 'Scheduled' | 'Sent';
  sentDate?: string;
  targetSegment?: string;
  recipientCount?: number;
  sentCount: number;
  deliveryRate: number;
  clickRate: number;
}

export interface SurveyQuestion {
  id: string;
  type: 'nps' | 'rating' | 'multipleChoice' | 'text';
  title: string;
  options?: string[];
  required: boolean;
}

export interface SurveyResponse {
  id: string;
  submittedAt: string;
  respondentEmail?: string;
  npsScore?: number;
  answers: Record<string, any>;
}

export interface Survey {
  id: string;
  title: string;
  category?: 'NPS' | 'CSAT' | 'Feedback' | 'Market Research';
  status: 'Draft' | 'Active' | 'Closed';
  questionsCount: number;
  responsesCount: number;
  completionRate: number;
  avgScore: number;
}

export interface SocialAccount {
  id: string;
  platform: 'LinkedIn' | 'Twitter' | 'Instagram' | 'Facebook';
  accountName: string;
  handle?: string;
  followersCount?: number;
  connectedStatus: 'Connected' | 'Disconnected' | 'Reauth Required';
}

export interface SocialPost {
  id: string;
  content?: string;
  platforms: ('LinkedIn' | 'Twitter' | 'Instagram' | 'Facebook')[];
  scheduledFor?: string;
  status: 'Draft' | 'Scheduled' | 'Published' | 'Failed';
  publishedAt?: string;
  mediaUrls?: string[];
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  };
}

// ==========================================
// GLOBAL PLATFORM TYPES (NEW)
// ==========================================

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'invoice' | 'expense' | 'sign' | 'equity' | 'esg' | 'hr' | 'marketing' | 'system';
  linkApp: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userName: string;
  userEmail: string;
  action: string;
  module: string;
  details: string;
  ip: string;
}
