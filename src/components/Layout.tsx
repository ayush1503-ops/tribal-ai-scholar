import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePortal } from '../context/PortalContext'
import { ASSETS } from '../assets/branding'
import {
  Search,
  Bell,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  LogOut,
  ExternalLink,
  Shield,
  FileText,
  User,
  Settings,
  Sparkles
} from 'lucide-react'

export const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const {
    viewMode,
    setViewMode,
    setIsCommandPaletteOpen,
    setIsUploadModalOpen
  } = usePortal()

  const location = useLocation()
  const navigate = useNavigate()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifMenu, setShowNotifMenu] = useState(false)

  const navTabs = [
    { label: 'Dashboard', path: '/' },
    { label: 'Scholarships & Fellowships', path: '/schemes' },
    { label: 'My Applications', path: '/applicant/dashboard' },
    { label: 'Document Vault', path: '/photo-scan' },
    { label: 'Scholar AI Advisor', path: '/ml-demo' },
    { label: 'Admin Console', path: '/admin/dashboard' }
  ]

  const isTabActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  const handleModeSwitch = (mode: 'student' | 'admin') => {
    setViewMode(mode)
    if (mode === 'admin') {
      navigate('/admin/dashboard')
    } else {
      navigate('/')
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      {/* Top Bar: Brand, Search, Role Switcher, Notifications, Profile */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center shadow-xs">
              <img
                src={ASSETS.emblemPortal}
                alt="Tribal AI Scholar Emblem"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none'
                }}
              />
            </div>
            <div className="leading-tight">
              <div className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                Tribal AI Scholar
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                National Scholarship & Fellowship Portal
              </div>
            </div>
          </Link>

          {/* Search Bar with ⌘K */}
          <div className="flex-1 max-w-xl mx-2 hidden md:block">
            <div
              onClick={() => setIsCommandPaletteOpen(true)}
              className="relative flex items-center w-full h-10 px-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg cursor-pointer text-slate-400 text-sm transition-all"
            >
              <Search className="w-4 h-4 mr-2.5 text-slate-400 shrink-0" />
              <span className="truncate">Search scholarships, fellowships, eligibility...</span>
              <kbd className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-2xs">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle: Student View | Admin View */}
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleModeSwitch('student')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'student'
                    ? 'bg-[#003748] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Student View
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('admin')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === 'admin'
                    ? 'bg-[#003748] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin View
              </button>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 relative transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
                  2
                </span>
              </button>

              {showNotifMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>Notifications (2)</span>
                    <span className="text-[10px] text-teal-700 cursor-pointer font-medium hover:underline">Mark all read</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 space-y-1">
                      <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        Income Certificate Expired
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        MoTA requested fresh FY 2025-26 income proof for Application #MOTA-2026-ST-8812.
                      </p>
                      <button
                        onClick={() => {
                          setShowNotifMenu(false)
                          setIsUploadModalOpen(true)
                        }}
                        className="text-[11px] text-teal-800 font-semibold underline"
                      >
                        Upload now →
                      </button>
                    </div>
                    <div className="py-2.5 space-y-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        DigiLocker Synced
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        ST Community Certificate authenticated with state registry.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Help Icon */}
            <Link
              to="/about"
              className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
              title="Help & FAQ"
            >
              <HelpCircle className="w-4 h-4" />
            </Link>

            {/* User Profile Capsule */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2.5 pl-1.5 pr-2 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img
                    src={viewMode === 'student' ? ASSETS.avatarAyush : ASSETS.avatarOfficer}
                    alt={viewMode === 'student' ? 'Ayush M.' : 'Rajesh Kumar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=Ayush'
                    }}
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border border-white" />
                </div>
                <div className="text-left hidden lg:block leading-tight pr-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {viewMode === 'student' ? 'Ayush M.' : (user?.full_name || 'Dr. Rajesh K.')}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full inline-block" />
                    {viewMode === 'student' ? 'Profile 80% Complete' : 'Nodal Officer Verified'}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{viewMode === 'student' ? 'Ayush M.' : 'Rajesh Kumar'}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {viewMode === 'student' ? 'ayush.m@nitjsr.ac.in' : 'officer@demo.local'}
                    </div>
                  </div>
                  <Link
                    to="/applicant/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400" /> View Profile & Vault
                  </Link>
                  <Link
                    to="/applicant/dashboard"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> My Applications
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false)
                      logout()
                    }}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-header Navigation Tabs */}
      <nav className="border-t border-slate-100 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto">
          <div className="flex items-center gap-8 text-[13px] font-medium whitespace-nowrap min-w-max">
            {navTabs.map((tab) => {
              const active = isTabActive(tab.path)
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`py-3 transition-colors relative ${
                    active
                      ? 'text-slate-900 font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#003748] rounded-t-sm" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </header>
  )
}

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16 py-6 text-xs text-slate-500">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-medium text-slate-700">
          <span>Tribal AI Scholar</span>
          <span className="text-slate-300">•</span>
          <span>Ministry of Tribal Affairs Fellowship Network</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-600">
          <a href="#" className="hover:text-slate-900 transition-colors">National Security Framework</a>
          <a href="#" className="hover:text-slate-900 transition-colors">DigiLocker Verification</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Accessibility (GIGW)</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
        </div>
      </div>
    </footer>
  )
}

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 shadow-2xs ${className}`}>
      {children}
    </div>
  )
}

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStyle = () => {
    switch (status) {
      case 'SELECTED':
      case 'VERIFIED':
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      case 'DEFICIENCY_RAISED':
      case 'ACTION_NEEDED':
      case 'PENDING_DOCUMENT':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      case 'REJECTED':
        return 'bg-red-50 text-red-800 border-red-200'
      case 'OFFICER_SCRUTINY':
      case 'COMMITTEE_REVIEW':
        return 'bg-blue-50 text-blue-800 border-blue-200'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200'
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getStyle()}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export const Sidebar: React.FC<{ role: string }> = ({ role }) => {
  const location = useLocation()
  const applicantNav = [
    { label: 'Overview', path: '/applicant/dashboard', icon: User },
    { label: 'My Profile & Vault', path: '/applicant/profile', icon: FileText },
    { label: 'Appeals & Grievances', path: '/applicant/appeals', icon: AlertTriangle },
    { label: 'Document Scanner', path: '/photo-scan', icon: Shield },
    { label: 'Scholar AI Advisor', path: '/ml-demo', icon: Sparkles }
  ]

  const officerNav = [
    { label: 'Officer Desk', path: '/officer/dashboard', icon: User },
    { label: 'Verification Queue', path: '/officer/queue', icon: FileText },
    { label: 'Scheme Configurator', path: '/admin/schemes', icon: Settings },
    { label: 'Audit Trail', path: '/admin/audit', icon: Shield },
    { label: 'Fairness Simulator', path: '/admin/simulator', icon: Sparkles }
  ]

  const items = role === 'officer' ? officerNav : applicantNav

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1 shadow-2xs sticky top-28">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
          {role === 'officer' ? 'Officer Workspace' : 'Scholar Workspace'}
        </div>
        {items.map((item) => {
          const active = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                active
                  ? 'bg-[#003748] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}

export const MobileBottomNav: React.FC = () => {
  const location = useLocation()
  const items = [
    { label: 'Dashboard', path: '/', icon: User },
    { label: 'Schemes', path: '/schemes', icon: FileText },
    { label: 'Vault', path: '/photo-scan', icon: Shield },
    { label: 'Advisor', path: '/ml-demo', icon: Sparkles }
  ]

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-4 py-2 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const active = location.pathname === item.path
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
              active ? 'text-[#003748] font-bold' : 'text-slate-500'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

export const StatusChip: React.FC<{ status: string; applicantView?: boolean }> = ({ status }) => {
  return <StatusBadge status={status} />
}

export const ProgressStepper: React.FC<{
  steps: (string | { label: string; done?: boolean; current?: boolean })[]
  currentStep?: number
  current?: number
}> = ({ steps, currentStep, current: currentProp }) => {
  const activeIndex = currentProp !== undefined ? currentProp : currentStep || 0
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2">
      {steps.map((step, i) => {
        const label = typeof step === 'string' ? step : step.label
        const done = typeof step === 'string' ? i < activeIndex : step.done
        const current = typeof step === 'string' ? i === activeIndex : step.current
        return (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done
                  ? 'bg-emerald-600 text-white'
                  : current
                  ? 'bg-[#003748] text-white'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {done ? '✓' : i + 1}
            </div>
            <span className={`text-xs ${current ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
              {label}
            </span>
            {i < steps.length - 1 && <span className="text-slate-300">→</span>}
          </div>
        )
      })}
    </div>
  )
}

export const FieldHelp: React.FC<{ text?: string; children?: React.ReactNode }> = ({ text, children }) => {
  return <div className="text-[11px] text-slate-500 mt-1">{text || children}</div>
}

export const InlineError: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null
  return <div className="text-xs text-red-600 mt-1">{message}</div>
}

export const EmptyState: React.FC<{ title: string; message: string; actionText?: string; onAction?: () => void }> = ({
  title,
  message,
  actionText,
  onAction
}) => {
  return (
    <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{message}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-3 px-3 py-1.5 bg-[#003748] text-white text-xs font-semibold rounded-lg hover:bg-[#002834]"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}
