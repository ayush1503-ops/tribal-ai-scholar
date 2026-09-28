import React, { createContext, useContext, useState, useEffect } from 'react'

export interface SchemeItem {
  id: string
  title: string
  code: string
  department: string
  matchScore: number
  categoryTag?: string
  priorityTag?: string
  description: string
  tags: string[]
  grantAmount: string
  grantSubtext?: string
  submissionDeadline: string
  daysRemaining: number
  slotAllocation?: string
  eligibilityMatrix?: {
    stCertificate: { verified: boolean; label: string; detail: string }
    institution: { verified: boolean; label: string; detail: string }
    income: { verified: boolean; label: string; detail: string; alert?: boolean }
  }
  allowanceDetails?: {
    stipend?: string
    tuition?: string
    coverage?: string
  }
  isDraft?: boolean
  draftStep?: string
  draftProgress?: number
  saved?: boolean
}

interface PortalContextType {
  viewMode: 'student' | 'admin'
  setViewMode: (mode: 'student' | 'admin') => void
  incomeCertStatus: 'expired' | 'renewed' | 'pending'
  setIncomeCertStatus: (status: 'expired' | 'renewed' | 'pending') => void
  savedSchemeIds: string[]
  toggleSaveScheme: (id: string) => void
  isUploadModalOpen: boolean
  setIsUploadModalOpen: (open: boolean) => void
  isRemarksModalOpen: boolean
  setIsRemarksModalOpen: (open: boolean) => void
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: (open: boolean) => void
  compareSchemeIds: string[]
  toggleCompareScheme: (id: string) => void
  clearCompare: () => void
  isCompareModalOpen: boolean
  setIsCompareModalOpen: (open: boolean) => void
  activeTab: string
  setActiveTab: (tab: string) => void
  selectedSchemeForDetails: SchemeItem | null
  setSelectedSchemeForDetails: (scheme: SchemeItem | null) => void
}

const PortalContext = createContext<PortalContextType | null>(null)

