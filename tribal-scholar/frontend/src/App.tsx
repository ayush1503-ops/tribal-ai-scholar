import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { Header, Footer, Sidebar, MobileBottomNav } from './components/Layout'
import Landing from './pages/Landing'
import Schemes from './pages/Schemes'
import SchemeDetail from './pages/SchemeDetail'
import About from './pages/About'
import MlDemo from './pages/MlDemo'
import PhotoScan from './pages/PhotoScan'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ApplicantDashboard from './pages/applicant/Dashboard'
import Apply from './pages/applicant/Apply'
import Profile from './pages/applicant/Profile'
import Timeline from './pages/applicant/Timeline'
import Appeals from './pages/applicant/Appeals'
import OfficerDashboard from './pages/officer/Dashboard'
import Queue from './pages/officer/Queue'
import Review from './pages/officer/Review'
import AdminDashboard from './pages/admin/Dashboard'
import SchemeConfigurator from './pages/admin/SchemeConfigurator'
import Analytics from './pages/admin/Analytics'
import Audit from './pages/admin/Audit'
import Fairness from './pages/admin/Fairness'
import Simulator from './pages/admin/Simulator'
import Users from './pages/admin/Users'
import CommitteeDashboard from './pages/committee/Dashboard'
import NotFound from './pages/NotFound'
import ChatBot from './components/ChatBot'

function Protected({children, roles}: {children: React.ReactNode, roles?: string[]}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" />
  if (roles && !roles.some(r=>user.roles.includes(r) || user.roles.includes('super_admin'))) {
    return <div className="max-w-xl mx-auto px-4 py-16 text-center"><h2 className="font-bold text-lg">403 — Not authorised</h2><p className="text-sm text-[#52616B] mt-2">Your role: {user.roles.join(', ')} — required: {roles.join(', ')}</p><p className="text-xs text-[#52616B] mt-2">We could not confirm access for this section. If you believe this is an error, contact support.</p></div>
  }
  return <>{children}</>
}

// Wrapper to show sidebar on desktop for applicant/officer flows — skill: persistent left sidebar
function WithSidebar({children, role}: {children: React.ReactNode, role: string}) {
  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 flex gap-6">
      <Sidebar role={role} />
      <div className="flex-1 min-w-0 pb-[72px] lg:pb-0">{children}</div>
    </div>
  )
}

function FinanceStub() {
  return <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-12"><h1 className="text-xl font-semibold text-[#073B4C]">Finance and sanction</h1><p className="text-sm text-[#52616B] mt-2">Your sanction queue and payment release status will appear here. In this prototype, use the officer decision <span className="font-mono bg-white border px-1">Sanction</span> or <span className="font-mono bg-white border px-1">Payment</span> to move an application from Selected to Sanctioned to Payment released.</p><p className="text-xs text-[#52616B] mt-3">Production would integrate with PFMS/DBT after approvals.</p></div>
}
function Notifications() {
  const [items, setItems] = React.useState<any[]>([])
  React.useEffect(()=>{ import('./services/api').then(m=> m.default.get('/admin/notifications').then(r=>setItems(r.data.items)).catch(()=>{})) },[])
  return <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6"><h1 className="text-xl font-semibold text-[#073B4C]">Notifications</h1><p className="text-xs text-[#52616B] mt-1">In-app updates. Email/SMS would be added later with consent.</p><div className="mt-4 space-y-2">{items.map(n=> <div key={n.id} className="border border-[#D7E0E5] rounded-md p-3 bg-white shadow-card"><div className="font-medium text-sm text-[#073B4C]">{n.title}</div><div className="text-sm text-[#52616B] mt-1">{n.message}</div><div className="text-xs text-[#52616B] mt-1">{new Date(n.created_at).toLocaleString()}</div></div>)} {items.length===0 && <div className="border border-dashed border-[#D7E0E5] rounded-md bg-[#F6F9FA] p-8 text-center text-sm text-[#52616B]">No notifications yet. When your application status changes, you will see it here.</div>}</div></div>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F6F9FA] flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/schemes" element={<Schemes />} />
              <Route path="/schemes/:id" element={<SchemeDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/ml-demo" element={<MlDemo />} />
              <Route path="/photo-scan" element={<PhotoScan />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/notifications" element={<Protected><Notifications /></Protected>} />

              {/* Applicant — with sidebar per skill */}
              <Route path="/applicant/dashboard" element={<Protected roles={['applicant']}><WithSidebar role="applicant"><ApplicantDashboard /></WithSidebar></Protected>} />
              <Route path="/applicant/apply/:id" element={<Protected roles={['applicant']}><Apply /></Protected>} />
              <Route path="/applicant/profile" element={<Protected roles={['applicant']}><WithSidebar role="applicant"><Profile /></WithSidebar></Protected>} />
              <Route path="/applicant/timeline/:id" element={<Protected><Timeline /></Protected>} />
              <Route path="/applicant/appeals" element={<Protected><WithSidebar role="applicant"><Appeals /></WithSidebar></Protected>} />
              <Route path="/applicant/grievances" element={<Protected><WithSidebar role="applicant"><Appeals /></WithSidebar></Protected>} />

              {/* Officer — with sidebar */}
              <Route path="/officer/dashboard" element={<Protected roles={['district_officer','scheme_officer','institute_verifier']}><WithSidebar role="officer"><OfficerDashboard /></WithSidebar></Protected>} />
              <Route path="/officer/queue" element={<Protected roles={['district_officer','scheme_officer','institute_verifier']}><Queue /></Protected>} />
              <Route path="/officer/review/:id" element={<Protected roles={['district_officer','scheme_officer','institute_verifier']}><Review /></Protected>} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={<Protected roles={['super_admin','scheme_officer']}><AdminDashboard /></Protected>} />
              <Route path="/admin/schemes" element={<Protected roles={['super_admin','scheme_officer']}><SchemeConfigurator /></Protected>} />
              <Route path="/admin/analytics" element={<Protected roles={['super_admin','auditor']}><Analytics /></Protected>} />
              <Route path="/admin/audit" element={<Protected roles={['super_admin','auditor']}><Audit /></Protected>} />
              <Route path="/admin/fairness" element={<Protected roles={['super_admin','auditor']}><Fairness /></Protected>} />
              <Route path="/admin/simulator" element={<Protected roles={['super_admin','scheme_officer']}><Simulator /></Protected>} />
              <Route path="/admin/users" element={<Protected roles={['super_admin']}><Users /></Protected>} />

              {/* Committee */}
              <Route path="/committee/dashboard" element={<Protected roles={['selection_committee']}><CommitteeDashboard /></Protected>} />

              {/* Finance */}
              <Route path="/finance/dashboard" element={<Protected roles={['finance_officer']}><FinanceStub /></Protected>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <MobileBottomNav />
          <ChatBot />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
