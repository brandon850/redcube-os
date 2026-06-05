import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/features/auth/LoginPage'
import RequireAuth from '@/components/RequireAuth'
import SettingsLayout from '@/features/settings/SettingsLayout'
import CompanyPage from '@/features/settings/CompanyPage'
import ProfilePage from '@/features/settings/ProfilePage'
import UsersPage from '@/features/settings/UsersPage'
import RolesPage from '@/features/settings/RolesPage'
import CatalogPage from '@/features/catalog/CatalogPage'
import BrandsPage from '@/features/brands/BrandsPage'
import AnalyticsPage from '@/features/analytics/AnalyticsPage'
import SequencesListPage from '@/features/automation/SequencesListPage'
import SequenceBuilderPage from '@/features/automation/SequenceBuilderPage'
import EmailSettingsPage from '@/features/email/EmailSettingsPage'
import InvoicesPage from '@/features/billing/InvoicesPage'
import TemplatesPage from '@/features/onboarding/TemplatesPage'
import SitesListPage from '@/features/delivery/SitesListPage'
import SiteDetailPage from '@/features/delivery/SiteDetailPage'
import ClientReportPage from '@/features/delivery/ClientReportPage'
import ProposalsListPage from '@/features/proposals/ProposalsListPage'
import ProposalBuilderPage from '@/features/proposals/ProposalBuilderPage'
import ProposalDetailPage from '@/features/proposals/ProposalDetailPage'
import PublicProposalPage from '@/features/proposals/PublicProposalPage'
import Placeholder from '@/components/Placeholder'
import ContactsPage from '@/features/crm/ContactsPage'
import ContactDetailPage from '@/features/crm/ContactDetailPage'
import PipelinePage from '@/features/pipeline/PipelinePage'
import FormsListPage from '@/features/forms/FormsListPage'
import FormBuilderPage from '@/features/forms/FormBuilderPage'
import PublicFormPage from '@/features/forms/PublicFormPage'
import AuditPage from '@/features/audit/AuditPage'
import AuditReportPage from '@/features/audit/AuditReportPage'
import AuditsListPage from '@/features/audit/AuditsListPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Public lead-capture form (no auth) */}
      <Route path="/f/:token" element={<PublicFormPage />} />
      {/* Public SEO audit lead magnet (no auth) */}
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/audit/report/:id" element={<AuditReportPage />} />
      {/* Public client-facing proposal configurator (no auth) */}
      <Route path="/proposals/view/:token" element={<PublicProposalPage />} />
      {/* Public, shareable client SEO report (no auth) */}
      <Route path="/reports/view/:id" element={<ClientReportPage />} />

      {/* Authenticated app — RequireAuth renders the AppLayout shell with an Outlet */}
      <Route element={<RequireAuth />}>
        <Route index element={<Navigate to="/pipeline" replace />} />

        {/* CRM */}
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactDetailPage />} />
        <Route path="companies" element={<Placeholder title="Companies" />} />

        {/* Sales */}
        <Route path="pipeline" element={<PipelinePage />} />
        <Route path="proposals" element={<ProposalsListPage />} />
        <Route path="proposals/new" element={<ProposalBuilderPage />} />
        <Route path="proposals/:id" element={<ProposalDetailPage />} />

        {/* Attract */}
        <Route path="audits" element={<AuditsListPage />} />

        {/* Billing */}
        <Route path="invoices" element={<InvoicesPage />} />

        {/* Marketing */}
        <Route path="forms" element={<FormsListPage />} />
        <Route path="forms/:id/edit" element={<FormBuilderPage />} />
        <Route path="sequences" element={<SequencesListPage />} />
        <Route path="sequences/:id" element={<SequenceBuilderPage />} />

        {/* Deliver */}
        <Route path="sites" element={<SitesListPage />} />
        <Route path="sites/:id" element={<SiteDetailPage />} />

        {/* Reports */}
        <Route path="analytics" element={<AnalyticsPage />} />

        {/* Settings (nested) */}
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="company" element={<CompanyPage />} />
          <Route path="brands" element={<BrandsPage />} />
          <Route path="branding" element={<Placeholder title="Branding" />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="pipeline" element={<Placeholder title="Pipeline Stages" />} />
          <Route path="packages" element={<CatalogPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="integrations" element={<Placeholder title="Integrations" />} />
          <Route path="email" element={<EmailSettingsPage />} />
        </Route>

        <Route path="*" element={<Placeholder title="Not found" />} />
      </Route>
    </Routes>
  )
}

export default App
