import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePortal, DEFAULT_SCHEMES, SchemeItem } from '../context/PortalContext'
import { Card } from '../components/Layout'
import {
  Upload,
  AlertTriangle,
  Clock,
  Compass,
  Briefcase,
  Calendar,
  Bookmark,
  MapPin,
  CheckCircle,
  RefreshCw,
  Landmark,
  Headphones,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  FileCheck
} from 'lucide-react'

export default function Landing() {
  const navigate = useNavigate()
  const {
    incomeCertStatus,
    setIsUploadModalOpen,
    setIsRemarksModalOpen,
    savedSchemeIds,
    toggleSaveScheme,
    setSelectedSchemeForDetails,
    toggleCompareScheme
  } = usePortal()

  const recommendedSchemes = [
    {
      id: 'nos-int-2026',
      matchScore: 98,
      sourceTag: 'Ministry of Tribal Affairs',
      title: 'National Overseas Fellowship for Tribal Students',
      description: "Provides financial assistance to selected ST candidates for pursuing Master's level courses, Ph.D., and Post-Doctoral research abroad in accredited engineering institutions.",
      chips: ['100% Tuition + Living Stipend', 'ST Category Only', 'Postgraduate / Research'],
      grantAmount: '₹25,00,000',
      grantUnit: '/ yr',
      submissionDate: '15 Nov 2026'
    },
    {
      id: 'mota-top-class-st',
      matchScore: 95,
      sourceTag: 'Central Sector Scheme',
      title: 'Top Class Education Scheme for ST Students',
      description: 'Direct central funding for meritorious ST students admitted into notified premier institutions (IITs, NITs, IIMs) covering total non-refundable tuition and living expenses.',
      chips: ['Full Fee Waiver', '₹45,000 Laptop Grant', 'B.Tech / Undergraduate'],
      grantAmount: '₹2,00,000',
      grantUnit: '/ yr',
      submissionDate: '31 Oct 2026'
    },
    {
      id: 'aicte-pragati-saksham',
      matchScore: 92,
      sourceTag: 'AICTE & Tribal Welfare',
      title: 'Pragati & Saksham Special STEM Fellowship',
      description: 'Encouragement grants specifically tailored for tribal students in technical diploma and degree programs with focus on emerging technologies and computational sciences.',
      chips: ['Contingency Allowance', 'STEM Only'],
      grantAmount: '₹50,000',
      grantUnit: '/ yr',
      submissionDate: '20 Nov 2026'
    }
  ]

  const handleApply = (schemeId: string, title: string) => {
    navigate('/schemes')
  }

  const handleOpenDetails = (id: string) => {
    const s = DEFAULT_SCHEMES.find(item => item.id === id) || DEFAULT_SCHEMES[0]
    setSelectedSchemeForDetails(s)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Hero Identity Banner */}
      <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Soft background shape */}
        <div className="absolute top-0 right-0 w-[420px] h-full bg-gradient-to-l from-sky-50/70 to-transparent pointer-events-none rounded-r-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
              <span className="text-teal-900 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded text-[11px]">
                IDENTITY VERIFIED • DIGILOCKER
              </span>
              <span className="text-slate-500 font-medium">Aadhaar Linked (UIDAI)</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-2 pt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Good afternoon, Ayush
              </h1>
              <span className="text-slate-600 font-medium text-base sm:text-lg">
                ST Engineering & Higher Studies Candidate
              </span>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed pt-1">
              You have <strong className="text-slate-900 font-bold">3 verified scholarship matches</strong> closing within 14 days. Complete your updated annual income documentation to unlock premium central grants.
            </p>
          </div>

          {/* Right Action Card */}
          <div className="shrink-0 bg-white/95 border border-slate-200/80 rounded-xl p-4 shadow-sm max-w-sm w-full lg:w-auto">
            {incomeCertStatus === 'renewed' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Income Certificate FY 2025-26 Active</span>
                </div>
                <div className="text-xs text-slate-500">
                  All 3 verified schemes unlocked for immediate final submission.
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                >
                  View Uploaded Document
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-slate-900">Income Certificate Expired</span>
                  <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Action Needed</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003748] hover:bg-[#002834] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Action Required Banner Card */}
      {incomeCertStatus !== 'renewed' && (
        <div className="border border-amber-300/80 bg-amber-50/40 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
              <FileCheck className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">
                  Action Required
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Application Ref #MOTA-2026-ST-8812
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Post-Matric National Fellowship (MoTA)
              </h2>
              <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                The Sponsoring Authority (District Tribal Welfare Cell) requested your re-attested <strong className="font-semibold text-slate-900">Annual Income Certificate for FY 2025-26</strong>. Current verification status is stalled pending this submission.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0 pt-2 md:pt-0">
            <div className="text-left sm:text-right">
              <div className="text-xs font-bold text-amber-800 flex items-center sm:justify-end gap-1">
                <Clock className="w-3.5 h-3.5" /> 4 Days Remaining
              </div>
              <div className="text-[11px] text-slate-500">Deadline: 28 Oct 2026</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRemarksModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                View Remarks
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#92400e] hover:bg-[#78350f] rounded-lg transition-colors shadow-2xs"
              >
                Submit Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Four Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Recommended Opportunities */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Recommended Opportunities</span>
              <Compass className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">8 Schemes</div>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              ST Category, Undergrad B.Tech, Family Income &lt; ₹2.5L
            </p>
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
            <span className="text-emerald-700 font-semibold">3 Closing soon</span>
            <Link to="/schemes" className="text-slate-900 font-semibold hover:text-teal-900 flex items-center gap-1">
              Explore <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 2: Applications in Progress */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Applications in Progress</span>
              <Briefcase className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-extrabold text-slate-900">2 Active</div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 px-2 py-0.5 rounded">
                1 Under Review
              </span>
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                1 Action Req.
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Last updated today</span>
            <Link to="/applicant/dashboard" className="text-slate-900 font-semibold hover:text-teal-900 flex items-center gap-1">
              View status <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 3: Upcoming Deadlines */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Upcoming Deadlines</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">12 Oct 2026</div>
            <p className="text-xs text-slate-500 mt-1 truncate">National Overseas Fellowship</p>
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
            <span className="text-amber-800 font-semibold">18 Days Left</span>
            <Link to="/schemes" className="text-slate-900 font-semibold hover:text-teal-900 flex items-center gap-1">
              Calendar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 4: Saved Opportunities */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Saved Opportunities</span>
              <Bookmark className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{savedSchemeIds.length} Schemes</div>
            <p className="text-xs text-slate-500 mt-1">Readiness Index: 88%</p>
          </div>
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
            <span className="text-emerald-700 font-semibold">2 Schemes eligible</span>
            <Link to="/schemes" className="text-slate-900 font-semibold hover:text-teal-900 flex items-center gap-1">
              Bookmarks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* 4. Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Recommended For You (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Recommended For You</h2>
              <span className="text-[11px] font-semibold text-teal-900 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-teal-700" /> AI Match Engine v2.4
              </span>
            </div>
            <Link to="/schemes" className="text-xs font-bold text-slate-900 hover:text-teal-900 hover:underline">
              View All (8)
            </Link>
          </div>

          {/* Domicile Info Banner */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-700">
              <div className="w-6 h-6 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-teal-800" />
              </div>
              <span>
                Matched against ST Central Registry criteria, IIT/NIT accredited quota, and verified domicile in Jharkhand.
              </span>
            </div>
            <Link to="/schemes" className="font-semibold text-teal-900 hover:underline shrink-0">
              Adjust Filters
            </Link>
          </div>

          {/* Scheme Cards */}
          <div className="space-y-4">
            {recommendedSchemes.map((s) => {
              const isSaved = savedSchemeIds.includes(s.id)
              return (
                <Card key={s.id} className="p-5 hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        {s.matchScore}% Match Score
                      </span>
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                        {s.sourceTag}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSaveScheme(s.id)}
                      className={`p-1.5 rounded-md hover:bg-slate-100 transition-colors ${
                        isSaved ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={isSaved ? 'Saved' : 'Save scheme'}
                    >
                      <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2.5">
                    {s.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {s.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {s.chips.map((chip, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Grant Amount</div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {s.grantAmount} <span className="text-xs font-normal text-slate-500">{s.grantUnit}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Submission Closes</div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-700" />
                          {s.submissionDate}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetails(s.id)}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApply(s.id, s.title)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#003748] hover:bg-[#002834] rounded-lg transition-colors shadow-2xs"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Right Column: Stages, Verification Dates, Nodal Helpline (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: Application Stage */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Application Stage
              </h3>
              <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                Ref #8812
              </span>
            </div>

            <div className="bg-slate-50/80 rounded-lg p-2.5 mt-3 border border-slate-100">
              <div className="text-xs font-bold text-slate-900">Post-Matric ST Scheme</div>
              <div className="text-[11px] text-slate-500">State Level Disbursement Track</div>
            </div>

            {/* Stepper */}
            <div className="relative pl-6 space-y-5 pt-4 text-xs">
              {/* Vertical timeline connector */}
              <div className="absolute left-2.5 top-5 bottom-3 w-0.5 bg-slate-200" />

              {/* Step 1 */}
              <div className="relative">
                <span className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-white">
                  <CheckCircle className="w-3.5 h-3.5" />
                </span>
                <div className="font-bold text-slate-900">Institute Verification</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Cleared by NIT Jamshedpur on 14 Aug</div>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <span className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-white">
                  <CheckCircle className="w-3.5 h-3.5" />
                </span>
                <div className="font-bold text-slate-900">Documents Authenticated</div>
                <div className="text-[11px] text-slate-500 mt-0.5">DigiLocker Caste & Aadhaar e-Sign done</div>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <span className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center ring-4 ring-white">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                </span>
                <div className="font-bold text-amber-900">Under District Welfare Review</div>
                <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Ranchi District Officer desk. Awaiting updated income doc re-attestation.
                </div>
              </div>

              {/* Step 4 */}
              <div className="relative">
                <span className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center ring-4 ring-white">
                  <Landmark className="w-3 h-3" />
                </span>
                <div className="font-medium text-slate-500">State Treasury Disbursement</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Direct Benefit Transfer (DBT) to bank</div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 text-center">
              <Link to="/applicant/timeline/app-demo-01" className="text-xs font-bold text-slate-900 hover:text-teal-900 inline-flex items-center gap-1">
                Full Audit Trail <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card: Key Verification Dates */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Key Verification Dates</h3>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0 leading-tight">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">OCT</span>
                    <span className="text-sm font-extrabold text-slate-900">12</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Overseas Fellowship Deadline</div>
                    <div className="text-[11px] text-slate-500">Portal closes at 23:59 IST</div>
                  </div>
                </div>
                <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              </div>

              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 flex flex-col items-center justify-center shrink-0 leading-tight text-amber-900">
                    <span className="text-[9px] font-bold uppercase">OCT</span>
                    <span className="text-sm font-extrabold">28</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Income Re-submission Window</div>
                    <div className="text-[11px] text-slate-500">District Portal Cut-off</div>
                  </div>
                </div>
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              </div>

              <div className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0 leading-tight">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">NOV</span>
                    <span className="text-sm font-extrabold text-slate-900">05</span>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">DBT Mandate Verification</div>
                    <div className="text-[11px] text-slate-500">NPCI Mapping Check</div>
                  </div>
                </div>
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>
            </div>
          </Card>

          {/* Card: Dedicated Tribal Nodal Officer */}
          <Card className="p-4 bg-slate-900 text-white border-0 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-teal-800 text-teal-200 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-xs font-bold tracking-wide">Dedicated Tribal Nodal Officer</div>
              <div className="text-[11px] text-slate-300 mt-1">
                Toll-free student grievance helpline: <strong className="text-white font-mono">1800-11-2026</strong>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
