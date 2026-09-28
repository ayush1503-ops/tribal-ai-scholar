import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, StatusBadge } from '../../components/Layout'
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Award,
  Upload,
  Calendar,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Search,
  ExternalLink
} from 'lucide-react'
import { usePortal, DEFAULT_SCHEMES } from '../../context/PortalContext'
import { ASSETS } from '../../assets/branding'

export default function ApplicantDashboard() {
  const [apps, setApps] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const {
    incomeCertStatus,
    setIsUploadModalOpen,
    setIsCommandPaletteOpen,
    setSelectedSchemeForDetails,
    toggleCompareScheme
  } = usePortal()

  useEffect(() => {
    api.get('/applications').then(r => setApps(r.data.items || [])).catch(() => {
      // Fallback demo apps if offline
      setApps([
        {
          id: 'app-demo-1',
          scheme_name: 'National Fellowship for ST Students — Demo',
          scheme_id: 'scheme-1',
          status: 'OFFICER_SCRUTINY',
          created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
          verification_priority: { score: 32, level: 'Low', recommendation: 'Standard review queue' }
        },
        {
          id: 'app-demo-2',
          scheme_name: 'State Post-Matric Scholarship Scheme for Tribal Students',
          scheme_id: 'scheme-3',
          status: 'SUBMITTED',
          created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
          verification_priority: { score: 18, level: 'Low', recommendation: 'Automated document match pass' }
        }
      ])
    })

    api.get('/profile').then(r => setProfile(r.data)).catch(() => {
      setProfile({
        applicant: {
          full_name: 'Ayush M. (ST Scholar)',
          category: 'ST',
          state: 'Jharkhand',
          district: 'Ranchi',
          course: 'PhD / Higher Education',
          annual_family_income: 240000
        }
      })
    })
  }, [])

  const timeline = (status: string) => {
    const steps = ["DRAFT", "SUBMITTED", "AUTOMATED_CHECK", "INSTITUTE_VERIFICATION", "OFFICER_SCRUTINY", "COMMITTEE_REVIEW", "SELECTED"]
    const idx = steps.indexOf(status)
    return steps.map((s, i) => ({
      label: s.replace(/_/g, ' '),
      done: (i <= idx && status !== "DRAFT") || (status === "DRAFT" && i === 0),
      current: s === status
    }))
  }

  const applicantName = profile?.applicant?.full_name || profile?.user?.full_name || 'Ayush M. (ST Scholar)'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Student Identity Card */}
      <div className="bg-gradient-to-r from-[#073B4C] via-[#0E4A5E] to-[#118AB2] rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-white/5 -skew-x-12 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={ASSETS.avatarAyush}
                alt="Student Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md bg-white"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Welcome, {applicantName}</h1>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  ST Category
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1 flex items-center gap-2">
                <span>Ranchi University • PhD Research Scholar</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> DigiLocker Verified
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-medium backdrop-blur-sm transition-all flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search Portal</span>
              <kbd className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] text-slate-300">⌘K</kbd>
            </button>
            <Link
              to="/schemes"
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore 2026 Schemes</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Income Expiry Notice / Action Required Banner */}
      {incomeCertStatus === 'expired' ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">Action Required</span>
                <span className="text-[11px] bg-amber-200/60 text-amber-900 px-2 py-0.2 rounded-full font-medium">Due in 18 days</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">Annual Income Certificate Renewal (FY 2025-26)</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                The Sponsoring Authority requires an updated income certificate (&lt; ₹2.5 LPA) to clear institutional disbursement holds for the Central Sector Fellowship.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="self-start sm:self-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg text-xs transition-all shadow flex items-center gap-1.5 flex-shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-emerald-900">Income Certificate FY 2025-26 Verified</h4>
              <p className="text-xs text-emerald-700">Valid through March 31, 2026. All institutional holds have been cleared.</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-200/60 text-emerald-900 font-semibold px-2.5 py-1 rounded-full">
            Active
          </span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-primary-600" /> Total Applications
          </div>
          <div className="text-2xl font-bold mt-1 text-[#073B4C]">{apps.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">AY 2025–26 Cycle</div>
        </Card>

        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" /> Pending Review
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-600">
            {apps.filter(a => ['SUBMITTED', 'AUTOMATED_CHECK', 'OFFICER_SCRUTINY'].includes(a.status)).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">With Nodal Officer</div>
        </Card>

        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" /> Selected / Awarded
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">
            {apps.filter(a => a.status === 'SELECTED').length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">DBT Sanctioned</div>
        </Card>

        <Card className="p-4 border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Matched Schemes
          </div>
          <div className="text-2xl font-bold mt-1 text-indigo-600">5</div>
          <div className="text-[11px] text-slate-500 mt-0.5">High ST Eligibility Fit</div>
        </Card>
      </div>

      {/* Main Applications List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg text-[#073B4C]">My Applications</h2>
          <Link to="/schemes" className="text-xs text-primary-600 font-semibold hover:underline flex items-center gap-1">
            Browse All Schemes <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {apps.length === 0 ? (
          <Card className="p-8 text-center border-slate-200">
            <div className="text-gray-500 text-sm">No applications submitted yet.</div>
            <Link to="/schemes" className="mt-3 inline-flex px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-semibold">
              Browse Eligible ST Schemes
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {apps.map(app => (
              <Card key={app.id} className="p-5 border-slate-200 hover:border-slate-300 transition-all shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-base text-[#073B4C]">{app.scheme_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Application ID: <span className="font-mono">{app.id.slice(0, 12)}</span> • Created {new Date(app.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <StatusBadge status={app.status} />
                </div>

                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-600">Verification Lifecycle</div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {timeline(app.status).map((t, i) => (
                      <span
                        key={i}
                        className={`text-[11px] px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                          t.current
                            ? 'bg-[#073B4C] text-white border-[#073B4C] font-semibold'
                            : t.done
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {t.done && !t.current ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : t.current ? <Clock className="w-3 h-3 text-white" /> : null}
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>

                {app.verification_priority && (
                  <div className="mt-3 text-xs bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-amber-900">Verification Priority: </span>
                      <b>{app.verification_priority.score}/100 — {app.verification_priority.level} Risk</b>
                      <span className="text-amber-800 ml-2 hidden sm:inline">• {app.verification_priority.recommendation}</span>
                    </div>
                    <span className="text-[10px] bg-amber-200/50 text-amber-900 px-2 py-0.5 rounded font-mono">
                      Queue Order
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap gap-2.5 pt-3 border-t border-slate-100">
                  <Link
                    to={`/applicant/apply/${app.id}`}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
                  >
                    Open Application Form
                  </Link>
                  <Link
                    to={`/applicant/timeline/${app.id}`}
                    className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>Audit Timeline</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  {app.status === 'DEFICIENCY_RAISED' && (
                    <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded-lg font-medium">
                      <AlertCircle className="w-4 h-4" /> Action required: correct deficiency
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Suggested ST Fellowship & Scholarships */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-base text-[#073B4C]">Recommended ST Fellowships for You</h3>
            <p className="text-xs text-slate-500">Based on your academic level (PhD) and ST community domicile</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {DEFAULT_SCHEMES.slice(0, 3).map(scheme => (
            <Card key={scheme.id} className="p-4 border-slate-200 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {scheme.matchScore}% Match
                  </span>
                  <span className="text-[10px] text-slate-400">{scheme.code}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mt-2 line-clamp-2">{scheme.title}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{scheme.description}</p>
                <div className="mt-3 text-xs font-bold text-slate-900">
                  {scheme.grantAmount}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedSchemeForDetails(scheme)}
                  className="text-xs text-primary-600 font-semibold hover:underline"
                >
                  View Details
                </button>
                <button
                  onClick={() => toggleCompareScheme(scheme.id)}
                  className="text-xs text-slate-600 border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-50"
                >
                  Compare
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Profile & Quick Navigation Section */}
      <div className="grid md:grid-cols-2 gap-6 pt-4">
        <Card className="p-5 border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-[#073B4C]">Applicant Profile Snapshot</h3>
            <Link to="/applicant/profile" className="text-xs text-primary-600 font-medium hover:underline">
              Edit Details →
            </Link>
          </div>
          {profile?.applicant ? (
            <div className="text-xs space-y-2 text-slate-700">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-900">{profile.applicant.full_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Caste Category</span>
                <span className="font-semibold text-slate-900">{profile.applicant.category} (Scheduled Tribe)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Domicile / District</span>
                <span className="font-semibold text-slate-900">{profile.applicant.district}, {profile.applicant.state}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Annual Family Income</span>
                <span className="font-semibold text-slate-900">₹{profile.applicant.annual_family_income?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Current Course</span>
                <span className="font-semibold text-slate-900">{profile.applicant.course}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">Loading profile data...</div>
          )}
        </Card>

        <Card className="p-5 border-slate-200">
          <h3 className="font-bold text-sm text-[#073B4C] mb-3">Grievances & Student Services</h3>
          <div className="space-y-2 text-xs">
            <Link
              to="/notifications"
              className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="font-medium text-slate-800">Notification Center</div>
              <span className="text-slate-400">→</span>
            </Link>
            <Link
              to="/applicant/appeals"
              className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="font-medium text-slate-800">Online Appeals & Re-evaluations</div>
              <span className="text-slate-400">→</span>
            </Link>
            <Link
              to="/applicant/grievances"
              className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="font-medium text-slate-800">MoTA Tribal Welfare Cell Grievance</div>
              <span className="text-slate-400">→</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

