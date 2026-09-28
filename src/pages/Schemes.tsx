import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePortal, DEFAULT_SCHEMES, SchemeItem } from '../context/PortalContext'
import { Card } from '../components/Layout'
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Check,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building,
  Calendar,
  Clock,
  Bookmark,
  CheckCircle,
  AlertTriangle,
  FileText,
  Scale,
  ArrowRight,
  ExternalLink,
  Edit3,
  MapPin,
  FolderOpen
} from 'lucide-react'

export default function Schemes() {
  const navigate = useNavigate()
  const {
    incomeCertStatus,
    savedSchemeIds,
    toggleSaveScheme,
    toggleCompareScheme,
    compareSchemeIds,
    setSelectedSchemeForDetails,
    setIsUploadModalOpen
  } = usePortal()

  // Filter States matching Image 2
  const [searchQuery, setSearchQuery] = useState('Higher Education National Fellowship')
  const [selectedChips, setSelectedChips] = useState<string[]>([
    'ST Pre/Post Matric',
    'Higher Education (UG/PG)',
    'Income < 2.5 LPA'
  ])

  // Facet States
  const [categoryFilters, setCategoryFilters] = useState({
    st: true,
    pvtg: false,
    nomadic: false
  })

  const [eduFilters, setEduFilters] = useState({
    higherSecondary: false,
    undergrad: true,
    postgrad: true,
    phd: false
  })

  const [incomeCap, setIncomeCap] = useState('250k')
  const [governanceFilters, setGovernanceFilters] = useState({
    centralMota: true,
    stateTribal: false,
    corporate: false,
    international: false
  })

  const [annualValueSlider, setAnnualValueSlider] = useState(1250000)
  const [sortOption, setSortOption] = useState('Match Score (Highest)')
  const [currentPage, setCurrentPage] = useState(1)

  const toggleChip = (chip: string) => {
    if (chip === 'Reset All') {
      setSelectedChips([])
      setSearchQuery('')
      return
    }
    setSelectedChips(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    )
  }

  const clearAllFilters = () => {
    setSelectedChips([])
    setCategoryFilters({ st: true, pvtg: false, nomadic: false })
    setEduFilters({ higherSecondary: false, undergrad: false, postgrad: false, phd: false })
    setGovernanceFilters({ centralMota: false, stateTribal: false, corporate: false, international: false })
    setSearchQuery('')
  }

  const openDetails = (id: string) => {
    const s = DEFAULT_SCHEMES.find(item => item.id === id) || DEFAULT_SCHEMES[0]
    setSelectedSchemeForDetails(s)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Top Subheader / Verification Banner */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-teal-900 font-bold text-xs bg-teal-50 border border-teal-200 px-2 py-0.5 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse" />
              MOTA VERIFIED ENGINE • Direct Registry Sync Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Empowering ST, PVTG, and nomadic students with automated eligibility matching and DigiLocker-backed grant admissions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-teal-800 shrink-0" />
            <span>DigiLocker Auth: Ayush M.</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>ST Certificate Valid</span>
          </div>
        </div>
      </div>

      {/* 2. Search & Refine Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by scholarship title, department, or keyword..."
              className="w-full h-11 pl-10 pr-9 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Refine Filters Button */}
          <button
            type="button"
            className="h-11 px-4 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Refine Filters</span>
            <span className="w-4 h-4 bg-slate-800 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
              4
            </span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              aria-label="Sort scholarships by"
              className="h-11 pl-3 pr-8 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 appearance-none focus:outline-none focus:border-teal-700 cursor-pointer shadow-2xs"
            >
              <option>Match Score (Highest)</option>
              <option>Grant Value (High to Low)</option>
              <option>Application Deadline (Earliest)</option>
              <option>Alphabetical (A-Z)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Suggested Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Suggested:
          </span>
          {[
            'ST Pre/Post Matric',
            'Higher Education (UG/PG)',
            'Overseas Studies',
            'Income < 2.5 LPA',
            'Girls Only',
            'Merit-cum-Means'
          ].map((chip) => {
            const isSelected = selectedChips.includes(chip)
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all border flex items-center gap-1 ${
                  isSelected
                    ? 'bg-[#003748] text-white border-[#003748]'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{chip}</span>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => toggleChip('Reset All')}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Reset All
          </button>
        </div>
      </div>

      {/* 3. Two-Column Layout: Facets & Scholarship List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Filter Facets (3.5 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                Filter Facets
              </h2>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-teal-800 hover:underline font-semibold"
              >
                Clear (4)
              </button>
            </div>

            {/* Facet 1: Category / Community */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Category / Community</span>
                <span className="text-[10px] text-slate-400 font-medium">Aadhaar Linked</span>
              </div>
              <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-slate-900">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryFilters.st}
                    onChange={(e) => setCategoryFilters({ ...categoryFilters, st: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Scheduled Tribe (ST)</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">38</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-slate-900">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryFilters.pvtg}
                    onChange={(e) => setCategoryFilters({ ...categoryFilters, pvtg: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>PVTG (Particularly Vulnerable)</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">12</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5 hover:text-slate-900">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={categoryFilters.nomadic}
                    onChange={(e) => setCategoryFilters({ ...categoryFilters, nomadic: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Nomadic / De-notified Tribes</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">6</span>
              </label>
            </div>

            {/* Facet 2: Education Level */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-800 block">Education Level</span>

              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eduFilters.higherSecondary}
                    onChange={(e) => setEduFilters({ ...eduFilters, higherSecondary: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Higher Secondary (11th & 12th)</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">14</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5 font-medium">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eduFilters.undergrad}
                    onChange={(e) => setEduFilters({ ...eduFilters, undergrad: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Undergraduate (B.Tech, MBBS, B.Sc)</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">24</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5 font-medium">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eduFilters.postgrad}
                    onChange={(e) => setEduFilters({ ...eduFilters, postgrad: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Postgraduate (M.Tech, MBA, M.Sc)</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">19</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eduFilters.phd}
                    onChange={(e) => setEduFilters({ ...eduFilters, phd: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Ph.D & Post-Doctoral Research</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">9</span>
              </label>
            </div>

            {/* Facet 3: Annual Household Income */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-800 block">Annual Household Income</span>

              <label className="flex items-center gap-2 cursor-pointer py-0.5">
                <input
                  type="radio"
                  name="incomeCap"
                  checked={incomeCap === '150k'}
                  onChange={() => setIncomeCap('150k')}
                  className="text-teal-800 focus:ring-teal-700"
                />
                <span>Up to ₹1,50,000 (Priority BPL)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5 font-medium">
                <input
                  type="radio"
                  name="incomeCap"
                  checked={incomeCap === '250k'}
                  onChange={() => setIncomeCap('250k')}
                  className="text-teal-800 focus:ring-teal-700"
                />
                <span>Up to ₹2,50,000 (Standard ST Cap)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5">
                <input
                  type="radio"
                  name="incomeCap"
                  checked={incomeCap === '600k'}
                  onChange={() => setIncomeCap('600k')}
                  className="text-teal-800 focus:ring-teal-700"
                />
                <span>₹2,50,000 to ₹6,00,000</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer py-0.5">
                <input
                  type="radio"
                  name="incomeCap"
                  checked={incomeCap === 'none'}
                  onChange={() => setIncomeCap('none')}
                  className="text-teal-800 focus:ring-teal-700"
                />
                <span>No Income Limit Applicable</span>
              </label>
            </div>

            {/* Facet 4: Scheme Type / Governance */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
              <span className="font-bold text-slate-800 block">Scheme Type / Governance</span>

              <label className="flex items-center justify-between cursor-pointer py-0.5 font-medium">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={governanceFilters.centralMota}
                    onChange={(e) => setGovernanceFilters({ ...governanceFilters, centralMota: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Central Ministry (MoTA)</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">15</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={governanceFilters.stateTribal}
                    onChange={(e) => setGovernanceFilters({ ...governanceFilters, stateTribal: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>State Tribal Welfare Boards</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">27</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={governanceFilters.corporate}
                    onChange={(e) => setGovernanceFilters({ ...governanceFilters, corporate: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>Corporate CSR & Philanthropy</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">8</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={governanceFilters.international}
                    onChange={(e) => setGovernanceFilters({ ...governanceFilters, international: e.target.checked })}
                    className="rounded text-teal-800 focus:ring-teal-700"
                  />
                  <span>International Bilateral Fellowship</span>
                </div>
                <span className="text-slate-400 text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">3</span>
              </label>
            </div>

            {/* Facet 5: Annual Value Cap Slider */}
            <div className="space-y-2 text-xs pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Annual Value Cap</span>
                <span className="font-bold text-slate-900 font-mono">
                  ₹{annualValueSlider.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min="25000"
                max="3000000"
                step="25000"
                value={annualValueSlider}
                onChange={(e) => setAnnualValueSlider(Number(e.target.value))}
                className="w-full accent-[#003748] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹25,000</span>
                <span>₹30,00,000</span>
              </div>
            </div>

            {/* Auto-Match Profiler Box */}
            <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-lg text-xs space-y-1">
              <div className="font-bold text-sky-950 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-800" /> Auto-Match Profiler
              </div>
              <p className="text-sky-900/80 text-[11px] leading-relaxed">
                Tribal AI monitors state gazettes nightly. 3 new schemes match your enrolled course.
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column: Available Scholarships (8.5 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Available Scholarships</h2>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                42 Schemes
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing verified schemes eligible for AY 2026-27
            </div>
          </div>

          {/* Scheme Card 1: National Fellowship for Higher Education */}
          <Card className="p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full" /> 99% Match Score
                </span>
                <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  Central Sector Scheme
                </span>
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  High Priority
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleCompareScheme('mota-edu-881')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-2.5 py-1 flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                {compareSchemeIds.includes('mota-edu-881') ? 'Comparing' : 'Compare'}
              </button>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Ministry of Tribal Affairs (Govt. of India)</span>
                <span>•</span>
                <span>MoTA-EDU-2026-881</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1 tracking-tight">
                National Fellowship and Scholarship for Higher Education of ST Students
              </h3>
            </div>

            {/* 3 Metric Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  DIRECT MONTHLY STIPEND
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  ₹31,000 <span className="text-xs font-normal text-slate-500">/ mo</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">+ ₹12,000 annual contingency</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  INSTITUTIONAL COVERAGE
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  100% Fee Waiver
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">Actual tuition reimbursed</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  APPLICATION DEADLINE
                </div>
                <div className="text-base font-extrabold text-amber-800 mt-0.5">
                  30 Nov 2026
                </div>
                <div className="text-[11px] text-amber-800 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" /> 42 days remaining
                </div>
              </div>
            </div>

            {/* Live AI Eligibility Verification Matrix */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-800" />
                  <span>Live AI Eligibility Verification Matrix</span>
                </div>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    incomeCertStatus === 'renewed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {incomeCertStatus === 'renewed' ? '3/3 Verified (All Requirements Met)' : '2/3 Verified'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-emerald-200 bg-white">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ST Certificate Met</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Verified via DigiLocker ID #8491</div>
                </div>

                <div className="p-2.5 rounded-lg border border-emerald-200 bg-white">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Institution Eligibility</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tier-1 NIT/IIT/Central Univ Met</div>
                </div>

                {incomeCertStatus === 'renewed' ? (
                  <div className="p-2.5 rounded-lg border border-emerald-200 bg-white">
                    <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Income Verified</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">FY 2025-26 Active (&lt; ₹2.5L)</div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-50">
                    <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Income Certificate Alert</span>
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5">Renewal due in 18 days</div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar: Quota Info + Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <span>ⓘ</span> Slot allocation: 750 national scholars / AY
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSaveScheme('mota-edu-881')}
                  className={`px-3 py-2 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    savedSchemeIds.includes('mota-edu-881')
                      ? 'border-amber-400 bg-amber-50 text-amber-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{savedSchemeIds.includes('mota-edu-881') ? 'Saved' : 'Save Scheme'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openDetails('mota-edu-881')}
                  className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                >
                  View Eligibility Details
                </button>

                <button
                  type="button"
                  onClick={() => openDetails('mota-edu-881')}
                  className="px-4 py-2 bg-[#003748] hover:bg-[#002834] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  Apply Now <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Scheme Card 2: National Overseas Scholarship */}
          <Card className="p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  96% Match Score
                </span>
                <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  Global Academic Grant
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleCompareScheme('nos-int-2026')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-2.5 py-1 flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                {compareSchemeIds.includes('nos-int-2026') ? 'Comparing' : 'Compare'}
              </button>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Ministry of Tribal Affairs • International Relations Bureau</span>
                <span>•</span>
                <span>NOS-INT-2026</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1 tracking-tight">
                National Overseas Scholarship for Scheduled Tribe Candidates
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Full sponsorship for Master's and Ph.D. degrees in QS Top 500 universities in Engineering, Medical Sciences, Agricultural Technology, and Natural Sciences abroad.
              </p>
            </div>

            {/* 4 Metric Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Allowance</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">Up to $45,000 / yr</div>
                <div className="text-[11px] text-slate-500">Tuition + Living + Airfare</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500">Target Intakes</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">Fall 2027 & Spring 2027</div>
                <div className="text-[11px] text-slate-500">20 Seats Reserved</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500">Household Cap</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">≤ ₹6,00,000 LPA</div>
                <div className="text-[11px] text-emerald-700 font-semibold">Profile Eligible</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500">Deadline</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5">15 Dec 2026</div>
                <div className="text-[11px] text-slate-500">57 days remaining</div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md w-fit">
                Passport & ST Card Ready
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDetails('nos-int-2026')}
                  className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                >
                  View Guidelines
                </button>
                <button
                  type="button"
                  onClick={() => openDetails('nos-int-2026')}
                  className="px-4 py-2 bg-[#003748] hover:bg-[#002834] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  Start Application <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Scheme Card 3: State Post-Matric Scholarship Scheme */}
          <Card className="p-5 sm:p-6 space-y-4 hover:border-slate-300 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  100% Match Score
                </span>
                <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  Tri-State Direct Scheme
                </span>
                <span className="text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                  Application Draft Open
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleCompareScheme('pms-state-tr-09')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-2.5 py-1 flex items-center gap-1.5"
              >
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                {compareSchemeIds.includes('pms-state-tr-09') ? 'Comparing' : 'Compare'}
              </button>
            </div>

            <div>
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Jharkhand / Madhya Pradesh / Odisha Welfare Consortium</span>
                <span>•</span>
                <span>PMS-STATE-TR-09</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-1 tracking-tight">
                State Post-Matric Scholarship Scheme for Tribal Students
              </h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Comprehensive maintenance grant covering boarding, books, exam fees, and study tours for students enrolled in professional polytechnics, degree colleges, and universities across tribal focus districts.
              </p>
            </div>

            {/* 3 Metric Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500">Grant Value</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">₹12,000 – ₹35,000 / yr</div>
                <div className="text-[11px] text-slate-500">Based on hosteller/day-scholar status</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500">DBT Disbursal</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">Direct to Bank (Aadhaar)</div>
                <div className="text-[11px] text-slate-500">Single instalment transfer</div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <div className="text-[10px] uppercase font-bold text-slate-500">Application Closing</div>
                <div className="text-base font-extrabold text-amber-800 mt-0.5">10 Nov 2026</div>
                <div className="text-[11px] text-amber-800">Closing in 22 days</div>
              </div>
            </div>

            {/* In-Card Progress Box */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-700">
                  <FolderOpen className="w-4 h-4 text-teal-800" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Your draft is saved at Step 3 of 4</div>
                  <div className="text-[11px] text-slate-500">
                    College verification pending from NIT Jamshedpur Nodal Officer
                  </div>
                </div>
              </div>
              <span className="font-bold text-xs text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-md shrink-0">
                75% Complete
              </span>
            </div>

            {/* Bottom Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500">Disbursal handled via NSP / e-Kalyan Gateway</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openDetails('pms-state-tr-09')}
                  className="px-3.5 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                >
                  View Guidelines
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/applicant/apply/pms-state-tr-09')}
                  className="px-4 py-2 bg-[#d97706] hover:bg-[#b45309] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  Continue Draft <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>

          {/* Pagination */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>Showing 1-3 of 42 eligible fellowship schemes</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className={`w-8 h-8 rounded border flex items-center justify-center font-bold ${
                  currentPage === 1
                    ? 'bg-[#003748] text-white border-[#003748]'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                1
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(2)}
                className={`w-8 h-8 rounded border flex items-center justify-center font-medium ${
                  currentPage === 2
                    ? 'bg-[#003748] text-white border-[#003748]'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                2
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(3)}
                className={`w-8 h-8 rounded border flex items-center justify-center font-medium ${
                  currentPage === 3
                    ? 'bg-[#003748] text-white border-[#003748]'
                    : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                3
              </button>
              <span className="px-1 text-slate-400">…</span>
              <button
                type="button"
                onClick={() => setCurrentPage(14)}
                className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center font-medium text-slate-700 hover:bg-slate-50"
              >
                14
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(14, currentPage + 1))}
                className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
