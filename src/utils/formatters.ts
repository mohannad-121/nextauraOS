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
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    
    case 'sent':
    case 'viewed':
    case 'partially paid':
    case 'manager review':
    case 'submitted':
    case 'in progress':
    case 'suggested':
    case 'pending':
    case 'planned':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';

    case 'overdue':
    case 'rejected':
    case 'declined':
    case 'expired':
    case 'needs attention':
    case 'cancelled':
    case 'unmatched':
    case 'frozen':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';

    case 'draft':
    case 'inactive':
    default:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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
