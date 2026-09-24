import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, FileCheck, Clock, Users, ShieldCheck, AlertCircle, Phone, Calendar, Award, ArrowRight, Sparkles, GraduationCap, FileSearch, Layers, TrendingUp, ArrowUpRight, Play, BookOpen, BadgeCheck, Zap } from 'lucide-react'
import api from '../services/api'
import { Card } from '../components/Layout'

export default function Landing() {
  const [schemes, setSchemes] = useState<any[]>([])
  useEffect(()=>{ api.get('/schemes?page_size=3').then(r=>setSchemes(r.data.items)).catch(()=>{}) },[])

  return (
    <div className="min-h-screen bg-transparent">
      {/* Ticker — premium marquee */}
      <div className="bg-[#0B2F3D] text-white text-xs relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#073B4C] via-[#0B2F3D] to-[#0F6B78]"></div>
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center gap-3 h-[36px]">
          <span className="bg-[#F59E0B] text-[#1A1A1A] px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-widest shrink-0">WHAT'S NEW</span>
          <div className="flex-1 flex gap-6 overflow-hidden">
            <span className="truncate flex items-center gap-2"><span className="w-1 h-1 bg-white/60 rounded-full"></span> National Fellowship for ST Students 2026 — Applications open till 60 days</span>
            <span className="hidden md:inline-flex items-center gap-2 truncate"><span className="w-1 h-1 bg-white/40 rounded-full"></span> Scheme configurator: officials can modify forms without code</span>
            <span className="hidden lg:inline-flex items-center gap-2 truncate"><span className="w-1 h-1 bg-white/40 rounded-full"></span> Verification notes are advisory — final decision by officer</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-white/70 text-[11px] font-medium bg-white/10 rounded-full px-2.5 py-1 border border-white/10"><Calendar className="w-3 h-3" /> 23 Sep 2026</span>
        </div>
      </div>

      {/* Hero — premium bento, glass, gradient orbs */}
      <section className="relative overflow-hidden">
        {/* background orbs */}
        <div className="absolute inset-0 tribal-motif"></div>
        <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-[#E6F6F8] rounded-full blur-[80px] opacity-60 pointer-events-none"></div>
        <div className="absolute top-40 -left-24 w-[440px] h-[440px] bg-[#FFF7ED] rounded-full blur-[80px] opacity-50 pointer-events-none"></div>
        
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="grid lg:grid-cols-[1.35fr_0.95fr] gap-6 lg:gap-8 items-start">
            {/* Left — editorial hero */}
            <div className="relative">
              <div className="inline-flex items-center gap-2 bg-white border border-[#E3E9ED] rounded-full px-3 py-1.5 shadow-soft">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[11px] font-bold tracking-widest text-[#073B4C] uppercase">Ministry of Tribal Affairs</span>
                <span className="w-px h-3 bg-[#E3E9ED]"></span>
                <span className="text-[11px] font-semibold text-[#6B7A8A]">Government of India • Prototype</span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-[#F59E0B] text-white rounded-full px-2 py-0.5 ml-1">Live</span>
              </div>

              <h1 className="mt-5 text-[32px] sm:text-[44px] font-extrabold tracking-tight leading-[0.95]">
                <span className="bg-gradient-to-br from-[#073B4C] via-[#0F6B78] to-[#0E8A9A] bg-clip-text text-transparent">TribalScholar</span>
                <span className="block font-display font-bold text-[#172B35] text-[26px] sm:text-[30px] mt-1">Scholarship & Fellowship Portal</span>
              </h1>

              <p className="mt-4 text-[15px] leading-relaxed text-[#2D3E4D] max-w-[600px] font-medium border-l-[3px] border-[#F59E0B] pl-4">
                A <span className="text-[#073B4C] font-bold">configurable platform</span> to manage ST education schemes — forms, documents, eligibility and workflow are configured by officials, not developers.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#5A6B7A] max-w-[620px]">
                Apply, upload and track status online. Documents are checked for completeness and readability; possible spelling variations are flagged for officer review. <span className="font-semibold text-[#172B35] bg-[#F0FAFB] px-1.5 py-0.5 rounded">Officers make final decisions with recorded reasons and audit trail.</span>
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                <Link to="/schemes" className="h-[44px] px-6 inline-flex items-center gap-2 bg-[#073B4C] text-white rounded-full text-sm font-bold hover:bg-[#0A4A5E] shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all">
                  View schemes <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/register" className="h-[44px] px-6 inline-flex items-center bg-white border border-[#E3E9ED] text-[#073B4C] rounded-full text-sm font-bold hover:bg-[#F8FAFB] hover:border-[#D7E0E5] shadow-soft hover:shadow-card transition-all">
                  New registration
                </Link>
                <Link to="/login" className="h-[44px] px-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#5A6B7A] hover:text-[#073B4C] transition-colors">
                  <span className="w-8 h-8 rounded-full bg-white border border-[#E3E9ED] flex items-center justify-center shadow-soft"><Users className="w-4 h-4" /></span> Officer / Admin Login
                </Link>
              </div>

              {/* Trust strip — bento */}
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-[560px]">
                {[
                  {k:'3', l:'Active schemes', sub:'ST focused'},
                  {k:'750+', l:'Fellowship seats', sub:'PhD / MPhil'},
                  {k:'100%', l:'Audit trail', sub:'Every decision'},
                ].map(s=>(
                  <div key={s.k} className="bg-white border border-[#E3E9ED] rounded-2xl p-3 text-center shadow-soft card-hover">
                    <div className="text-[20px] font-extrabold text-[#073B4C] leading-none">{s.k}</div>
                    <div className="text-xs font-semibold text-[#172B35] leading-tight mt-1">{s.l}</div>
                    <div className="text-[11px] text-[#6B7A8A]">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* Demo access — glass bento, not amber */}
              <div className="mt-6 bg-white border border-[#E3E9ED] rounded-[20px] shadow-card overflow-hidden max-w-[620px]">
                <div className="px-4 py-3 bg-gradient-to-r from-[#073B4C] to-[#0F6B78] text-white flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> DEMO ACCESS — SYNTHETIC DATA</span>
                  <span className="text-[11px] bg-white text-[#073B4C] px-2.5 py-1 rounded-full font-bold">OTP: 123456</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3 p-3">
                  {[
                    {role:'Applicant', mail:'applicant@demo.local', pass:'demo123', accent:'from-[#E6F6F8] to-white'},
                    {role:'Officer', mail:'officer@demo.local', pass:'demo123', accent:'from-[#FFF7ED] to-white'},
                    {role:'Admin', mail:'admin@demo.local', pass:'demo123', accent:'from-[#F0ECF8] to-white'},
                  ].map(c=>(
                    <div key={c.role} className={`bg-gradient-to-br ${c.accent} border border-[#E3E9ED] rounded-2xl p-3`}>
                      <div className="text-[11px] font-bold tracking-widest text-[#6B7A8A] uppercase">{c.role}</div>
                      <div className="font-mono text-xs font-semibold text-[#073B4C] mt-1 break-all">{c.mail}</div>
                      <div className="text-xs text-[#6B7A8A]">{c.pass}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-2 bg-white border border-[#E3E9ED] rounded-full px-3 py-1.5 shadow-soft text-[#5A6B7A]"><Phone className="w-3.5 h-3.5 text-[#0F6B78]" /> Helpdesk: 1800-11-XXXX (10am–5pm)</span>
                <span className="inline-flex items-center gap-1.5 bg-[#F0FAFB] border border-[#E6F6F8] rounded-full px-3 py-1.5 text-[#5A6B7A]">🌐 Hindi / English • Mobile-first • Offline draft</span>
              </div>
            </div>

            {/* Right — stacked bento cards */}
            <div className="space-y-4">
              {/* Featured scheme — premium */}
              <div className="bg-white border border-[#E3E9ED] rounded-[24px] shadow-card overflow-hidden card-hover">
                <div className="h-1 w-full bg-gradient-to-r from-[#073B4C] via-[#0E8A9A] to-[#F59E0B]"></div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 bg-[#073B4C] text-white text-[11px] font-bold tracking-widest px-2.5 py-1 rounded-full">FEATURED • ACTIVE</span>
                    <span className="w-8 h-8 rounded-full bg-[#E6F6F8] border border-[#D6EEF0] flex items-center justify-center"><Award className="w-4 h-4 text-[#0F6B78]" /></span>
                  </div>
                  <div className="text-[16px] font-bold text-[#073B4C] leading-tight mt-3">National Fellowship for ST Students — Demo</div>
                  <div className="text-xs text-[#6B7A8A] mt-1 leading-relaxed">For ST students pursuing MPhil / PhD • Ministry of Tribal Affairs (Demo)</div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                      {l:'Category', v:'ST', icon: Users},
                      {l:'Income limit', v:'₹5,00,000', icon: TrendingUp},
                      {l:'Seats', v:'100', icon: GraduationCap},
                    ].map(i=>(
                      <div key={i.l} className="bg-[#F8FAFB] border border-[#E3E9ED] rounded-2xl p-3 text-center">
                        <i.icon className="w-4 h-4 mx-auto text-[#0F6B78]" />
                        <div className="text-[11px] text-[#6B7A8A] mt-1">{i.l}</div>
                        <div className="text-xs font-extrabold text-[#073B4C]">{i.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between pt-4 border-t border-[#F0F4F6]">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6B7A]"><Calendar className="w-3.5 h-3.5" /> Deadline: 60 days</span>
                    <Link to="/schemes" className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#073B4C] rounded-full px-4 py-2 hover:bg-[#0A4A5E] transition-colors">Details <ArrowUpRight className="w-3.5 h-3.5" /></Link>
                  </div>
                </div>
              </div>

              {/* Notice board — clean */}
              <div className="bg-white border border-[#E3E9ED] rounded-[20px] shadow-soft overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2.5 border-b border-[#F0F4F6]">
                  <span className="w-1 h-6 bg-[#F59E0B] rounded-full"></span>
                  <span className="text-xs font-extrabold tracking-widest text-[#073B4C]">NOTICE BOARD</span>
                  <span className="ml-auto text-[11px] font-medium bg-[#F8FAFB] border border-[#E3E9ED] rounded-full px-2.5 py-1 text-[#6B7A8A]">23 Sep 2026</span>
                </div>
                <div className="divide-y divide-[#F0F4F6]">
                  {[
                    {d:'22 Sep', t:'Scheme configurator updated — new field “Research Area” appears on applicant form automatically.', c:'bg-[#E6F6F8] text-[#0F6B78]'},
                    {d:'20 Sep', t:'Document check detects possible name variation (Hembram / Hembrom) — flagged for officer review, not auto-rejection.', c:'bg-[#FEF3C7] text-[#92400E]'},
                    {d:'18 Sep', t:'Merit score breakdown and audit timeline now visible to applicants.', c:'bg-[#F0ECF8] text-[#5B3F91]'},
                  ].map(n=>(
                    <div key={n.d} className="px-4 py-3 flex gap-3 hover:bg-[#FDFCFB] transition-colors">
                      <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full h-fit ${n.c}`}>{n.d}</span>
                      <span className="text-xs leading-relaxed text-[#2D3E4D]">{n.t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ML & Chatbot — gradient bento */}
              <div className="relative overflow-hidden rounded-[20px] border border-[#D6EEF0] shadow-card">
                <div className="absolute inset-0 bg-gradient-to-br from-[#073B4C] via-[#0F6B78] to-[#0E8A9A]"></div>
                <div className="absolute inset-0 opacity-10" style={{backgroundImage:`url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M0 0h20L0 20z'/%3E%3C/g%3E%3C/svg%3E")`}}></div>
                <div className="relative p-5 text-white">
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-[#073B4C] text-[11px] font-extrabold px-2.5 py-1 rounded-full">NEW</span>
                    <span className="text-xs font-bold tracking-widest">Chatbot & ML models — try Sahayak</span>
                    <span className="ml-auto w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center"><Sparkles className="w-4 h-4" /></span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/90 mt-3">Bilingual <b className="text-white">Sahayak</b> (EN/हि) + 5 ML models + <b className="text-white">photo scan</b> for fake-document check are live. ELA, blur map, EXIF — advisory, no auto-reject.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Link to="/photo-scan" className="h-9 px-4 inline-flex items-center gap-1.5 bg-white text-[#073B4C] rounded-full text-xs font-bold hover:bg-[#F8FAFB] transition-colors shadow-soft">Try photo scan <Zap className="w-3.5 h-3.5 text-[#F59E0B]" /></Link>
                    <Link to="/ml-demo" className="h-9 px-4 inline-flex items-center bg-white/10 border border-white/20 text-white rounded-full text-xs font-bold hover:bg-white/15 backdrop-blur transition-colors">Explore ML & chatbot</Link>
                  </div>
                </div>
              </div>

              {/* Important info — minimal */}
              <div className="bg-white border border-[#E3E9ED] rounded-[16px] shadow-soft overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#F0F4F6] text-xs font-bold tracking-widest text-[#073B4C] flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#0F6B78]" /> Important Information</div>
                <div className="divide-y divide-[#F0F4F6] text-xs">
                  <div className="flex justify-between px-4 py-2.5"><span className="text-[#6B7A8A]">Application status</span><span className="font-semibold text-[#073B4C]">Dashboard → Timeline</span></div>
                  <div className="flex justify-between px-4 py-2.5"><span className="text-[#6B7A8A]">Deficiency correction</span><span className="font-semibold text-[#073B4C]">Within deadline</span></div>
                  <div className="flex justify-between px-4 py-2.5"><span className="text-[#6B7A8A]">Appeal / Grievance</span><span className="font-semibold text-[#073B4C]">My Appeals</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to apply — bento steps */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-[18px] font-extrabold tracking-tight text-[#073B4C] flex items-center gap-3">
            <span className="w-1 h-6 bg-[#F59E0B] rounded-full"></span> How to apply
            <span className="hidden sm:inline text-xs font-semibold tracking-widest text-[#6B7A8A] bg-white border border-[#E3E9ED] rounded-full px-3 py-1 ml-2">4 simple steps</span>
          </h2>
          <span className="hidden md:inline text-xs text-[#6B7A8A]">No code • No developer needed</span>
        </div>
        <div className="grid md:grid-cols-4 gap-4 mt-6">
          {[
            {n:"01", title:"Admin configures scheme", desc:"Fields, documents, rules, seats, dates and score weights are set without code. Versioned and audited.", icon: Layers, accent:"from-[#E6F6F8] to-white"},
            {n:"02", title:"Applicant fills dynamic form", desc:"Form and required documents are generated from configuration. Draft saved locally and on server.", icon: FileCheck, accent:"from-[#FFF7ED] to-white"},
            {n:"03", title:"System checks assist", desc:"Completeness, readability and consistency are checked; possible issues receive a verification note.", icon: FileSearch, accent:"from-[#F0ECF8] to-white"},
            {n:"04", title:"Officer decides", desc:"Eligibility, selection and sanction are decided by authorised officers with recorded reasons.", icon: ShieldCheck, accent:"from-[#DCFCE7]/50 to-white"},
          ].map(c=>(
            <div key={c.n} className={`group relative bg-gradient-to-br ${c.accent} border border-[#E3E9ED] rounded-[20px] p-5 shadow-soft card-hover overflow-hidden`}>
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-black/[0.02] to-transparent rounded-full blur-xl"></div>
              <div className="w-10 h-10 rounded-2xl bg-[#073B4C] text-white flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform">
                <c.icon className="w-5 h-5" />
              </div>
              <div className="text-[11px] font-extrabold tracking-widest text-[#0F6B78] mt-3">{c.n}</div>
              <div className="text-sm font-bold text-[#073B4C] leading-tight mt-1">{c.title}</div>
              <div className="text-xs leading-relaxed text-[#5A6B7A] mt-2">{c.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Two columns — applicant / officer */}
      <section className="relative">
        <div className="absolute inset-0 bg-white border-y border-[#E3E9ED]"></div>
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#FDFCFB] to-white border border-[#E3E9ED] rounded-[20px] p-6 shadow-soft">
              <div className="inline-flex items-center gap-2 bg-[#073B4C] text-white rounded-full px-3 py-1 text-xs font-bold tracking-wide"><FileCheck className="w-3.5 h-3.5" /> For Applicants</div>
              <ul className="mt-4 space-y-3">
                {[
                  "Mobile-first, low-connectivity friendly: draft autosave, compressed upload, retry on failure.",
                  "Clear eligibility summary, document checklist, and visual status timeline.",
                  "System extracts fields; you confirm before submit. Hindi/English toggle.",
                  "Deficiency notices, appeal and grievance tracking with officer response."
                ].map(t=>(
                  <li key={t} className="flex gap-3 text-sm leading-relaxed text-[#2D3E4D]">
                    <span className="w-6 h-6 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="w-3.5 h-3.5 text-[#166534]" /></span> {t}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#0F6B78] hover:text-[#073B4C]">Create account <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="bg-gradient-to-br from-[#F0FAFB] to-white border border-[#E3E9ED] rounded-[20px] p-6 shadow-soft">
              <div className="inline-flex items-center gap-2 bg-white border border-[#E3E9ED] text-[#073B4C] rounded-full px-3 py-1 text-xs font-bold tracking-wide"><Users className="w-3.5 h-3.5" /> For Officers</div>
              <ul className="mt-4 space-y-3">
                {[
                  "Queue with filters: status, scheme, district, verification notes.",
                  "Single-screen verification: applicant + documents + system notes + merit.",
                  "Deterministic eligibility (expected vs actual) and explainable merit breakdown.",
                  "Audit log, analytics, fairness monitoring and scheme simulator."
                ].map(t=>(
                  <li key={t} className="flex gap-3 text-sm leading-relaxed text-[#2D3E4D]">
                    <span className="w-6 h-6 rounded-full bg-[#E6F6F8] border border-[#D6EEF0] flex items-center justify-center shrink-0 mt-0.5"><CheckCircle className="w-3.5 h-3.5 text-[#0F6B78]" /></span> {t}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#0F6B78] hover:text-[#073B4C]">Officer login <ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verification approach */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-10">
        <h2 className="text-[18px] font-extrabold tracking-tight text-[#073B4C] flex items-center gap-3">
          <span className="w-1 h-6 bg-[#073B4C] rounded-full"></span> Verification — advisory, not automatic
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] rounded-full px-2.5 py-1"><ShieldCheck className="w-3 h-3" /> Human-in-the-loop</span>
        </h2>
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {[
            {title:"What system checks", icon: FileSearch, items:["Field extraction with confidence","Readability / crop / blank detection","Name / DOB / institution comparison (fuzzy)","Duplicate indicators & review priority"], color:"bg-[#F8FAFB] border-[#E3E9ED]"},
            {title:"What officers do", icon: Users, items:["Final eligibility, selection, sanction","Payment release with reason","Override notes with recorded rationale","Every action audited"], color:"bg-[#F0FAFB] border-[#D6EEF0]"},
            {title:"Transparency", icon: Award, items:["Rule: expected vs actual → PASS/FAIL","Review priority with reasons","Merit components shown","Complete timeline"], color:"bg-[#FDFCFB] border-[#F0EBE0]"},
          ].map(c=>(
            <div key={c.title} className={`${c.color} border rounded-[20px] p-5 shadow-soft`}>
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E3E9ED] flex items-center justify-center shadow-soft"><c.icon className="w-5 h-5 text-[#073B4C]" /></div>
              <div className="text-sm font-bold text-[#073B4C] mt-3">{c.title}</div>
              <ul className="mt-3 space-y-1.5">
                {c.items.map(i=>(
                  <li key={i} className="flex gap-2 text-xs leading-relaxed text-[#5A6B7A]"><span className="w-1 h-1 bg-[#0F6B78] rounded-full mt-2 shrink-0"></span> {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-6 bg-gradient-to-r from-[#FFFBEB] to-white border border-[#FDE68A] rounded-2xl px-4 py-3 flex gap-3 items-start">
          <span className="w-8 h-8 rounded-full bg-white border border-[#FDE68A] flex items-center justify-center shrink-0"><AlertCircle className="w-4 h-4 text-[#92400E]" /></span>
          <span className="text-xs leading-relaxed text-[#7C4D0A]"><b>Example:</b> Application <span className="font-mono bg-white border border-[#FDE68A] px-1.5 py-0.5 rounded-full">Laxmi Hembram</span> vs Marksheet <span className="font-mono bg-white border border-[#FDE68A] px-1.5 py-0.5 rounded-full">Laxmi Hembrom</span> — similarity high → <span className="font-bold text-[#92400E]">Verification note: possible spelling variation. Officer reviewed and approved.</span> No automatic rejection.</span>
        </div>
      </section>

      {/* Schemes — bento table */}
      <section className="relative">
        <div className="absolute inset-0 bg-white border-t border-[#E3E9ED]"></div>
        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-[16px] font-extrabold tracking-tight text-[#073B4C] flex items-center gap-2"><Layers className="w-4 h-4 text-[#0F6B78]" /> Available schemes <span className="text-xs font-semibold bg-[#F0FAFB] border border-[#E3E9ED] rounded-full px-2.5 py-1 text-[#6B7A8A]">Demo • Configurable</span></h3>
            <Link to="/schemes" className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-white bg-[#073B4C] rounded-full px-4 py-2 hover:bg-[#0A4A5E] transition-colors">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="mt-4 overflow-hidden border border-[#E3E9ED] rounded-[16px] shadow-soft bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F8FAFB] text-[11px] tracking-widest uppercase text-[#6B7A8A]">
                    <th className="text-left px-4 py-3 font-bold border-b border-[#E3E9ED]">Scheme</th>
                    <th className="text-left px-4 py-3 font-bold border-b border-[#E3E9ED]">Level</th>
                    <th className="text-left px-4 py-3 font-bold border-b border-[#E3E9ED]">Category</th>
                    <th className="text-left px-4 py-3 font-bold border-b border-[#E3E9ED]">Income limit</th>
                    <th className="text-left px-4 py-3 font-bold border-b border-[#E3E9ED]">Seats</th>
                    <th className="text-left px-4 py-3 font-bold border-b border-[#E3E9ED]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F4F6]">
                  {schemes.map(s=>(
                    <tr key={s.id} className="hover:bg-[#FDFCFB] transition-colors group">
                      <td className="px-4 py-3"><div className="font-bold text-[#073B4C] group-hover:text-[#0F6B78] transition-colors">{s.name}</div><div className="text-[11px] text-[#6B7A8A] line-clamp-1">{s.description}</div></td>
                      <td className="px-4 py-3"><span className="inline-flex bg-[#F0FAFB] border border-[#E3E9ED] rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#073B4C]">{s.education_level}</span></td>
                      <td className="px-4 py-3"><span className="inline-flex bg-[#E6F6F8] border border-[#D6EEF0] rounded-full px-2.5 py-1 text-[11px] font-bold text-[#0F6B78]">{s.target_category}</span></td>
                      <td className="px-4 py-3 font-semibold text-[#073B4C]">₹{s.income_limit?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3"><span className="font-mono bg-white border border-[#E3E9ED] rounded-full px-2 py-1">{s.seats}</span></td>
                      <td className="px-4 py-3"><Link to={`/schemes/${s.id}`} className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-white border border-[#E3E9ED] text-[#073B4C] rounded-full text-[11px] font-bold hover:bg-[#073B4C] hover:text-white hover:border-[#073B4C] transition-all">View <ArrowUpRight className="w-3 h-3" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6B7A8A]">
            <span className="w-1 h-1 bg-[#0F6B78] rounded-full"></span> All schemes are configurable: officials change fields, documents and rules without code.
            <Link to="/schemes" className="sm:hidden ml-auto inline-flex items-center gap-1 text-xs font-bold text-[#0F6B78]">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