export const DEFAULT_SCHEMES: SchemeItem[] = [
  {
    id: 'mota-edu-881',
    code: 'MoTA-EDU-2026-881',
    title: 'National Fellowship and Scholarship for Higher Education of ST Students',
    department: 'Ministry of Tribal Affairs (Govt. of India)',
    matchScore: 99,
    categoryTag: 'Central Sector Scheme',
    priorityTag: 'High Priority',
    description: 'Provides direct monthly fellowship and actual institutional fees for ST students enrolled in M.Phil, Ph.D. and premier accredited higher education programs.',
    tags: ['100% Tuition Fee Waiver', 'Monthly Research Stipend', 'ST Domicile Mandate', 'Contingency Grant'],
    grantAmount: '₹31,000 / mo',
    grantSubtext: '+ ₹12,000 annual contingency',
    submissionDeadline: '30 Nov 2026',
    daysRemaining: 42,
    slotAllocation: '750 national scholars / AY',
    allowanceDetails: {
      stipend: '₹31,000 / mo',
      tuition: '100% Fee Waiver (Actual tuition reimbursed)',
      coverage: '30 Nov 2026 (42 days remaining)'
    },
    eligibilityMatrix: {
      stCertificate: { verified: true, label: 'ST Certificate Met', detail: 'Verified via DigiLocker ID #8491' },
      institution: { verified: true, label: 'Institution Eligibility', detail: 'Tier-1 NIT/IIT/Central Univ Met' },
      income: { verified: false, label: 'Income Certificate Alert', detail: 'Renewal due in 18 days', alert: true }
    }
  },
  {
    id: 'nos-int-2026',
    code: 'NOS-INT-2026',
    title: 'National Overseas Scholarship for Scheduled Tribe Candidates',
    department: 'Ministry of Tribal Affairs • International Relations Bureau',
    matchScore: 96,
    categoryTag: 'Global Academic Grant',
    description: "Full sponsorship for Master's and Ph.D. degrees in QS Top 500 universities in Engineering, Medical Sciences, Agricultural Technology, and Natural Sciences abroad.",
    tags: ['100% Tuition + Living Stipend', 'Airfare Included', 'QS Top 500 Institutions', 'Fall 2027 Intakes'],
    grantAmount: 'Up to $45,000 / yr',
    grantSubtext: 'Tuition + Living + Airfare',
    submissionDeadline: '15 Dec 2026',
    daysRemaining: 57,
    slotAllocation: '20 Seats Reserved for Engineering/STEM',
    allowanceDetails: {
      stipend: 'Living allowance $15,400/yr',
      tuition: 'Actual university tuition covered',
      coverage: 'Comprehensive health insurance + visa'
    }
  },
  {
    id: 'pms-state-tr-09',
    code: 'PMS-STATE-TR-09',
    title: 'State Post-Matric Scholarship Scheme for Tribal Students',
    department: 'Jharkhand / Madhya Pradesh / Odisha Welfare Consortium',
    matchScore: 100,
    categoryTag: 'Tri-State Direct Scheme',
    priorityTag: 'Application Draft Open',
    description: 'Comprehensive maintenance grant covering boarding, books, exam fees, and study tours for students enrolled in professional polytechnics, degree colleges, and universities across tribal focus districts.',
    tags: ['Direct Benefit Transfer (DBT)', 'Hosteller & Day Scholar Rates', 'e-Kalyan Integration', 'Fast-Track Sanction'],
    grantAmount: '₹12,000 – ₹35,000 / yr',
    grantSubtext: 'Direct to Bank (Aadhaar)',
    submissionDeadline: '10 Nov 2026',
    daysRemaining: 22,
    isDraft: true,
    draftStep: 'Step 3 of 4: College verification pending from NIT Jamshedpur Nodal Officer',
    draftProgress: 75
  },
  {
    id: 'mota-top-class-st',
    code: 'MoTA-TOP-CLASS-04',
    title: 'Top Class Education Scheme for ST Students',
    department: 'Central Sector Scheme • Ministry of Tribal Affairs',
    matchScore: 95,
    categoryTag: 'Central Sector Scheme',
    description: 'Direct central funding for meritorious ST students admitted into notified premier institutions (IITs, NITs, IIMs) covering total non-refundable tuition and living expenses.',
    tags: ['Full Fee Waiver', '₹45,000 Laptop Grant', 'B.Tech / Undergraduate', 'Direct Institutional Release'],
    grantAmount: '₹2,00,000 / yr',
    grantSubtext: 'Full Tuition + ₹45,000 Book/Device Allowance',
    submissionDeadline: '31 Oct 2026',
    daysRemaining: 18,
    slotAllocation: '1,000 Fresh Slots Annually'
  },
  {
    id: 'aicte-pragati-saksham',
    code: 'AICTE-PRAGATI-STEM-21',
    title: 'Pragati & Saksham Special STEM Fellowship',
    department: 'AICTE & Tribal Welfare Partnership',
    matchScore: 92,
    categoryTag: 'AICTE & Tribal Welfare',
    description: 'Encouragement grants specifically tailored for tribal students in technical diploma and degree programs with focus on emerging technologies and computational sciences.',
    tags: ['Contingency Allowance', 'STEM Only', 'Female & PwD Priority Quota'],
    grantAmount: '₹50,000 / yr',
    grantSubtext: 'Lump-sum annual grant for books and computing',
    submissionDeadline: '20 Nov 2026',
    daysRemaining: 34
  }
]

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<'student' | 'admin'>('student')
  const [incomeCertStatus, setIncomeCertStatus] = useState<'expired' | 'renewed' | 'pending'>('expired')
  const [savedSchemeIds, setSavedSchemeIds] = useState<string[]>(['mota-edu-881', 'nos-int-2026', 'pms-state-tr-09', 'mota-top-class-st', 'aicte-pragati-saksham'])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isRemarksModalOpen, setIsRemarksModalOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [compareSchemeIds, setCompareSchemeIds] = useState<string[]>([])
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [selectedSchemeForDetails, setSelectedSchemeForDetails] = useState<SchemeItem | null>(null)

  const toggleSaveScheme = (id: string) => {
    setSavedSchemeIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const toggleCompareScheme = (id: string) => {
    setCompareSchemeIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) {
        return [prev[1], prev[2], id]
      }
      return [...prev, id]
    })
    setIsCompareModalOpen(true)
  }

  const clearCompare = () => {
    setCompareSchemeIds([])
    setIsCompareModalOpen(false)
  }

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <PortalContext.Provider
      value={{
        viewMode,
        setViewMode,
        incomeCertStatus,
        setIncomeCertStatus,
        savedSchemeIds,
        toggleSaveScheme,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isRemarksModalOpen,
        setIsRemarksModalOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        compareSchemeIds,
        toggleCompareScheme,
        clearCompare,
        isCompareModalOpen,
        setIsCompareModalOpen,
        activeTab,
        setActiveTab,
        selectedSchemeForDetails,
        setSelectedSchemeForDetails
      }}
    >
      {children}
    </PortalContext.Provider>
  )
}

export const usePortal = () => {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within PortalProvider')
  return ctx
}
