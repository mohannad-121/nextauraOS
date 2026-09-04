import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  InvoiceStatus,
  ExpenseStatus,
  // HR
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
  // Marketing
  EmailCampaign,
  EmailTemplate,
  SMSCampaign,
  Survey,
  SocialAccount,
  SocialPost,
  // Global
  CalendarEvent,
  GlobalApprovalItem,
  CandidateStage,
} from '../types';
import {
  initialOrganizations,
  currentUser,
  initialInvoices,
  initialCustomers,
  initialAccounts,
  initialJournalEntries,
  initialBankTransactions,
  initialExpenses,
  initialCards,
  initialSignDocuments,
  initialShareholders,
  initialOptionGrants,
  initialESGMetrics,
  initialCarbonActivities,
  initialESGInitiatives,
  initialContacts,
  initialNotifications,
  initialAuditLogs,
  // HR Data
  initialEmployees,
  initialDepartments,
  initialJobPositions,
  initialAttendanceRecords,
  initialJobOpenings,
  initialCandidates,
  initialInterviews,
  initialJobOffers,
  initialTimeOffRequests,
  initialAppraisals,
  initialEmployeeGoals,
  initialVehicles,
  initialVehicleMaintenance,
  initialPayrollRuns,
  initialPayslips,
  // Marketing Data
  initialEmailCampaigns,
  initialEmailTemplates,
  initialSMSCampaigns,
  initialSurveys,
  initialSocialAccounts,
  initialSocialPosts,
  // Global Data
  initialCalendarEvents,
  initialGlobalApprovals,
} from '../data/mockData';

// Supabase Backend Services
import { employeeService } from '../services/employeeService';
import { recruitmentService } from '../services/recruitmentService';
import { financeService } from '../services/financeService';
import { payrollService } from '../services/payrollService';
import { marketingService } from '../services/marketingService';
import { calendarService } from '../services/calendarService';
import { auditService } from '../services/auditService';
import { entitlementService } from '../services/entitlementService';
import { NEXTAURA_SERVICES } from '../data/appRegistry';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

export type AppView =
  | 'launchpad'
  | 'home'
  | 'invoicing'
  | 'accounting'
  | 'expenses'
  | 'sign'
  | 'equity'
  | 'esg'
  | 'hr'
  | 'employees'
  | 'attendance'
  | 'recruitment'
  | 'time-off'
  | 'appraisals'
  | 'fleet'
  | 'payroll'
  | 'marketing'
  | 'email'
  | 'sms'
  | 'surveys'
  | 'social'
  | 'calendar'
  | 'approvals'
  | 'contacts'
  | 'documents'
  | 'analytics'
  | 'settings'
  | 'auth';

interface AppContextType {
  // Navigation & Shell
  activeApp: AppView;
  activeSubView: string;
  selectedResourceId?: string;
  navigate: (app: AppView, subView?: string, resourceId?: string) => void;
  goBack: () => void;

  // Workspace & Multi-Tenant Organization
  organizations: Organization[];
  currentOrg: Organization;
  setCurrentOrg: (org: Organization) => void;
  switchOrg: (orgId: string) => void;
  user: User;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  toggleLanguage: () => void;
  isRtl: boolean;

