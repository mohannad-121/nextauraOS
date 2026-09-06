import type { Currency } from '../types';

export const formatCurrency = (amount: number, currency: Currency = 'USD', locale: string = 'en-US'): string => {
  const currencySymbolMap: Record<Currency, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JOD: 'JOD ',
    AED: 'AED ',
    SAR: 'SAR ',
  };

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currencySymbolMap[currency] || '$'}${formatted}`;
};

export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const getStatusBadgeStyle = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'completed':
    case 'approved':
    case 'on track':
    case 'reconciled':
    case 'active':
    case 'matched':
    case 'signed':
    case 'hired':
    case 'published':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
    
    case 'sent':
    case 'viewed':
    case 'partially paid':
    case 'manager review':
    case 'submitted':
    case 'in progress':
    case 'suggested':
    case 'pending':
    case 'planned':
    case 'interview':
    case 'offer':
      return 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';

    case 'overdue':
    case 'rejected':
    case 'declined':
    case 'expired':
    case 'needs attention':
    case 'cancelled':
    case 'unmatched':
    case 'frozen':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';

    case 'draft':
    case 'inactive':
    case 'applied':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

export const translations = {
  en: {
    launcherTitle: 'Finance Applications',
    launcherSubtitle: 'Everything your company needs to control money, ownership, agreements, and sustainability.',
    overviewTitle: 'Executive Finance Overview',
    overviewSubtitle: "Here's how your company is performing today.",
    invoicing: 'Invoicing',
    accounting: 'Accounting',
    expenses: 'Expenses',
    sign: 'Sign',
    equity: 'Equity',
    esg: 'ESG',
    dashboard: 'Home Dashboard',
    launchpad: 'Finance Launcher',
    analytics: 'Analytics',
    contacts: 'Contacts',
    documents: 'Documents',
    reports: 'Reports',
    settings: 'Settings',
    searchPlaceholder: 'Search invoices, expenses, shareholders, GL (Cmd+K)...',
    createAction: '+ Create',
    cashBalance: 'Cash Balance',
    revenue: 'Revenue',
    expensesMetric: 'Expenses',
    netProfit: 'Net Profit',
    accountsReceivable: 'Accounts Receivable',
    accountsPayable: 'Accounts Payable',
  },
  ar: {
    launcherTitle: 'تطبيقات المالية والمؤسسية',
    launcherSubtitle: 'كل ما تحتاجه شركتك لإدارة الأموال والملكية والاتفاقيات والاستدامة.',
    overviewTitle: 'الملخص المالي التنفيذي',
    overviewSubtitle: 'إليك نظرة شاملة على أداء الشركة اليوم.',
    invoicing: 'الفواتير',
    accounting: 'المحاسبة العامة',
    expenses: 'المصروفات',
    sign: 'التوقيع الإلكتروني',
    equity: 'إدارة الملكية الأسهم',
    esg: 'الاستدامة والبيئة (ESG)',
    dashboard: 'اللوحة الرئيسية',
    launchpad: 'منصة التطبيقات',
    analytics: 'التحليلات',
    contacts: 'جهات الاتصال',
    documents: 'المستندات',
    reports: 'التقارير المالية',
    settings: 'الإعدادات',
    searchPlaceholder: 'ابحث عن الفواتير، المصروفات، المساهمين، القيود (Cmd+K)...',
    createAction: '+ إنشاء جديد',
    cashBalance: 'الرصيد النقدي',
    revenue: 'الإيرادات الإجمالية',
    expensesMetric: 'المصروفات',
    netProfit: 'الربح الصافي',
    accountsReceivable: 'ذمم مدينة (مستحقة)',
    accountsPayable: 'ذمم دائنة (مطلوبة)',
  }
};
