import React, { useState } from 'react'
import { usePortal, DEFAULT_SCHEMES } from '../context/PortalContext'
import {
  X,
  Upload,
  CheckCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Building,
  Calendar,
  IndianRupee,
  Search,
  ArrowRight,
  ExternalLink,
  Camera,
  Sparkles
} from 'lucide-react'

export const UploadIncomeModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, setIncomeCertStatus } = usePortal()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isUploadModalOpen) return null

  const handleSelectSample = (sampleName: string) => {
    setSelectedFile(sampleName)
  }

  const handleUploadSubmit = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      setSuccess(true)
      setIncomeCertStatus('renewed')
      setTimeout(() => {
        setIsUploadModalOpen(false)
        setSuccess(false)
        setSelectedFile(null)
      }, 1500)
    }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Action Required</span>
              <span className="text-xs text-slate-500">Ref: #MOTA-2026-ST-8812</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1">Upload Annual Income Certificate</h3>
          </div>
          <button
            onClick={() => setIsUploadModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {success ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-900">Certificate Verified & Uploaded</h4>
              <p className="text-sm text-slate-600 max-w-sm mx-auto">
                DigiLocker has validated your SDO-attested Income Certificate for FY 2025-26. Verification holds have been cleared.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900">
                <strong>District Nodal Officer Notice:</strong> Sponsoring Authority (District Tribal Welfare Cell, Ranchi) requested FY 2025-26 income certificate to satisfy the standard ST &lt; ₹2.5 LPA eligibility cap.
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => setSelectedFile('Income_Certificate_FY2025-26_SDO.pdf')}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  selectedFile ? 'border-teal-600 bg-teal-50/30' : 'border-slate-300 hover:border-teal-600 hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 text-teal-800 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-slate-900">
                  {selectedFile ? selectedFile : 'Click to select or drag and drop your certificate'}
                </div>
                <div className="text-xs text-slate-500 mt-1">PDF, JPG, or PNG (Max 5MB) • DigiLocker e-Signed</div>
              </div>

              {/* Quick sample pickers */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2">Or choose a pre-scanned demo file:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleSelectSample('Income_Cert_FY2025_SDO_Ranchi.pdf')}
                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                      selectedFile === 'Income_Cert_FY2025_SDO_Ranchi.pdf'
                        ? 'border-teal-700 bg-teal-50/60 font-medium text-teal-950'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="truncate font-semibold">SDO Attested FY 2025</div>
                      <div className="text-[11px] text-slate-500">₹2,10,000 / yr • Valid</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectSample('DigiLocker_Verified_Income_2026.pdf')}
                    className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all ${
                      selectedFile === 'DigiLocker_Verified_Income_2026.pdf'
                        ? 'border-teal-700 bg-teal-50/60 font-medium text-teal-950'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="truncate font-semibold">DigiLocker Direct Pull</div>
                      <div className="text-[11px] text-slate-500">Auto e-Sign #8491</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Extracted preview if selected */}
              {selectedFile && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Live Document Scan Preview
                  </div>
                  <div className="text-slate-600 grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                    <div>Applicant: <strong>Ayush M.</strong></div>
                    <div>Income: <strong>₹2,10,000 / yr</strong></div>
                    <div>Issuer: <strong>SDO Ranchi</strong></div>
                    <div>Validity: <strong>31 Mar 2026</strong></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedFile || isProcessing}
              onClick={handleUploadSubmit}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#003748] hover:bg-[#002834] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Verifying with DigiLocker...
                </>
              ) : (
                'Submit & Verify Certificate'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const RemarksModal: React.FC = () => {
  const { isRemarksModalOpen, setIsRemarksModalOpen, setIsUploadModalOpen } = usePortal()
  if (!isRemarksModalOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="text-xs font-medium text-slate-500">Official Scrutiny Log</div>
            <h3 className="text-base font-bold text-slate-900">District Nodal Officer Remarks</h3>
          </div>
          <button
            onClick={() => setIsRemarksModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
              RK
            </div>
            <div>
              <div className="font-bold text-slate-900">Shri Rajesh Kumar</div>
              <div className="text-slate-500">District Welfare Officer, Ranchi Division • MoTA Desk</div>
            </div>
            <span className="ml-auto text-[11px] text-slate-400">24 Oct 2026, 11:42 AM</span>
          </div>

          <div className="border-l-4 border-amber-500 pl-4 py-1 space-y-2">
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
              Official Note on Application #MOTA-2026-ST-8812
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              &ldquo;The candidate has successfully satisfied the ST caste verification via DigiLocker and admission verification from NIT Jamshedpur. However, the submitted Annual Income Certificate carries an issue date of FY 2024-25 which expired on March 31, 2025.
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              In accordance with MoTA fellowship guidelines, the candidate must submit a fresh income certificate for the current financial year (FY 2025-26) attested by a Revenue Sub-Divisional Officer (SDO) or Circle Officer (CO). Disbursal to PFMS treasury is held until updated documentation is received.&rdquo;
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1.5 text-slate-600">
            <div className="font-semibold text-slate-800">Prescribed Remedial Steps:</div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
              <li>Upload fresh income certificate with seal of competent authority.</li>
              <li>Ensure annual income declared is less than ₹2.50 LPA.</li>
              <li>Deadline for re-submission: <strong>28 Oct 2026 (4 days remaining)</strong>.</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setIsRemarksModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRemarksModalOpen(false)
              setIsUploadModalOpen(true)
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#003748] hover:bg-[#002834] rounded-lg transition-colors flex items-center gap-1.5"
          >
            Submit Certificate Now <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export const SchemeDetailsModal: React.FC = () => {
  const { selectedSchemeForDetails, setSelectedSchemeForDetails, setIsUploadModalOpen } = usePortal()
  if (!selectedSchemeForDetails) return null

  const s = selectedSchemeForDetails

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">{s.matchScore}% Match Score</span>
              <span className="text-xs text-slate-500">{s.code}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{s.title}</h3>
            <div className="text-xs text-slate-500 mt-0.5">{s.department}</div>
          </div>
          <button
            onClick={() => setSelectedSchemeForDetails(null)}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body scroll */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Overview & Objectives</h4>
            <p className="text-slate-700 leading-relaxed">{s.description}</p>
          </div>

          {/* Key Metrics */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Direct Allowance</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{s.grantAmount}</div>
              <div className="text-[11px] text-slate-500">{s.grantSubtext || 'Disbursed via DBT'}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Application Deadline</div>
              <div className="text-base font-bold text-amber-700 mt-0.5">{s.submissionDeadline}</div>
              <div className="text-[11px] text-slate-500">{s.daysRemaining} days remaining</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">National Quota</div>
              <div className="text-base font-bold text-slate-900 mt-0.5">{s.slotAllocation || 'Central Allocation'}</div>
              <div className="text-[11px] text-slate-500">Verified ST category</div>
            </div>
          </div>

          {/* Live Matrix */}
          {s.eligibilityMatrix && (
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-700" /> Live AI Eligibility Matrix
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">2 of 3 Verified</span>
              </div>
              <div className="grid sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {s.eligibilityMatrix.stCertificate.label}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">{s.eligibilityMatrix.stCertificate.detail}</div>
                </div>

                <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60">
                  <div className="font-semibold text-emerald-900 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {s.eligibilityMatrix.institution.label}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">{s.eligibilityMatrix.institution.detail}</div>
                </div>

                <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                  <div className="font-semibold text-amber-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> {s.eligibilityMatrix.income.label}
                  </div>
                  <div className="text-[11px] text-amber-800 mt-0.5">{s.eligibilityMatrix.income.detail}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Entitlements & Coverage</div>
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">Disbursed directly via DBT to Aadhaar-seeded bank account.</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedSchemeForDetails(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Close
            </button>
            <button
              onClick={() => {
                setSelectedSchemeForDetails(null)
                setIsUploadModalOpen(true)
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#003748] hover:bg-[#002834] rounded-lg flex items-center gap-1.5"
            >
              Apply / Update Docs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const CompareModal: React.FC = () => {
  const { isCompareModalOpen, setIsCompareModalOpen, compareSchemeIds, clearCompare } = usePortal()
  if (!isCompareModalOpen || compareSchemeIds.length === 0) return null

  const items = DEFAULT_SCHEMES.filter(s => compareSchemeIds.includes(s.id))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <div className="text-xs font-semibold text-slate-500">Decision Matrix</div>
            <h3 className="text-base font-bold text-slate-900">Compare Selected Schemes ({items.length})</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={clearCompare} className="text-xs text-slate-500 hover:text-red-700 font-medium px-2 py-1">
              Clear All
            </button>
            <button
              onClick={() => setIsCompareModalOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          <div className="grid grid-cols-3 gap-4 min-w-[680px]">
            {items.map(s => (
              <div key={s.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {s.matchScore}% Match
                  </span>
                  <span className="text-[11px] text-slate-500">{s.code}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 line-clamp-2 min-h-[40px]">{s.title}</h4>
                <div className="text-xs text-slate-500 mt-1">{s.department}</div>

                <div className="mt-4 pt-3 border-t border-slate-200 space-y-3 text-xs flex-1">
                  <div>
                    <span className="text-slate-500 block">Grant Amount</span>
                    <span className="font-bold text-slate-900 text-sm">{s.grantAmount}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Deadline</span>
                    <span className="font-bold text-amber-800">{s.submissionDeadline} ({s.daysRemaining}d left)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Quota</span>
                    <span className="font-medium text-slate-800">{s.slotAllocation || 'Central Allocation'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-1">Key Coverage</span>
                    <div className="flex flex-wrap gap-1">
                      {s.tags.slice(0, 2).map((t, idx) => (
                        <span key={idx} className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Starting application process for ${s.title}`)}
                  className="mt-4 w-full py-2 bg-[#003748] text-white rounded-lg text-xs font-semibold hover:bg-[#002834]"
                >
                  Apply to this
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export const CommandPaletteModal: React.FC = () => {
  const { isCommandPaletteOpen, setIsCommandPaletteOpen, setSelectedSchemeForDetails, setIsUploadModalOpen } = usePortal()
  const [query, setQuery] = useState('')

  if (!isCommandPaletteOpen) return null

  const filtered = DEFAULT_SCHEMES.filter(s =>
    s.title.toLowerCase().includes(query.toLowerCase()) ||
    s.code.toLowerCase().includes(query.toLowerCase()) ||
    s.description.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search scholarships, fellowships, eligibility criteria..."
            className="w-full text-sm outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="text-xs text-slate-400 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded"
          >
            ESC
          </button>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No schemes found matching &ldquo;{query}&rdquo;</div>
          ) : (
            filtered.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  setSelectedSchemeForDetails(s)
                  setIsCommandPaletteOpen(false)
                }}
                className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-teal-900">{s.title}</div>
                  <div className="text-slate-500 text-[11px]">{s.department} • Grant: {s.grantAmount}</div>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                  {s.matchScore}%
                </span>
              </div>
            ))
          )}

          <div
            onClick={() => {
              setIsUploadModalOpen(true)
              setIsCommandPaletteOpen(false)
            }}
            className="p-3 hover:bg-amber-50/50 rounded-lg cursor-pointer flex items-center gap-2 text-amber-900 font-medium"
          >
            <Upload className="w-4 h-4 text-amber-700" /> Upload / Renew Annual Income Certificate
          </div>
        </div>
      </div>
    </div>
  )
}
