import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Finance Pages
import { FinanceLaunchpad } from './pages/FinanceLaunchpad';
import { HomeDashboard } from './pages/HomeDashboard';
import { InvoicingDashboard } from './pages/invoicing/InvoicingDashboard';
import { InvoiceBuilder } from './pages/invoicing/InvoiceBuilder';
import { CustomersList } from './pages/invoicing/CustomersList';
import { AccountingDashboard } from './pages/accounting/AccountingDashboard';
import { GeneralLedger } from './pages/accounting/GeneralLedger';
import { JournalEntryForm } from './pages/accounting/JournalEntryForm';
import { BankReconciliation } from './pages/accounting/BankReconciliation';
import { FinancialReports } from './pages/accounting/FinancialReports';
import { ExpensesDashboard } from './pages/expenses/ExpensesDashboard';
import { ApprovalQueue } from './pages/expenses/ApprovalQueue';
import { CorporateCards } from './pages/expenses/CorporateCards';
import { SignDashboard } from './pages/sign/SignDashboard';
import { DocumentPrepBuilder } from './pages/sign/DocumentPrepBuilder';
import { ExternalSignerExperience } from './pages/sign/ExternalSignerExperience';
import { EquityDashboard } from './pages/equity/EquityDashboard';
import { CapTable } from './pages/equity/CapTable';
import { FundingDilutionSimulator } from './pages/equity/FundingDilutionSimulator';
import { ESGDashboard } from './pages/esg/ESGDashboard';
import { CarbonCalculator } from './pages/esg/CarbonCalculator';

// Human Resources Pages
import { HRDashboard } from './pages/hr/HRDashboard';
import { EmployeesList } from './pages/hr/EmployeesList';
import { EmployeeDetail } from './pages/hr/EmployeeDetail';
import { AttendanceApp } from './pages/hr/AttendanceApp';
import { RecruitmentATS } from './pages/hr/RecruitmentATS';
import { TimeOffApp } from './pages/hr/TimeOffApp';
import { AppraisalsApp } from './pages/hr/AppraisalsApp';
import { FleetApp } from './pages/hr/FleetApp';
import { PayrollApp } from './pages/hr/PayrollApp';

// Marketing Pages
import { MarketingDashboard } from './pages/marketing/MarketingDashboard';
import { EmailMarketingApp } from './pages/marketing/EmailMarketingApp';
import { SMSMarketingApp } from './pages/marketing/SMSMarketingApp';
import { SurveysApp } from './pages/marketing/SurveysApp';
import { SocialMarketingApp } from './pages/marketing/SocialMarketingApp';

// Global Platform Pages & Entitlements
import { GlobalCalendar } from './pages/GlobalCalendar';
import { GlobalApprovals } from './pages/GlobalApprovals';
import { ContactsDirectory } from './pages/ContactsDirectory';
import { DocumentCenter } from './pages/DocumentCenter';
import { AnalyticsCenter } from './pages/AnalyticsCenter';
import { SettingsPage } from './pages/settings/SettingsPage';
import { CustomerServicesPage } from './pages/settings/CustomerServicesPage';
import { AdminServiceRequests } from './pages/admin/AdminServiceRequests';
import { AuthScreens } from './pages/auth/AuthScreens';

const AppContent: React.FC = () => {
  const { activeApp, activeSubView, signDocuments, navigate } = useApp();

  const renderCurrentView = () => {
    switch (activeApp) {
      case 'launchpad':
        return <FinanceLaunchpad />;
      case 'home':
        return <HomeDashboard />;

      // FINANCE
      case 'invoicing':
        if (activeSubView === 'new-invoice') return <InvoiceBuilder />;
        if (activeSubView === 'customers') return <CustomersList />;
        return <InvoicingDashboard />;

      case 'accounting':
        if (activeSubView === 'ledger') return <GeneralLedger />;
        if (activeSubView === 'journal-new') return <JournalEntryForm />;
        if (activeSubView === 'reconciliation') return <BankReconciliation />;
        if (activeSubView === 'reports') return <FinancialReports />;
        return <AccountingDashboard />;

      case 'expenses':
        if (activeSubView === 'approvals') return <ApprovalQueue />;
        if (activeSubView === 'cards') return <CorporateCards />;
        return <ExpensesDashboard />;

      case 'sign':
        if (activeSubView === 'builder') return <DocumentPrepBuilder />;
        if (activeSubView === 'signer')
          return (
            <ExternalSignerExperience
              document={signDocuments[0]}
              onComplete={() => navigate('sign', 'overview')}
            />
          );
        return <SignDashboard />;

      case 'equity':
        if (activeSubView === 'cap-table') return <CapTable />;
        if (activeSubView === 'dilution') return <FundingDilutionSimulator />;
        return <EquityDashboard />;

      case 'esg':
        if (activeSubView === 'carbon') return <CarbonCalculator />;
        return <ESGDashboard />;

      // HUMAN RESOURCES
      case 'hr':
        return <HRDashboard />;

      case 'employees':
        if (activeSubView === 'detail') return <EmployeeDetail />;
        return <EmployeesList />;

      case 'attendance':
        return <AttendanceApp />;

      case 'recruitment':
        return <RecruitmentATS />;

      case 'time-off':
        return <TimeOffApp />;

      case 'appraisals':
        return <AppraisalsApp />;

      case 'fleet':
        return <FleetApp />;

      case 'payroll':
        return <PayrollApp />;

      // MARKETING
      case 'marketing':
        return <MarketingDashboard />;

      case 'email':
        return <EmailMarketingApp />;

      case 'sms':
        return <SMSMarketingApp />;

      case 'surveys':
        return <SurveysApp />;

      case 'social':
        return <SocialMarketingApp />;

      // GLOBAL PLATFORM & SERVICES
      case 'calendar':
        return <GlobalCalendar />;

      case 'approvals':
        return <GlobalApprovals />;

      case 'contacts':
        return <ContactsDirectory />;

      case 'documents':
        return <DocumentCenter />;

      case 'analytics':
        return <AnalyticsCenter />;

      case 'settings':
        if (activeSubView === 'services') return <CustomerServicesPage />;
        if (activeSubView === 'admin-requests') return <AdminServiceRequests />;
        return <SettingsPage />;

      case 'auth':
        return <AuthScreens />;

      default:
        return <FinanceLaunchpad />;
    }
  };

  return (
    <AppShell>
      <ProtectedRoute>{renderCurrentView()}</ProtectedRoute>
    </AppShell>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
