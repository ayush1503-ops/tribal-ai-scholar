import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Menu, X, Globe, LogOut, Bell, Shield, Search, Phone, Mail, Home, FileText, HelpCircle, User, LayoutDashboard, ClipboardCheck, Users, BarChart3, Eye, Sparkles, ArrowUpRight, Lock } from 'lucide-react'

export const LanguageSwitcher: React.FC = () => {
  const [lang, setLang] = useState<'en'|'hi'>(() => (localStorage.getItem('lang') as any) || 'en')
  const toggle = () => {
    const nl = lang === 'en' ? 'hi' : 'en'
    setLang(nl)
    localStorage.setItem('lang', nl)
    window.dispatchEvent(new Event('langChange'))
  }
  return (
    <button onClick={toggle} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E3E9ED] rounded-full text-xs font-semibold text-[#073B4C] hover:bg-[#F0FAFB] hover:border-[#C9D6DD] transition-all shadow-soft min-h-[32px]">
      <Globe className="w-3.5 h-3.5 text-[#0F6B78]" />
      {lang === 'en' ? 'हिन्दी' : 'English'}
    </button>
  )
}

export const Header: React.FC = () => {
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Thin premium gradient hairline */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#073B4C] via-[#0E8A9A] to-[#F59E0B] opacity-90" />

      {/* Gov top bar — ultra clean */}
      <div className="bg-[#FDFCFB] border-b border-[#EDE9E0] text-[12px]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between h-[36px] gap-3">
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[#8A7D6B] font-medium tracking-wide text-[11px] uppercase">भारत सरकार</span>
            <span className="hidden sm:inline text-[#EDE9E0]">|</span>
            <span className="font-semibold text-[#073B4C] tracking-tight">Government of India</span>
            <span className="text-[#EDE9E0] hidden sm:inline">|</span>
            <span className="font-medium text-[#2D3E4D] hidden md:inline">Ministry of Tribal Affairs</span>
            <span className="hidden lg:inline-flex items-center gap-1.5 ml-2 pl-2 border-l border-[#EDE9E0] text-[11px] text-[#6B7A8A]">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Prototype • Synthetic data
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <a href="#" className="hidden lg:inline text-[12px] text-[#5A6B7A] hover:text-[#073B4C] font-medium">Help</a>
            <a href="#" className="hidden lg:inline text-[12px] text-[#5A6B7A] hover:text-[#073B4C] font-medium">Sitemap</a>
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {/* Main header — glass, floating feel */}
      <header className="sticky top-0 z-40 glass border-b border-[#E3E9ED]/80 shadow-soft">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-[72px] gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-[48px] h-[48px] rounded-[14px] bg-[#073B4C] flex items-center justify-center text-white shadow-card group-hover:shadow-card-hover transition-all relative overflow-hidden">
                {/* subtle inner gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
                <span className="font-display font-bold text-[18px] tracking-tight relative">Ts</span>
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#F59E0B] rounded-full border-2 border-[#073B4C]"></span>
              </div>
              <div className="leading-tight">
                <div className="text-[16px] font-bold text-[#073B4C] tracking-tight leading-none">TribalScholar</div>
                <div className="text-[12px] text-[#5A6B7A] font-medium tracking-wide">Scholarship & Fellowship</div>
              </div>
              <div className="hidden xl:flex ml-5 pl-5 border-l border-[#E3E9ED] flex-col justify-center h-[42px]">
                <div className="text-[12px] font-semibold text-[#172B35] leading-none">From application to award</div>
                <div className="text-[11px] text-[#6B7A8A] leading-none mt-1">Transparent • Intelligent • Inclusive</div>
              </div>
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="hidden md:flex items-center gap-2">
                <div className="relative group">
                  <input placeholder="Search schemes, documents" className="w-[260px] h-[40px] border border-[#E3E9ED] rounded-full bg-[#F8FAFB] pl-10 pr-4 text-[13px] placeholder:text-[#8A9AA8] focus:bg-white focus:border-[#0E8A9A] focus:ring-4 focus:ring-[#E6F6F8] focus:outline-none transition-all" />
                  <Search className="w-4 h-4 absolute left-3.5 top-[12px] text-[#8A9AA8] group-focus-within:text-[#0E8A9A] transition-colors" />
                  <kbd className="hidden lg:inline absolute right-2 top-2 text-[10px] font-medium bg-white border border-[#E3E9ED] rounded px-1.5 py-1 text-[#8A9AA8] shadow-sm">⌘ K</kbd>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                {user ? (
                  <>
                    <Link to="/notifications" className="w-[40px] h-[40px] flex items-center justify-center bg-white border border-[#E3E9ED] rounded-full hover:bg-[#F8FAFB] hover:border-[#D7E0E5] transition-all relative shadow-soft">
                      <Bell className="w-[18px] h-[18px] text-[#5A6B7A]" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-[#F59E0B] rounded-full border-2 border-white"></span>
                    </Link>
                    <div className="hidden lg:flex items-center gap-3 pl-3 ml-1 border-l border-[#E3E9ED]">
                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}&backgroundColor=073B4C,0F6B78,0E8A9A&textColor=ffffff`} alt="avatar" className="w-9 h-9 rounded-full border-2 border-white shadow-soft" />
                      <div className="text-xs leading-tight hidden xl:block">
                        <div className="font-semibold text-[#172B35] max-w-[140px] truncate">{user.full_name}</div>
                        <div className="text-[11px] text-[#6B7A8A] capitalize">{user.roles[0]?.replace('_',' ')}</div>
                      </div>
                    </div>
                    <button onClick={logout} className="hidden sm:inline-flex items-center gap-1.5 px-3.5 h-[40px] bg-white border border-[#E3E9ED] rounded-full text-xs font-semibold text-[#5A6B7A] hover:bg-[#FFF7ED] hover:border-[#FED7AA] hover:text-[#92400E] transition-all">
                      <LogOut className="w-3.5 h-3.5" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="h-[40px] px-5 inline-flex items-center bg-white border border-[#E3E9ED] rounded-full text-[13px] font-semibold text-[#073B4C] hover:bg-[#F8FAFB] hover:border-[#D7E0E5] transition-all shadow-soft">Log in</Link>
                    <Link to="/register" className="h-[40px] px-5 inline-flex items-center bg-[#073B4C] text-white rounded-full text-[13px] font-semibold hover:bg-[#0A4A5E] shadow-card hover:shadow-card-hover transition-all">
                      Create account <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-70" />
                    </Link>
                  </>
                )}
              </div>
              <button className="md:hidden w-[44px] h-[44px] flex items-center justify-center bg-white border border-[#E3E9ED] rounded-full shadow-soft" onClick={()=>setMobileOpen(!mobileOpen)}>{mobileOpen ? <X className="w-5 h-5 text-[#073B4C]" /> : <Menu className="w-5 h-5 text-[#073B4C]" />}</button>
            </div>
          </div>
        </div>

        {/* Nav — pill segmented, super clean */}
        <div className="border-t border-[#E3E9ED]/60 bg-white/60 backdrop-blur">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
            <div className="hidden md:flex items-center gap-1.5 h-[48px] overflow-x-auto scrollbar-none">
              {[
                {to:'/', label:'Home'},
                {to:'/schemes', label:'Schemes'},
                {to:'/photo-scan', label:'Photo scan'},
                {to:'/ml-demo', label:'ML & Chatbot'},
                {to:'/about', label:'About'},
              ].map(link=>(
                <Link key={link.to} to={link.to} className={`px-4 h-8 inline-flex items-center rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${isActive(link.to) ? 'bg-[#073B4C] text-white shadow-soft' : 'text-[#5A6B7A] hover:bg-[#F0FAFB] hover:text-[#073B4C]'}`}>{link.label}</Link>
              ))}
              <div className="h-5 w-px bg-[#E3E9ED] mx-2 hidden lg:block"></div>
              {user && <Link to="/applicant/dashboard" className={`px-4 h-8 inline-flex items-center rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${isActive('/applicant/dashboard') ? 'bg-[#0F6B78] text-white' : 'text-[#0F6B78] bg-[#E6F6F8] hover:bg-[#D6EEF0]'}`}>My applications</Link>}
              {user?.roles.includes('super_admin') && <Link to="/admin/dashboard" className="px-4 h-8 inline-flex items-center rounded-full text-[13px] font-semibold bg-[#F59E0B] text-white shadow-soft">Admin</Link>}
              {user?.roles.some(r => ['district_officer','scheme_officer','institute_verifier'].includes(r)) && <Link to="/officer/dashboard" className={`px-4 h-8 inline-flex items-center rounded-full text-[13px] font-medium ${isActive('/officer/dashboard') ? 'bg-[#073B4C] text-white' : 'bg-white border border-[#E3E9ED] text-[#073B4C]'}`}>Review queue</Link>}
              {user?.roles.includes('selection_committee') && <Link to="/committee/dashboard" className="px-4 h-8 inline-flex items-center rounded-full text-[13px] font-medium bg-white border border-[#E3E9ED]">Committee</Link>}
              <span className="ml-auto hidden lg:inline-flex items-center gap-2 text-[11px] font-medium text-[#6B7A8A] bg-[#F8FAFB] border border-[#E3E9ED] rounded-full px-3 py-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Live prototype
                <span className="w-px h-3 bg-[#E3E9ED]"></span> <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Advisory only</span>
              </span>
            </div>
            {mobileOpen && (
              <div className="md:hidden py-3 border-t border-[#E3E9ED]">
                <div className="grid gap-2">
                  <div className="relative">
                    <input placeholder="Search schemes, documents" className="w-full h-11 border border-[#E3E9ED] rounded-full bg-[#F8FAFB] pl-10 pr-4 text-sm" />
                    <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#8A9AA8]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/schemes" className="px-4 py-3 bg-white border border-[#E3E9ED] rounded-2xl text-sm font-medium text-center">Schemes</Link>
                    <Link to="/photo-scan" className="px-4 py-3 bg-[#073B4C] text-white rounded-2xl text-sm font-semibold text-center">Photo scan</Link>
                  </div>
                  {user ? (
                    <>
                      <div className="px-4 py-3 bg-gradient-to-br from-[#073B4C] to-[#0F6B78] rounded-2xl text-white flex items-center gap-3">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}&backgroundColor=ffffff&textColor=073B4C`} className="w-10 h-10 rounded-full border-2 border-white/20" alt="" />
                        <div><div className="font-semibold text-sm">{user.full_name}</div><div className="text-xs text-white/70">{user.roles.join(', ')}</div></div>
                      </div>
                      <button onClick={logout} className="w-full py-3 bg-white border border-[#E3E9ED] rounded-full font-semibold text-sm">Sign out</button>
                    </>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link to="/login" className="px-4 py-3 bg-white border border-[#E3E9ED] rounded-full text-center font-semibold text-sm">Log in</Link>
                      <Link to="/register" className="px-4 py-3 bg-[#073B4C] text-white rounded-full text-center font-semibold text-sm">Create account</Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prototype notice — soft pill */}
        <div className="bg-[#F0FAFB] border-y border-[#E6F6F8]">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 bg-white border border-[#D6EEF0] rounded-full px-3 py-1 shadow-soft">
              <Shield className="w-3.5 h-3.5 text-[#0F6B78]" />
              <span className="font-bold text-[#073B4C]">Prototype</span>
              <span className="text-[#5A6B7A] hidden sm:inline">— Synthetic data. Recommendations are preliminary. Final decision by authorised officer.</span>
              <span className="text-[#5A6B7A] sm:hidden">— Synthetic demo</span>
            </span>
            <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-[#6B7A8A] ml-2">
              <Sparkles className="w-3 h-3 text-[#F59E0B]" /> No auto-reject • Full audit trail
            </span>
          </div>
        </div>
      </header>
    </>
  )
}

export const Sidebar: React.FC<{role: string}> = ({role}) => {
  const location = useLocation()
  const isActive = (p: string) => location.pathname.startsWith(p)
  const applicantLinks = [
    {to: "/applicant/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & stats"},
    {to: "/applicant/dashboard", label: "My applications", icon: FileText, desc: "Track all"},
    {to: "/applicant/profile", label: "Profile", icon: User, desc: "Personal details"},
    {to: "/notifications", label: "Notifications", icon: Bell, desc: "Updates"},
    {to: "/applicant/appeals", label: "Help & support", icon: HelpCircle, desc: "Grievance"},
  ]
  const officerLinks = [
    {to: "/officer/dashboard", label: "Overview", icon: LayoutDashboard, desc: "Queue insights"},
    {to: "/officer/queue", label: "Review queue", icon: ClipboardCheck, desc: "Pending verification"},
    {to: "/officer/queue", label: "Applications", icon: FileText, desc: "All applications"},
    {to: "/committee/dashboard", label: "Selection", icon: Users, desc: "Merit ranking"},
    {to: "/admin/dashboard", label: "Reports", icon: BarChart3, desc: "Analytics"},
    {to: "/admin/audit", label: "Audit logs", icon: Eye, desc: "Immutable trail"},
  ]
  const links = role === 'applicant' ? applicantLinks : officerLinks
  return (
    <aside className="hidden lg:block w-[240px] shrink-0">
      <div className="sticky top-[148px] bg-white border border-[#E3E9ED] rounded-[20px] shadow-card overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-br from-[#073B4C] to-[#0F6B78] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
          <div className="relative flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-wide uppercase opacity-90">{role === 'applicant' ? 'Applicant' : 'Officer'} Menu</div>
              <div className="text-[11px] opacity-70 leading-none">Quick navigation</div>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {links.map(l=>(
            <Link key={l.to+l.label} to={l.to} className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive(l.to) ? 'bg-[#073B4C] text-white shadow-soft' : 'text-[#5A6B7A] hover:bg-[#F8FAFB] hover:text-[#073B4C]'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive(l.to) ? 'bg-white/15 text-white' : 'bg-[#F0FAFB] text-[#5A6B7A] group-hover:bg-white group-hover:text-[#073B4C] border border-[#E3E9ED]'}`}>
                <l.icon className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block leading-none ${isActive(l.to) ? 'font-semibold' : 'font-medium'}`}>{l.label}</span>
                <span className={`block text-[11px] leading-none mt-1 ${isActive(l.to) ? 'text-white/70' : 'text-[#8A9AA8]'}`}>{l.desc}</span>
              </span>
              {isActive(l.to) && <span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full"></span>}
            </Link>
          ))}
        </nav>
        <div className="m-2 p-3 bg-[#FDFCFB] border border-[#F0EBE0] rounded-xl">
          <div className="text-xs font-semibold text-[#073B4C] flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" /> Need help?</div>
          <div className="text-[11px] text-[#6B7A8A] leading-relaxed mt-1">Sahayak chatbot bottom-right • Helpdesk 1800-11-XXXX</div>
        </div>
      </div>
    </aside>
  )
}

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return null
  const isApplicant = user.roles.includes('applicant')
  const isActive = (p: string) => location.pathname.startsWith(p)
  return (
    <nav className="lg:hidden fixed bottom-3 left-3 right-3 z-30">
      <div className="max-w-[480px] mx-auto bg-white/90 backdrop-blur-xl border border-[#E3E9ED] rounded-full shadow-floating px-2 py-2 flex justify-around">
        {[
          {to:'/', icon: Home, label:'Home', active: isActive('/') && location.pathname==='/'},
          {to: isApplicant ? '/applicant/dashboard' : '/officer/queue', icon: FileText, label: isApplicant ? 'Apps' : 'Queue', active: isActive(isApplicant ? '/applicant/dashboard' : '/officer')},
          {to:'/photo-scan', icon: Eye, label:'Scan', active: isActive('/photo-scan')},
          {to: isApplicant ? '/applicant/profile' : '/notifications', icon: User, label:'Profile', active: isActive(isApplicant ? '/applicant/profile' : '/notifications')},
        ].map(i=>(
          <Link key={i.to} to={i.to} className={`flex flex-col items-center justify-center gap-1 px-5 py-1.5 rounded-full transition-all ${i.active ? 'bg-[#073B4C] text-white shadow-soft' : 'text-[#6B7A8A]'}`}>
            <i.icon className="w-[18px] h-[18px]" />
            <span className="text-[10px] font-semibold leading-none">{i.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

export const Footer: React.FC = () => (
  <footer className="mt-12">
    {/* Help bar — floating */}
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
      <div className="bg-gradient-to-r from-[#073B4C] to-[#0F6B78] rounded-[20px] text-white p-4 sm:p-5 flex flex-wrap gap-4 items-center justify-between shadow-card relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/15 border border-white/20 flex items-center justify-center"><Phone className="w-5 h-5" /></div>
          <div>
            <div className="text-sm font-bold leading-none">Need help? Helpdesk is here</div>
            <div className="text-xs text-white/80 leading-none mt-1">Mon–Fri 10am–5pm • Response within 24 hours</div>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-3 text-xs">
          <span className="inline-flex items-center gap-2 bg-white text-[#073B4C] rounded-full px-4 py-2 font-semibold shadow-soft"><Phone className="w-3.5 h-3.5" /> 1800-11-XXXX</span>
          <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 font-medium backdrop-blur"><Mail className="w-3.5 h-3.5" /> help-tribalscholar[at]gov[dot]in</span>
        </div>
      </div>
    </div>

    <div className="mt-6 bg-[#0B2F3D] text-white relative overflow-hidden">
      {/* subtle pattern */}
      <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>
      <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[#073B4C] flex items-center justify-center font-bold">Ts</div>
              <div><div className="font-bold text-sm">TribalScholar</div><div className="text-xs text-white/60">Ministry of Tribal Affairs • Prototype</div></div>
            </div>
            <p className="text-xs leading-relaxed text-white/70 mt-3">From application to award — transparent, intelligent and inclusive. Prototype with synthetic data. System checks assist verification; officers decide. No automatic rejection.</p>
            <div className="mt-4 flex gap-2">
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur"><Shield className="w-3 h-3" /> Advisory only</span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1.5 text-[11px] font-medium backdrop-blur"><Eye className="w-3 h-3" /> Audit trail</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-white/90">Explore</div>
            <ul className="mt-3 space-y-2 text-sm text-white/70">
              <li><a href="/schemes" className="hover:text-white transition-colors">Schemes</a></li>
              <li><a href="/photo-scan" className="hover:text-white transition-colors">Photo scan — fake check</a></li>
              <li><a href="/ml-demo" className="hover:text-white transition-colors">ML & Chatbot demo</a></li>
              <li><a href="/about" className="hover:text-white transition-colors">How it works</a></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-white/90">Demo accounts</div>
            <div className="mt-3 bg-white/10 backdrop-blur border border-white/15 rounded-2xl p-3 font-mono text-xs leading-relaxed">
              <div className="flex justify-between"><span className="text-white/60">Applicant</span><span>applicant@demo.local</span></div>
              <div className="flex justify-between"><span className="text-white/60">Officer</span><span>officer@demo.local</span></div>
              <div className="flex justify-between"><span className="text-white/60">Admin</span><span>admin@demo.local</span></div>
              <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center"><span className="text-white/60">OTP (simulated)</span><span className="bg-white text-[#073B4C] px-2 py-0.5 rounded-full font-bold">123456</span></div>
              <div className="text-[11px] text-white/50 mt-1">Password for all: <b className="text-white">demo123</b></div>
            </div>
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-white/90">Our promise</div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-white/70">
              <li className="flex gap-2"><span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full mt-1.5 shrink-0"></span> We will never make a final decision using AI alone</li>
              <li className="flex gap-2"><span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full mt-1.5 shrink-0"></span> Your document is private — only authorised officials can access</li>
              <li className="flex gap-2"><span className="w-1.5 h-1.5 bg-[#F59E0B] rounded-full mt-1.5 shrink-0"></span> Every decision shows rule, evidence and reason</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10 bg-[#082533]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-3 justify-between text-xs text-white/50">
          <span>© 2026 TribalScholar Prototype — Not a government system. For demonstration only. Built with care for accessibility.</span>
          <span className="flex gap-4"><a href="#" className="hover:text-white">Privacy</a><a href="#" className="hover:text-white">Terms</a><a href="#" className="hover:text-white">Accessibility</a></span>
        </div>
      </div>
    </div>
  </footer>
)

export const Card: React.FC<{children: React.ReactNode, className?: string}> = ({children, className=""}) => (
  <div className={`bg-white border border-[#E3E9ED] rounded-[16px] shadow-card ${className}`}>{children}</div>
)

export const StatusChip: React.FC<{status: string, applicantView?: boolean}> = ({status, applicantView=false}) => {
  const config: any = {
    DRAFT: { label: 'Draft', color: 'bg-[#F8FAFB] text-[#5A6B7A] border-[#E3E9ED]', dot: 'bg-[#8A9AA8]' },
    SUBMITTED: { label: applicantView ? 'Submitted' : 'Submitted', color: 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]', dot: 'bg-[#0EA5E9]' },
    AUTOMATED_CHECK: { label: applicantView ? 'Checks in progress' : 'Automated check', color: 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]', dot: 'bg-[#0EA5E9]' },
    DEFICIENCY_RAISED: { label: applicantView ? 'Action required' : 'Deficiency raised', color: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]', dot: 'bg-[#F59E0B]' },
    RESUBMITTED: { label: 'Resubmitted', color: 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]', dot: 'bg-[#0EA5E9]' },
    INSTITUTE_VERIFICATION: { label: applicantView ? 'Institute verification pending' : 'Institute verification', color: 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]', dot: 'bg-[#0EA5E9]' },
    OFFICER_SCRUTINY: { label: applicantView ? 'Under review' : 'Officer scrutiny', color: 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]', dot: 'bg-[#0EA5E9]' },
    COMMITTEE_REVIEW: { label: 'Committee review', color: 'bg-[#F0ECF8] text-[#5B3F91] border-[#DDD6FE]', dot: 'bg-[#8B5CF6]' },
    SELECTED: { label: applicantView ? 'Selected, subject to final sanction' : 'Selected', color: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]', dot: 'bg-[#22C55E]' },
    WAITLISTED: { label: 'Waitlisted', color: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]', dot: 'bg-[#F59E0B]' },
    REJECTED: { label: applicantView ? 'Not selected' : 'Rejected', color: 'bg-[#FEE4E2] text-[#B42318] border-[#FECACA]', dot: 'bg-[#EF4444]' },
    SANCTIONED: { label: 'Sanctioned', color: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]', dot: 'bg-[#22C55E]' },
    PAYMENT_RELEASED: { label: 'Payment released', color: 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]', dot: 'bg-[#22C55E]' },
  }
  const c = config[status] || { label: status.replace(/_/g,' '), color: 'bg-[#F8FAFB] text-[#5A6B7A] border-[#E3E9ED]', dot: 'bg-[#8A9AA8]' }
  return <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.color}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>{c.label}</span>
}
export const StatusBadge = StatusChip

export const ProgressStepper: React.FC<{steps: string[], current: number}> = ({steps, current}) => (
  <div className="flex items-center gap-1 overflow-x-auto py-2">
    {steps.map((s,i)=>(
      <div key={s} className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-all ${i < current ? 'bg-[#073B4C] text-white border-[#073B4C]' : i===current ? 'bg-white text-[#073B4C] border-[#073B4C] shadow-soft' : 'bg-white text-[#8A9AA8] border-[#E3E9ED]'}`}>{i < current ? '✓' : i+1}</div>
        <span className={`text-xs whitespace-nowrap ${i===current ? 'font-bold text-[#073B4C]' : i < current ? 'font-medium text-[#073B4C]' : 'text-[#8A9AA8]'}`}>{s}</span>
        {i < steps.length-1 && <span className={`w-8 h-[2px] mx-1 rounded-full ${i < current ? 'bg-[#073B4C]' : 'bg-[#E3E9ED]'}`}></span>}
      </div>
    ))}
  </div>
)

export const EmptyState: React.FC<{title: string, desc: string, action?: React.ReactNode}> = ({title, desc, action}) => (
  <div className="border border-dashed border-[#E3E9ED] rounded-[20px] bg-gradient-to-br from-[#FDFCFB] to-[#F8FAFB] p-10 text-center">
    <div className="w-14 h-14 bg-white border border-[#E3E9ED] rounded-2xl flex items-center justify-center mx-auto shadow-soft"><FileText className="w-6 h-6 text-[#8A9AA8]" /></div>
    <div className="font-bold text-[#073B4C] mt-4">{title}</div>
    <div className="text-sm text-[#6B7A8A] mt-1 max-w-md mx-auto leading-relaxed">{desc}</div>
    {action && <div className="mt-5">{action}</div>}
  </div>
)

export const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse space-y-3">
    <div className="h-4 bg-[#E6F6F8] rounded-full w-3/4 shimmer"></div>
    <div className="h-4 bg-[#F0FAFB] rounded-full shimmer"></div>
    <div className="h-24 bg-[#F8FAFB] rounded-2xl border border-[#E3E9ED] shimmer"></div>
  </div>
)

export const FieldHelp: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div className="text-xs text-[#6B7A8A] mt-1.5 flex items-center gap-1"><span className="w-1 h-1 bg-[#8A9AA8] rounded-full"></span> {children}</div>
)

export const InlineError: React.FC<{message: string}> = ({message}) => (
  <div className="text-xs text-[#B42318] mt-1.5 flex items-center gap-1.5 bg-[#FEF2F2] border border-[#FECACA] rounded-full px-3 py-1 w-fit"><span className="w-4 h-4 bg-[#FEE4E2] border border-[#FECACA] rounded-full flex items-center justify-center text-[10px] font-bold">!</span> {message}</div>
)