  // UI Drawer states (UI preference only in LocalStorage)
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isNotificationDrawerOpen: boolean;
  setNotificationDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isGlobalCreateOpen: boolean;
  setGlobalCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Finance Collections
  invoices: Invoice[];
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  customers: Customer[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  createJournalEntry: (entry: Omit<JournalEntry, 'id'>) => void;
  bankTransactions: BankTransaction[];
  reconcileBankTx: (txId: string, accountId: string) => void;
  expenses: Expense[];
  createExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpenseStatus: (id: string, status: ExpenseStatus, approvedBy?: string) => void;
  corporateCards: CorporateCard[];
  signDocuments: SignDocument[];
  signDocumentRecipient: (docId: string, recipientId: string) => void;
  shareholders: Shareholder[];
  createShareholder: (sh: Omit<Shareholder, 'id'>) => void;
  optionGrants: OptionGrant[];
  esgMetrics: ESGMetric[];
  carbonActivities: CarbonActivity[];
  createCarbonActivity: (act: Omit<CarbonActivity, 'id'>) => void;
  esgInitiatives: ESGInitiative[];

  // HR Collections
  employees: Employee[];
  createEmployee: (emp: Omit<Employee, 'id' | 'employeeNumber' | 'onboardingProgress'>) => void;
  updateEmployeeDetails: (employeeId: string, updates: Partial<Employee>) => void;
  departments: Department[];
  jobPositions: JobPosition[];
  attendanceRecords: AttendanceRecord[];
  clockInAttendance: (locationType: 'Office' | 'Remote' | 'Field Work') => void;
  startBreakAttendance: (recordId: string) => void;
  endBreakAttendance: (recordId: string) => void;
  clockOutAttendance: (recordId: string) => void;
  jobOpenings: JobOpening[];
  createJobOpening: (job: Omit<JobOpening, 'id' | 'applicantsCount'>) => void;
  candidates: Candidate[];
  createCandidate: (cand: Omit<Candidate, 'id' | 'stage' | 'score'>) => void;
  updateCandidateStage: (id: string, stage: CandidateStage) => void;
  interviews: Interview[];
  scheduleInterview: (interview: Omit<Interview, 'id' | 'status'>) => void;
  scoreCandidate: (candidateId: string, score: number) => void;
  jobOffers: JobOffer[];
  createJobOffer: (offer: Omit<JobOffer, 'id' | 'status'>) => void;
  hireCandidateToEmployee: (candidateId: string) => void;
  timeOffRequests: TimeOffRequest[];
  createTimeOffRequest: (req: Omit<TimeOffRequest, 'id' | 'status' | 'requestedAt'>) => void;
  updateTimeOffStatus: (id: string, status: 'Approved' | 'Rejected') => void;
  appraisals: Appraisal[];
  createAppraisalCycle: (cycleName: string) => void;
  submitSelfReview: (appraisalId: string, rating: number, notes: string) => void;
  submitManagerReview: (appraisalId: string, rating: number, notes: string) => void;
  completeAppraisal: (appraisalId: string) => void;
  employeeGoals: EmployeeGoal[];
  vehicles: Vehicle[];
  createVehicle: (v: Omit<Vehicle, 'id'>) => void;
  vehicleMaintenance: VehicleMaintenance[];
  addVehicleMaintenance: (m: Omit<VehicleMaintenance, 'id'>) => void;
  payrollRuns: PayrollRun[];
  createPayrollRun: (run: Omit<PayrollRun, 'id'>) => void;
  approvePayrollRun: (runId: string) => void;
  payslips: Payslip[];

  // Marketing Collections
  emailCampaigns: EmailCampaign[];
  createEmailCampaign: (camp: Omit<EmailCampaign, 'id' | 'deliveryRate' | 'openRate' | 'clickRate' | 'unsubscribeRate'>) => void;
  emailTemplates: EmailTemplate[];
  smsCampaigns: SMSCampaign[];
  createSMSCampaign: (sms: Omit<SMSCampaign, 'id' | 'deliveryRate'>) => void;
  surveys: Survey[];
  createSurvey: (surv: Omit<Survey, 'id' | 'responsesCount' | 'completionRate' | 'avgScore'>) => void;
  submitSurveyResponse: (surveyId: string, score: number) => void;
  socialAccounts: SocialAccount[];
  socialPosts: SocialPost[];
  createSocialPost: (post: Omit<SocialPost, 'id' | 'status' | 'engagementRate' | 'likes' | 'shares'>) => void;

  // Global Platform
  contacts: Contact[];
  calendarEvents: CalendarEvent[];
  globalApprovals: GlobalApprovalItem[];
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markNotificationsRead: (id?: string) => void;
  markAllNotificationsRead: () => void;
  auditLogs: AuditLogItem[];
  addAuditLog: (action: string, module: string, details: string) => void;

  // Entitlements & Onboarding State
  activeServices: string[];
  refreshServices: () => void;
  isOnboardingActive: boolean;
  setOnboardingActive: (active: boolean) => void;
  setUserProfile: (profile: { name: string; email: string; avatar?: string }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeApp, setActiveApp] = useState<AppView>('launchpad');
  const [activeSubView, setActiveSubView] = useState<string>('overview');
  const [selectedResourceId, setSelectedResourceId] = useState<string | undefined>(undefined);

  // Shell State
  const [organizations, setOrganizations] = useState<Organization[]>(
    isSupabaseConfigured() ? [] : initialOrganizations
  );
  const [currentOrg, setCurrentOrg] = useState<Organization>(
    isSupabaseConfigured()
      ? {
          id: 'org_pending',
          name: 'Workspace Loading...',
          legalName: 'NextAura Enterprise',
          logo: '⚡',
          taxId: 'US-000000',
          registrationNumber: 'REG-000',
          baseCurrency: 'USD',
          country: 'United States',
          address: '100 Corporate Way',
          fiscalYearEnd: '12-31',
        }
      : initialOrganizations[0]
  );
  const [user, setUser] = useState<User>(currentUser);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('nextaura_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) {}
    return 'dark';
  });
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isNotificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGlobalCreateOpen, setGlobalCreateOpen] = useState(false);

  // State Collections initialized from Database / Seed (Isolated per tenant)
  const isSupabase = isSupabaseConfigured();
  const [invoices, setInvoices] = useState<Invoice[]>(isSupabase ? [] : initialInvoices);
  const [customers] = useState<Customer[]>(isSupabase ? [] : initialCustomers);
  const [accounts] = useState<Account[]>(isSupabase ? [] : initialAccounts);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(isSupabase ? [] : initialJournalEntries);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(isSupabase ? [] : initialBankTransactions);
  const [expenses, setExpenses] = useState<Expense[]>(isSupabase ? [] : initialExpenses);
  const [corporateCards] = useState<CorporateCard[]>(isSupabase ? [] : initialCards);
  const [signDocuments, setSignDocuments] = useState<SignDocument[]>(isSupabase ? [] : initialSignDocuments);
  const [shareholders, setShareholders] = useState<Shareholder[]>(isSupabase ? [] : initialShareholders);
  const [optionGrants] = useState<OptionGrant[]>(isSupabase ? [] : initialOptionGrants);
  const [esgMetrics] = useState<ESGMetric[]>(isSupabase ? [] : initialESGMetrics);
  const [carbonActivities, setCarbonActivities] = useState<CarbonActivity[]>(isSupabase ? [] : initialCarbonActivities);
  const [esgInitiatives] = useState<ESGInitiative[]>(isSupabase ? [] : initialESGInitiatives);

  // HR
  const [employees, setEmployees] = useState<Employee[]>(isSupabase ? [] : initialEmployees);
  const [departments] = useState<Department[]>(isSupabase ? [] : initialDepartments);
  const [jobPositions] = useState<JobPosition[]>(isSupabase ? [] : initialJobPositions);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(isSupabase ? [] : initialAttendanceRecords);
  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>(isSupabase ? [] : initialJobOpenings);
  const [candidates, setCandidates] = useState<Candidate[]>(isSupabase ? [] : initialCandidates);
  const [interviews, setInterviews] = useState<Interview[]>(isSupabase ? [] : initialInterviews);
  const [jobOffers, setJobOffers] = useState<JobOffer[]>(isSupabase ? [] : initialJobOffers);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>(isSupabase ? [] : initialTimeOffRequests);
  const [appraisals, setAppraisals] = useState<Appraisal[]>(isSupabase ? [] : initialAppraisals);
  const [employeeGoals] = useState<EmployeeGoal[]>(isSupabase ? [] : initialEmployeeGoals);
  const [vehicles, setVehicles] = useState<Vehicle[]>(isSupabase ? [] : initialVehicles);
  const [vehicleMaintenance, setVehicleMaintenance] = useState<VehicleMaintenance[]>(isSupabase ? [] : initialVehicleMaintenance);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>(isSupabase ? [] : initialPayrollRuns);
  const [payslips] = useState<Payslip[]>(isSupabase ? [] : initialPayslips);

  // Marketing
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>(isSupabase ? [] : initialEmailCampaigns);
  const [emailTemplates] = useState<EmailTemplate[]>(isSupabase ? [] : initialEmailTemplates);
  const [smsCampaigns, setSMSCampaigns] = useState<SMSCampaign[]>(isSupabase ? [] : initialSMSCampaigns);
  const [surveys, setSurveys] = useState<Survey[]>(isSupabase ? [] : initialSurveys);
  const [socialAccounts] = useState<SocialAccount[]>(isSupabase ? [] : initialSocialAccounts);
  const [socialPosts, setSocialPosts] = useState<SocialPost[]>(isSupabase ? [] : initialSocialPosts);

  // Global
  const [contacts] = useState<Contact[]>(isSupabase ? [] : initialContacts);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(isSupabase ? [] : initialCalendarEvents);
  const [globalApprovals] = useState<GlobalApprovalItem[]>(isSupabase ? [] : initialGlobalApprovals);
  const [notifications, setNotifications] = useState<NotificationItem[]>(isSupabase ? [] : initialNotifications);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(isSupabase ? [] : initialAuditLogs);

  // Entitlements & Onboarding State
  const [activeServices, setActiveServices] = useState<string[]>(isSupabase ? [] : NEXTAURA_SERVICES.map((s) => s.key));
  const [isOnboardingActive, setOnboardingActive] = useState<boolean>(false);

  const setUserProfile = useCallback((profile: { name: string; email: string; avatar?: string }) => {
    const userName = profile.name || profile.email.split('@')[0] || 'Enterprise User';
    const userAvatar =
      profile.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=06b6d4&color=020617`;

    const newUserObj: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name: userName,
      email: profile.email,
      role: 'Owner',
      avatar: userAvatar,
      department: 'Executive Office',
      status: 'Active',
      lastActive: new Date().toISOString(),
    };

    setUser(newUserObj);

    const userOrgId = `org_${Math.random().toString(36).substring(2, 9)}`;
    const newOrg: Organization = {
      id: userOrgId,
      name: `${userName.split(' ')[0]}'s Workspace`,
      legalName: `${userName} Global Inc.`,
      logo: '⚡',
      baseCurrency: 'USD',
      taxId: 'US-999999',
      registrationNumber: 'REG-888',
      country: 'United States',
      address: '100 Enterprise Way, Suite 400',
      fiscalYearEnd: '12-31',
    };

    setOrganizations((prev) => [newOrg, ...prev.filter((o) => o.id !== newOrg.id)]);
    setCurrentOrg(newOrg);
  }, []);

  const refreshServices = useCallback(async (): Promise<void> => {
    if (!currentOrg || !currentOrg.id || currentOrg.id === 'org_pending' || currentOrg.id.startsWith('org_temp_')) return;
    try {
      const services = await entitlementService.getActiveOrgServices(currentOrg.id);
      setActiveServices(services);
    } catch (err) {
      console.error('[AppContext] Failed to load organization services:', err);
    }
  }, [currentOrg?.id]);

  useEffect(() => {
    refreshServices();
  }, [currentOrg?.id, refreshServices]);

  const isRtl = language === 'ar';

  // Supabase Auth Session Sync for user profile state
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const clearTenantData = () => {
      setEmployees([]);
      setInvoices([]);
      setExpenses([]);
      setCandidates([]);
      setAttendanceRecords([]);
      setPayrollRuns([]);
      setCalendarEvents([]);
      setVehicles([]);
      setOrganizations([]);
    };

    const handleSessionUser = (sessionUser: any) => {
      if (!sessionUser) return;
      const fullName =
        sessionUser.user_metadata?.full_name ||
        sessionUser.email?.split('@')[0] ||
        'Enterprise User';
      const avatarUrl =
        sessionUser.user_metadata?.avatar_url ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=06b6d4&color=020617`;

      setUser({
        id: sessionUser.id,
        name: fullName,
        email: sessionUser.email || '',
        role: 'Owner',
        avatar: avatarUrl,
        department: 'Executive Office',
        status: 'Active',
        lastActive: new Date().toISOString(),
      });
    };

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user) {
        handleSessionUser(data.session.user);
      } else {
        clearTenantData();
      }
    });

    // Lightweight auth state listener (AppBootGate handles workspace resolution & onboarding state machine)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (session?.user) {
        handleSessionUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        clearTenantData();
        setUser(currentUser);
        setActiveApp('launchpad');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load database records per organization (Only when organization is resolved and active)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    if (!currentOrg || currentOrg.id === 'org_pending' || currentOrg.id.startsWith('org_temp_')) {
      setEmployees([]);
      setCandidates([]);
      setVehicles([]);
      setInvoices([]);
      setPayrollRuns([]);
      setCalendarEvents([]);
      return;
    }

    let isCancelled = false;

    const loadOrgData = async () => {
      try {
        const [dbEmps, dbCands, dbVehs, dbInv, dbRuns, dbCal] = await Promise.all([
          employeeService.fetchEmployees(currentOrg.id),
          recruitmentService.fetchCandidates(currentOrg.id),
          employeeService.fetchVehicles(currentOrg.id),
          financeService.fetchInvoices(currentOrg.id),
          payrollService.fetchPayrollRuns(currentOrg.id),
          calendarService.fetchEvents(currentOrg.id),
        ]);

        if (!isCancelled) {
          setEmployees(dbEmps);
          setCandidates(dbCands);
          setVehicles(dbVehs);
          setInvoices(dbInv);
          setPayrollRuns(dbRuns);
          setCalendarEvents(dbCal);
        }
      } catch (err) {
        console.error('Failed loading tenant data from Supabase:', err);
      }
    };

    loadOrgData();

    return () => {
      isCancelled = true;
    };
  }, [currentOrg?.id]);

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRtl]);

  useEffect(() => {
    try {
      localStorage.setItem('nextaura_theme', theme);
    } catch (_) {}

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const navigate = (app: AppView, subView: string = 'overview', resourceId?: string) => {
    setActiveApp(app);
    setActiveSubView(subView);
    setSelectedResourceId(resourceId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    setActiveSubView('overview');
    setSelectedResourceId(undefined);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const addAuditLog = (action: string, module: string, details: string) => {
    auditService.logAction(currentOrg.id, user.name, action, details).then((log) => {
      const newLogItem: AuditLogItem = {
        id: log.id,
        timestamp: log.timestamp,
        userName: log.userName,
        userEmail: user.email,
        action: log.action,
        module,
        details: log.details,
        ip: '127.0.0.1',
      };
      setAuditLogs((prev) => [newLogItem, ...prev]);
    });
  };

  // Finance Actions
  const createInvoice = (invData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const newInvoice: Invoice = { ...invData, id: `inv-${Date.now()}`, createdAt: new Date().toISOString() };
    setInvoices((prev) => [newInvoice, ...prev]);
    addAuditLog('CREATE_INVOICE', 'Invoicing', `Created invoice ${newInvoice.number}`);
  };

  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
    setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status, amountPaid: status === 'Paid' ? inv.total : inv.amountPaid, amountDue: status === 'Paid' ? 0 : inv.amountDue } : inv));
  };

  const createExpense = (expData: Omit<Expense, 'id'>) => {
    financeService.createExpense(currentOrg.id, expData).then((newExpense) => {
      setExpenses((prev) => [newExpense, ...prev]);
      addAuditLog('CREATE_EXPENSE', 'Expenses', `Submitted expense "${newExpense.title}"`);
    });
  };

  const updateExpenseStatus = (id: string, status: ExpenseStatus, approvedBy?: string) => {
    setExpenses((prev) => prev.map((exp) => exp.id === id ? { ...exp, status, approvedBy: approvedBy || exp.approvedBy } : exp));
  };

  const createJournalEntry = (entryData: Omit<JournalEntry, 'id'>) => {
    financeService.createJournalEntry(currentOrg.id, entryData).then((newEntry) => {
      setJournalEntries((prev) => [newEntry, ...prev]);
      addAuditLog('POST_JOURNAL_ENTRY', 'Accounting', `Posted General Ledger entry ${newEntry.entryNumber}`);
    });
  };

  const reconcileBankTx = (txId: string, _accountId: string) => {
    setBankTransactions((prev) => prev.map((tx) => tx.id === txId ? { ...tx, status: 'Reconciled' } : tx));
    addAuditLog('RECONCILE_BANK_TX', 'Accounting', `Reconciled bank transaction ${txId}`);
  };

  const signDocumentRecipient = (docId: string, _recipientId: string) => {
    setSignDocuments((prev) => prev.map((doc) => doc.id === docId ? { ...doc, status: 'Completed' } : doc));
  };

  const createShareholder = (shData: Omit<Shareholder, 'id'>) => {
    setShareholders((prev) => [...prev, { ...shData, id: `sh-${Date.now()}` }]);
  };

  const createCarbonActivity = (actData: Omit<CarbonActivity, 'id'>) => {
    setCarbonActivities((prev) => [{ ...actData, id: `ca-${Date.now()}` }, ...prev]);
  };

  // HR Actions
  const createEmployee = (empData: Omit<Employee, 'id' | 'employeeNumber' | 'onboardingProgress'>) => {
    employeeService.createEmployee(currentOrg.id, empData).then((newEmp) => {
      setEmployees((prev) => [newEmp, ...prev]);
      addAuditLog('CREATE_EMPLOYEE', 'Human Resources', `Created new employee record for ${newEmp.name}`);
    });
  };

  const updateEmployeeDetails = (employeeId: string, updates: Partial<Employee>) => {
    setEmployees((prev) => prev.map((emp) => emp.id === employeeId ? { ...emp, ...updates } : emp));
    addAuditLog('UPDATE_EMPLOYEE', 'Human Resources', `Updated details for employee ${employeeId}`);
  };

  const clockInAttendance = (locationType: 'Office' | 'Remote' | 'Field Work') => {
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      employeeId: user.id,
      employeeName: user.name,
      employeeAvatar: user.avatar,
      department: user.department || 'Executive Office',
      date: new Date().toISOString().substring(0, 10),
      checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      breakDurationMins: 0,
      workedHours: 0.1,
      expectedHours: 8,
      overtimeHours: 0,
      status: 'Working',
      locationType,
    };
    setAttendanceRecords((prev) => [newRecord, ...prev]);
    addAuditLog('CLOCK_IN', 'Human Resources', `Employee ${user.name} clocked in (${locationType})`);
  };

  const startBreakAttendance = (recordId: string) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) => (rec.id === recordId ? { ...rec, status: 'On Break' } : rec))
    );
    addAuditLog('START_BREAK', 'Human Resources', `Employee started break`);
  };

  const endBreakAttendance = (recordId: string) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) => (rec.id === recordId ? { ...rec, status: 'Working', breakDurationMins: rec.breakDurationMins + 15 } : rec))
    );
    addAuditLog('END_BREAK', 'Human Resources', `Employee ended break`);
  };

  const switchOrg = (orgId: string) => {
    const found = organizations.find((o) => o.id === orgId);
    if (found) setCurrentOrg(found);
  };

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const markNotificationsRead = () => {
    markAllNotificationsRead();
  };

  const clockOutAttendance = (recordId: string) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) =>
        rec.id === recordId
          ? {
              ...rec,
              status: 'Checked Out',
              checkOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              workedHours: 8.0,
            }
          : rec
      )
    );
    addAuditLog('CLOCK_OUT', 'Human Resources', `Employee clocked out`);
  };

  const createJobOpening = (jobData: Omit<JobOpening, 'id' | 'applicantsCount'>) => {
    const newJob: JobOpening = { ...jobData, id: `job-${Date.now()}`, applicantsCount: 0 };
    setJobOpenings((prev) => [newJob, ...prev]);
    addAuditLog('CREATE_JOB_OPENING', 'Recruitment', `Published job requisition "${newJob.title}"`);
  };

  const createCandidate = (candData: Omit<Candidate, 'id' | 'stage' | 'rating'>) => {
    recruitmentService.createCandidate(currentOrg.id, candData).then((newCand) => {
      setCandidates((prev) => [newCand, ...prev]);
      addAuditLog('CREATE_CANDIDATE', 'Recruitment', `Added candidate ${newCand.name} for ${newCand.appliedPositionTitle}`);
    });
  };

  const updateCandidateStage = (id: string, stage: CandidateStage) => {
    recruitmentService.updateCandidateStage(currentOrg.id, id, stage).then(() => {
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
      addAuditLog('UPDATE_CANDIDATE_STAGE', 'Recruitment', `Moved candidate ${id} to stage ${stage}`);
    });
  };

  const scheduleInterview = (intData: Omit<Interview, 'id'>) => {
    const newInt: Interview = { ...intData, id: `int-${Date.now()}` };
    setInterviews((prev) => [newInt, ...prev]);

    calendarService.createEvent(currentOrg.id, {
      title: `Interview: ${newInt.candidateName} (${newInt.positionTitle})`,
      date: newInt.date,
      time: newInt.time,
      type: 'Interview',
      module: 'Recruitment',
      color: '#f97316',
    }).then((calEvent) => {
      setCalendarEvents((prev) => [...prev, calEvent]);
    });

    addAuditLog('SCHEDULE_INTERVIEW', 'Recruitment', `Scheduled interview with candidate ${newInt.candidateName}`);
  };

  const scoreCandidate = (candidateId: string, score: number) => {
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, rating: score } : c)));
    addAuditLog('SCORE_CANDIDATE', 'Recruitment', `Scored candidate ${candidateId} with ${score}/5 stars`);
  };

  const createJobOffer = (offerData: Omit<JobOffer, 'id' | 'status'>) => {
    const newOffer: JobOffer = { ...offerData, id: `offer-${Date.now()}`, status: 'Sent' };
    setJobOffers((prev) => [newOffer, ...prev]);
    setCandidates((prev) => prev.map((c) => (c.id === offerData.candidateId ? { ...c, stage: 'Offer' } : c)));
    addAuditLog('CREATE_JOB_OFFER', 'Recruitment', `Issued job offer to candidate ${offerData.candidateName}`);
  };

  const hireCandidateToEmployee = (candidateId: string) => {
    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    recruitmentService.hireCandidate(currentOrg.id, cand).then((newEmp) => {
      setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, stage: 'Hired' } : c)));
      setEmployees((prev) => [newEmp, ...prev]);
      addAuditLog('HIRE_CANDIDATE', 'Recruitment', `Hired candidate ${cand.name} & created Employee profile`);
    });
  };

  const createTimeOffRequest = (reqData: Omit<TimeOffRequest, 'id' | 'status' | 'createdAt'>) => {
    const newReq: TimeOffRequest = {
      ...reqData,
      id: `tor-${Date.now()}`,
      status: 'Pending',
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setTimeOffRequests((prev) => [newReq, ...prev]);
    addAuditLog('CREATE_TIMEOFF_REQ', 'Human Resources', `Submitted leave request for ${newReq.employeeName}`);
  };

  const updateTimeOffStatus = (id: string, status: 'Approved' | 'Rejected') => {
    setTimeOffRequests((prev) =>
      prev.map((req) => {
        if (req.id === id) {
          if (status === 'Approved') {
            calendarService.createEvent(currentOrg.id, {
              title: `Time Off: ${req.employeeName} (${req.leaveType})`,
              date: req.startDate,
              time: 'All Day',
              type: 'Time Off',
              module: 'HR',
              color: '#a855f7',
            }).then((calEvent) => {
              setCalendarEvents((prev) => [...prev, calEvent]);
            });
          }
          return { ...req, status, approvedBy: user.name };
        }
        return req;
      })
    );
    addAuditLog('UPDATE_TIMEOFF_STATUS', 'Human Resources', `Updated leave request ${id} status to ${status}`);
  };

  const createAppraisalCycle = (cycleName: string) => {
    addAuditLog('CREATE_APPRAISAL_CYCLE', 'Human Resources', `Created review cycle ${cycleName}`);
  };

  const submitSelfReview = (appraisalId: string, rating: number, notes: string) => {
    setAppraisals((prev) =>
      prev.map((a) => (a.id === appraisalId ? { ...a, selfRating: rating, selfNotes: notes, stage: 'Manager Review' } : a))
    );
    addAuditLog('SUBMIT_SELF_REVIEW', 'Human Resources', `Submitted self review for appraisal ${appraisalId}`);
  };

  const submitManagerReview = (appraisalId: string, rating: number, notes: string) => {
    setAppraisals((prev) =>
      prev.map((a) => {
        if (a.id === appraisalId) {
          const overall = Number(((a.selfRating + rating) / 2).toFixed(1));
          return { ...a, managerRating: rating, managerNotes: notes, overallRating: overall, stage: 'Completed', status: 'Completed' };
        }
        return a;
      })
    );
    addAuditLog('SUBMIT_MANAGER_REVIEW', 'Human Resources', `Completed manager evaluation for appraisal ${appraisalId}`);
  };

  const completeAppraisal = (appraisalId: string) => {
    setAppraisals((prev) => prev.map((a) => (a.id === appraisalId ? { ...a, stage: 'Completed', status: 'Completed' } : a)));
  };

  const createVehicle = (vData: Omit<Vehicle, 'id'>) => {
    employeeService.createVehicle(currentOrg.id, vData).then((newVeh) => {
      setVehicles((prev) => [newVeh, ...prev]);
      addAuditLog('CREATE_VEHICLE', 'Human Resources', `Registered vehicle ${newVeh.name}`);
    });
  };

  const addVehicleMaintenance = (mData: Omit<VehicleMaintenance, 'id'>) => {
    employeeService.addVehicleMaintenance(currentOrg.id, mData).then((newMaint) => {
      setVehicleMaintenance((prev) => [newMaint, ...prev]);
      setVehicles((prev) => prev.map((v) => (v.id === mData.vehicleId ? { ...v, odometerKm: mData.odometerKm } : v)));

      // Auto-post Accounting Expense
      createExpense({
        employeeId: user.id,
        employeeName: user.name,
        employeeAvatar: user.avatar,
        title: `Fleet Maintenance: ${mData.vehicleName} (${mData.type})`,
        merchant: mData.vendor,
        date: mData.date,
        category: 'Fleet & Equipment Maintenance',
        amount: mData.cost,
        currency: 'USD',
        status: 'Approved',
        paymentMethod: 'Corporate Card',
        approvedBy: user.name,
      });
    });
  };

  const createPayrollRun = (runData: Omit<PayrollRun, 'id'>) => {
    payrollService.createPayrollRun(currentOrg.id, runData).then((newRun) => {
      setPayrollRuns((prev) => [newRun, ...prev]);
      addAuditLog('CREATE_PAYROLL_RUN', 'Payroll', `Generated payroll run for ${newRun.periodName}`);
    });
  };

  const approvePayrollRun = (runId: string) => {
    const run = payrollRuns.find((r) => r.id === runId);
    if (!run) return;

    payrollService.approvePayrollRun(currentOrg.id, runId, run).then((postedJournal) => {
      setPayrollRuns((prev) => prev.map((r) => (r.id === runId ? { ...r, status: 'Paid' } : r)));
      setJournalEntries((prev) => [postedJournal, ...prev]);
      addAuditLog('APPROVE_PAYROLL', 'Payroll', `Approved & posted General Ledger payroll journal ${postedJournal.entryNumber}`);
    });
  };

  // Marketing Actions
  const createEmailCampaign = (campData: Omit<EmailCampaign, 'id' | 'deliveryRate' | 'openRate' | 'clickRate' | 'unsubscribeRate'>) => {
    marketingService.createEmailCampaign(currentOrg.id, campData).then((newCamp) => {
      setEmailCampaigns((prev) => [newCamp, ...prev]);

      calendarService.createEvent(currentOrg.id, {
        title: `Email Launch: ${newCamp.name}`,
        date: new Date().toISOString().substring(0, 10),
        time: '10:00',
        type: 'Campaign',
        module: 'Marketing',
        color: '#f43f5e',
      }).then((calEvent) => {
        setCalendarEvents((prev) => [...prev, calEvent]);
      });

      addAuditLog('CREATE_EMAIL_CAMPAIGN', 'Marketing', `Created campaign ${newCamp.name}`);
    });
  };

  const createSMSCampaign = (smsData: Omit<SMSCampaign, 'id' | 'deliveryRate'>) => {
    marketingService.createSMSCampaign(currentOrg.id, smsData).then((newSMS) => {
      setSMSCampaigns((prev) => [newSMS, ...prev]);
      addAuditLog('CREATE_SMS_CAMPAIGN', 'Marketing', `Broadcasted SMS campaign ${newSMS.name}`);
    });
  };

  const createSurvey = (survData: Omit<Survey, 'id' | 'responsesCount' | 'completionRate' | 'avgScore'>) => {
    marketingService.createSurvey(currentOrg.id, survData).then((newSurv) => {
      setSurveys((prev) => [newSurv, ...prev]);
      addAuditLog('CREATE_SURVEY', 'Marketing', `Published survey ${newSurv.title}`);
    });
  };

  const submitSurveyResponse = (surveyId: string, score: number) => {
    setSurveys((prev) =>
      prev.map((s) => {
        if (s.id === surveyId) {
          const newCount = s.responsesCount + 1;
          const newAvg = Number(((s.avgScore * s.responsesCount + score) / newCount).toFixed(1));
          return { ...s, responsesCount: newCount, avgScore: newAvg };
        }
        return s;
      })
    );
  };

  const createSocialPost = (postData: Omit<SocialPost, 'id' | 'status' | 'engagementRate' | 'likes' | 'shares'>) => {
    marketingService.createSocialPost(currentOrg.id, postData).then((newPost) => {
      setSocialPosts((prev) => [newPost, ...prev]);

      if (newPost.scheduledFor) {
        calendarService.createEvent(currentOrg.id, {
          title: `Social Post (${newPost.platforms.join(', ')}): ${(newPost.content || '').substring(0, 30)}...`,
          date: newPost.scheduledFor.substring(0, 10),
          time: newPost.scheduledFor.substring(11) || '14:00',
          type: 'Campaign',
          module: 'Marketing',
          color: '#3b82f6',
        }).then((calEvent) => {
          setCalendarEvents((prev) => [...prev, calEvent]);
        });
      }

      addAuditLog('CREATE_SOCIAL_POST', 'Marketing', `Scheduled social post across ${newPost.platforms.join(', ')}`);
    });
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <AppContext.Provider
      value={{
        activeApp,
        activeSubView,
        selectedResourceId,
        navigate,
        goBack,
        organizations,
        currentOrg,
        setCurrentOrg,
        user,
        theme,
        toggleTheme,
        language,
        setLanguage,
        isRtl,
        isSidebarCollapsed,
        setSidebarCollapsed,
        isCommandPaletteOpen,
        setCommandPaletteOpen,
        isNotificationDrawerOpen,
        setNotificationDrawerOpen,
        searchQuery,
        setSearchQuery,
        isGlobalCreateOpen,
        setGlobalCreateOpen,
        // Finance
        invoices,
        createInvoice,
        updateInvoiceStatus,
        customers,
        accounts,
        journalEntries,
        createJournalEntry,
        bankTransactions,
        reconcileBankTx,
        expenses,
        createExpense,
        updateExpenseStatus,
        corporateCards,
        signDocuments,
        signDocumentRecipient,
        shareholders,
        createShareholder,
        optionGrants,
        esgMetrics,
        carbonActivities,
        createCarbonActivity,
        esgInitiatives,
        // HR
        employees,
        createEmployee,
        updateEmployeeDetails,
        departments,
        jobPositions,
        attendanceRecords,
        clockInAttendance,
        startBreakAttendance,
        endBreakAttendance,
        clockOutAttendance,
        jobOpenings,
        createJobOpening,
        candidates,
        createCandidate,
        updateCandidateStage,
        interviews,
        scheduleInterview,
        scoreCandidate,
        jobOffers,
        createJobOffer,
        hireCandidateToEmployee,
        timeOffRequests,
        createTimeOffRequest,
        updateTimeOffStatus,
        appraisals,
        createAppraisalCycle,
        submitSelfReview,
        submitManagerReview,
        completeAppraisal,
        employeeGoals,
        vehicles,
        createVehicle,
        vehicleMaintenance,
        addVehicleMaintenance,
        payrollRuns,
        createPayrollRun,
        approvePayrollRun,
        payslips,
        // Marketing
        emailCampaigns,
        createEmailCampaign,
        emailTemplates,
        smsCampaigns,
        createSMSCampaign,
        surveys,
        createSurvey,
        submitSurveyResponse,
        socialAccounts,
        socialPosts,
        createSocialPost,
        // Global
        contacts,
        calendarEvents,
        globalApprovals,
        notifications,
        markNotificationRead,
        markNotificationsRead,
        markAllNotificationsRead,
        auditLogs,
        addAuditLog,
        switchOrg,
        toggleLanguage,
        activeServices,
        refreshServices,
        isOnboardingActive,
        setOnboardingActive,
        setUserProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
