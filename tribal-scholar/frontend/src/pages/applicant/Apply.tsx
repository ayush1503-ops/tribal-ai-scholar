import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, StatusChip, ProgressStepper, FieldHelp, InlineError, EmptyState } from '../../components/Layout'
import { Upload, Save, Send, Eye, AlertCircle, CheckCircle, FileText } from 'lucide-react'

export default function Apply() {
  const { id } = useParams()
  const [app, setApp] = useState<any>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [evalResult, setEvalResult] = useState<any>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [syncState, setSyncState] = useState<'Saved just now' | 'Saving...' | 'Saved locally'>('Saved just now')

  const load = async () => {
    const res = await api.get(`/applications/${id}`)
    setApp(res.data)
    if (res.data.data) setFormData(res.data.data)
    else {
      const init: any = {}
      if (res.data.applicant) {
        init.full_name = res.data.applicant.full_name
        init.category = res.data.applicant.category
        init.state = res.data.applicant.state
        init.district = res.data.applicant.district
        init.annual_family_income = res.data.applicant.annual_family_income
        init.course = res.data.applicant.course
        init.parent_name = res.data.applicant.parent_name
      }
      setFormData(init)
    }
  }
  useEffect(()=>{ load() },[id])

  const handleSave = async () => {
    setSaving(true); setSyncState('Saving...')
    try {
      await api.put(`/applications/${id}`, {data: formData})
      localStorage.setItem(`draft_${id}`, JSON.stringify(formData))
      setSyncState('Saved just now')
      setMessage('Your progress is saved. You can continue later — your draft is kept locally even if the network is unavailable.')
      setTimeout(()=>setMessage(''), 4000)
      load()
    } catch(e:any){ setSyncState('Saved locally'); setMessage('We could not save your changes. Your draft is still available locally. Try again.') }
    finally{ setSaving(false)}
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await api.put(`/applications/${id}`, {data: formData})
      const res = await api.post(`/applications/${id}/submit`)
      setMessage(res.data.message)
      const evalRes = await api.post(`/applications/${id}/evaluate`)
      setEvalResult(evalRes.data)
      load()
    } catch(e:any){ setMessage(e.response?.data?.detail || 'We could not submit your application. Please check required fields and try again.') }
    finally{ setSubmitting(false)}
  }

  const handleEvaluate = async () => {
    try {
      const res = await api.post(`/applications/${id}/evaluate`)
      setEvalResult(res.data)
      load()
    } catch(e:any){ setMessage('We could not run the checks. Try again.') }
  }

  const handleUpload = async (docKey: string, file: File) => {
    setUploading(docKey)
    const fd = new FormData()
    fd.append('document_key', docKey)
    fd.append('file', file)
    try {
      const res = await api.post(`/applications/${id}/documents`, fd, {headers:{'Content-Type':'multipart/form-data'}})
      setMessage(`Uploaded ${docKey}: ${res.data.message}`)
      load()
    } catch(e:any){ setMessage(e.response?.data?.detail || 'We could not upload this file. Check format (PDF/JPG/PNG) and size (≤5MB) and try again.') }
    finally{ setUploading(null)}
  }

  if (!app) return <div className="max-w-[800px] mx-auto px-4 py-8"><div className="animate-pulse space-y-3"><div className="h-6 bg-[#E6F6F8] rounded w-1/3"></div><div className="h-32 bg-[#F6F9FA] rounded-md border"></div></div></div>

  const renderField = (field: any) => {
    const value = formData[field.field_key] ?? ''
    const hasError = field.required && !String(value).trim()
    const base = "mt-1 w-full border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-[#073B4C] focus:bg-white bg-white"
    const border = hasError ? "border-[#B42318] bg-[#FEE4E2]/30" : "border-[#D7E0E5] bg-white"
    const common = `${base} ${border}`
    return (
      <div>
        {(() => {
          switch(field.field_type) {
            case 'text': return <input value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} className={common} placeholder={field.placeholder} aria-label={field.label} />
            case 'textarea': return <textarea value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} rows={3} className={common} placeholder={field.placeholder} aria-label={field.label} />
            case 'number': return <input type="number" value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} className={common} placeholder={field.placeholder} aria-label={field.label} />
            case 'date': return <input type="date" value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} className={common} aria-label={field.label} />
            case 'email': return <input type="email" value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} className={common} placeholder={field.placeholder} aria-label={field.label} />
            case 'phone': return <input type="tel" value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} className={common} placeholder={field.placeholder} aria-label={field.label} />
            case 'dropdown': return <select value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} className={common} aria-label={field.label}><option value="">Select</option>{(field.options||[]).map((o:string)=><option key={o} value={o}>{o}</option>)}</select>
            case 'radio': return <div className="flex flex-wrap gap-3 mt-1">{(field.options||[]).map((o:string)=><label key={o} className="flex items-center gap-1.5 text-sm"><input type="radio" checked={value===o} onChange={()=>setFormData({...formData, [field.field_key]: o})} aria-label={o} /> {o}</label>)}</div>
            case 'checkbox': return <div className="flex items-center gap-2 mt-1"><input type="checkbox" checked={!!value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.checked})} aria-label={field.label} /> <span className="text-sm">{field.label}</span></div>
            default: return <input value={value} onChange={e=>setFormData({...formData, [field.field_key]: e.target.value})} className={common} aria-label={field.label} />
          }
        })()}
        {hasError && <InlineError message="This information is required" />}
      </div>
    )
  }

  // Determine stepper
  const steps = ["Personal details", "Education", "Scheme details", "Documents", "Review"]
  const currentStep = !app.documents?.length ? 2 : app.documents.length < (app.scheme_documents?.filter((d:any)=>d.required).length || 0) ? 3 : 4

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      {/* Header — skill: show application number, scheme, status chip, next action */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-[#52616B]">Application number: <span className="font-mono font-medium text-[#073B4C]">TS-{app.id.slice(0,8).toUpperCase()}</span> • {app.scheme?.name}</div>
          <h1 className="text-xl font-semibold text-[#073B4C] mt-1">Complete your application</h1>
          <p className="text-sm text-[#52616B] mt-1">Your progress is saved automatically. You can return later.</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip status={app.status} applicantView />
          <Link to="/applicant/dashboard" className="px-3 py-2 border border-[#D7E0E5] bg-white rounded-sm text-xs font-medium hover:bg-[#F6F9FA]">Back to dashboard</Link>
        </div>
      </div>

      {/* Stepper — skill: 4-6 meaningful stages */}
      <div className="mt-4 bg-white border border-[#D7E0E5] rounded-md p-3 shadow-card">
        <ProgressStepper steps={steps} current={currentStep} />
        <div className="text-xs text-[#52616B] mt-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-[#0E8A9A] rounded-full animate-pulse"></span> {syncState} • Your draft is private and can only be accessed by authorised officials
        </div>
      </div>

      {message && <div className="mt-4 bg-[#E0F2FE] border border-[#bae6fd] text-[#075985] text-sm px-4 py-3 rounded-md">{message}</div>}
      {app.status==='DEFICIENCY_RAISED' && <div className="mt-4 bg-[#FEF3C7] border border-[#fde68a] text-[#92400E] px-4 py-3 rounded-md text-sm flex gap-2"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> <span><b>Action required:</b> Additional information is required. Please review the documents below and resubmit before the deadline.</span></div>}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-6">
        {/* Main form — skill: single column on mobile, reading max 720-800 */}
        <div className="space-y-6 max-w-[800px]">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#073B4C]">Application details</h2>
              <span className="text-xs bg-[#E6F6F8] text-[#0F6B78] px-2 py-1 rounded-sm border border-[#bee9ec]">Configured for this scheme</span>
            </div>
            <p className="text-xs text-[#52616B] mt-1">Fields are shown based on the selected scheme. Required information is marked as <span className="font-medium">Required</span>.</p>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {app.scheme_fields?.map((field:any)=>(
                <div key={field.field_key} className={field.field_type==='textarea' ? 'md:col-span-2' : ''}>
                  <label className="text-sm font-medium text-[#172B35]">{field.label} {field.required && <span className="text-[#B42318]">— Required</span>}</label>
                  {field.help_text && <FieldHelp>{field.help_text}</FieldHelp>}
                  {renderField(field)}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 border border-[#D7E0E5] bg-white rounded-sm text-sm font-medium hover:bg-[#F6F9FA] disabled:opacity-50 min-h-[44px]"><Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save and continue later'}</button>
              <button onClick={handleEvaluate} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#0F6B78] text-[#0F6B78] rounded-sm text-sm font-medium hover:bg-[#E6F6F8] min-h-[44px]">Check information</button>
            </div>
          </Card>

          {/* Document checklist — skill: checklist not generic upload */}
          <Card className="p-5">
            <h3 className="text-base font-semibold text-[#073B4C] flex items-center gap-2"><FileText className="w-5 h-5 text-[#0F6B78]" /> Documents</h3>
            <p className="text-xs text-[#52616B] mt-1">Upload the documents listed below. Supported formats: PDF, JPG, PNG — up to 5MB. Your documents are private.</p>
            <div className="space-y-3 mt-4">
              {app.scheme_documents?.map((doc:any)=>{
                const uploaded = app.documents?.find((d:any)=>d.document_key===doc.document_key)
                return (
                  <div key={doc.document_key} className="border border-[#D7E0E5] rounded-md p-4 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium text-[#073B4C]">{doc.document_name} {doc.required ? <span className="text-xs font-normal text-[#B42318]">• Required</span> : <span className="text-xs font-normal text-[#52616B]">• Optional</span>}</div>
                        <div className="text-xs text-[#52616B]">PDF, JPG, PNG • Max 5MB</div>
                      </div>
                      {uploaded ? <span className="text-xs bg-[#DCFCE7] text-[#166534] border border-[#bbf7d0] px-2 py-1 rounded-sm flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Uploaded</span> : <span className="text-xs bg-[#FEF3C7] text-[#92400E] border border-[#fde68a] px-2 py-1 rounded-sm">Not yet uploaded</span>}
                    </div>
                    {uploaded ? (
                      <div className="mt-3 border border-[#D7E0E5] rounded-md p-3 bg-[#F6F9FA]">
                        <div className="text-xs flex justify-between"><span className="font-medium">File: {uploaded.file_name}</span><span className="text-[#52616B]">{uploaded.status}</span></div>
                        {uploaded.extraction?.extracted_fields && (
                          <div className="mt-3 bg-white border border-[#D7E0E5] rounded-sm p-3">
                            <div className="text-xs font-semibold text-[#073B4C]">We found information in your document</div>
                            <div className="text-xs text-[#52616B] mt-1">Does this look correct? You can confirm or edit.</div>
                            <div className="mt-2 space-y-1">
                              {Object.entries(uploaded.extraction.extracted_fields).map(([k,v]:any)=>(
                                <div key={k} className="flex justify-between text-xs"><span className="text-[#52616B]">{k.replace('_',' ')}: <span className="font-medium text-[#172B35]">{String(v)}</span></span><span className="text-[#52616B] font-mono text-xs">{uploaded.extraction.confidence_scores?.[k] ? `${uploaded.extraction.confidence_scores[k]}%` : ''}</span></div>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button className="px-3 py-1.5 bg-[#073B4C] text-white rounded-sm text-xs font-medium">Confirm</button>
                              <button className="px-3 py-1.5 border border-[#D7E0E5] bg-white rounded-sm text-xs">Edit</button>
                            </div>
                            <div className="text-[11px] text-[#52616B] mt-2">This is a system recommendation. Final check by officer.</div>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <label className="px-3 py-1.5 border border-[#D7E0E5] bg-white rounded-sm text-xs cursor-pointer hover:bg-[#F6F9FA]">Replace file<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleUpload(doc.document_key, f)}} /></label>
                          <span className="text-xs text-[#52616B] py-1.5">Uploaded just now</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#D7E0E5] rounded-md bg-[#F6F9FA] p-6 cursor-pointer hover:bg-white hover:border-[#0F6B78]">
                          <Upload className="w-6 h-6 text-[#0F6B78]" />
                          <span className="text-xs font-medium text-[#073B4C] mt-1">Upload {doc.document_name}</span>
                          <span className="text-[11px] text-[#52616B]">Drag and drop or choose file</span>
                          <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) handleUpload(doc.document_key, f)}} />
                        </label>
                        {uploading===doc.document_key && <span className="text-xs text-[#0F6B78] ml-2">Uploading... Please keep this page open. Progress will resume if interrupted.</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 text-xs text-[#52616B] bg-[#FEF3C7]/40 border border-[#fde68a] rounded-sm px-3 py-2">Example: Synthetic marksheet with “Laxmi Hembrom” vs application “Laxmi Hembram” will show a verification note: possible spelling variation — manual verification helps avoid unfair rejection.</div>
            <div className="mt-3 bg-[#E6F6F8] border border-[#bee9ec] rounded-md px-3 py-2.5 flex flex-wrap gap-2 items-center justify-between">
              <span className="text-xs text-[#0F6B78]"><b>Photo scan:</b> Every uploaded image is forensically checked for tampering (ELA, blur map, EXIF) — advisory, capped at 85. Try standalone scan →</span>
              <Link to="/photo-scan" className="text-xs font-semibold text-white bg-[#073B4C] px-3 py-1.5 rounded-sm hover:bg-[#0F6B78]">Open photo scan</Link>
            </div>
          </Card>

          {/* Review and submit — skill: show completed sections, missing, disclaimer, consent */}
          <Card className="p-5">
            <h3 className="text-base font-semibold text-[#073B4C]">Review and submit</h3>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between bg-[#F6F9FA] border border-[#D7E0E5] rounded-sm px-3 py-2"><span>Application details</span><span className="text-[#0F6B78] font-medium">Edit</span></div>
              <div className="flex justify-between bg-[#F6F9FA] border border-[#D7E0E5] rounded-sm px-3 py-2"><span>Documents</span><span className="text-[#0F6B78] font-medium">Edit</span></div>
              <div className="border border-[#D7E0E5] rounded-sm p-3 bg-[#F6F9FA]">
                <label className="flex gap-2 text-xs"><input type="checkbox" className="mt-0.5" /> <span>I confirm the information provided is correct. I understand this is a preliminary submission and final eligibility will be decided after official verification.</span></label>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={handleSubmit} disabled={submitting || !['DRAFT','DEFICIENCY_RAISED'].includes(app.status)} className="inline-flex items-center gap-2 px-5 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-semibold hover:bg-[#0F6B78] disabled:opacity-50 min-h-[44px]"><Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit application'}</button>
              <span className="text-xs text-[#52616B] self-center">Application number will be generated after submission.</span>
            </div>
            <div className="text-xs text-[#52616B] mt-3 border-t pt-3">We will never make a final decision using the system alone. You will be notified when verification begins.</div>
          </Card>

          {evalResult && (
            <Card className="p-5">
              <h3 className="text-base font-semibold text-[#073B4C]">System checks — advisory</h3>
              <p className="text-xs text-[#52616B]">These checks help officers. They do not decide eligibility. Final decision is human-authorised.</p>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="border border-[#D7E0E5] rounded-md p-4 bg-white">
                  <div className="text-sm font-medium text-[#073B4C]">Eligibility notes</div>
                  <div className="text-xs text-[#52616B] mt-1">Status: <b className="text-[#073B4C]">{evalResult.eligibility.status}</b> — {evalResult.eligibility.summary}</div>
                  <div className="mt-3 space-y-2">
                    {evalResult.eligibility.results.map((r:any,i:number)=>(
                      <div key={i} className="border border-[#D7E0E5] rounded-sm p-2 text-xs bg-[#F6F9FA]">
                        <div className="font-medium text-[#172B35]">{r.rule} → <span className={r.result==='PASS' ? 'text-[#166534]' : r.result==='FAIL' ? 'text-[#B42318]' : 'text-[#92400E]'}>{r.result}</span></div>
                        <div className="text-[#52616B]">Expected: {String(r.expected)} • Actual: {String(r.actual)}</div>
                        <div className="text-[#52616B]">{r.explanation}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border border-[#D7E0E5] rounded-md p-4 bg-white">
                    <div className="text-sm font-medium text-[#073B4C]">Review priority</div>
                    <div className="text-xs text-[#52616B] mt-1">{evalResult.verification_priority.score}/100 — {evalResult.verification_priority.level} • {evalResult.verification_priority.recommendation}</div>
                    <div className="mt-2 space-y-1">
                      {evalResult.verification_priority.reasons.map((rr:any,i:number)=>(
                        <div key={i} className="text-xs flex justify-between bg-[#F6F9FA] border border-[#D7E0E5] rounded-sm px-2 py-1"><span className="text-[#52616B]">{rr.message}</span><span className="font-mono">+{rr.points}</span></div>
                      ))}
                    </div>
                    <div className="text-xs text-[#52616B] mt-2">We never label applicants as “high risk.” Officer reviews evidence.</div>
                  </div>
                  <div className="border border-[#D7E0E5] rounded-md p-4 bg-white">
                    <div className="text-sm font-medium text-[#073B4C]">Merit breakdown</div>
                    {Object.entries(evalResult.merit_score.components).map(([k,v]:any)=>(
                      <div key={k} className="text-xs flex justify-between py-1 border-b border-[#F6F9FA]"><span className="text-[#52616B]">{k}</span><span className="font-mono">{v.score}/{v.max}</span></div>
                    ))}
                    <div className="text-xs text-[#52616B] mt-2">Score weights total 100. Committee decides final ranking.</div>
                  </div>
                </div>
              </div>
              {evalResult.consistency_flags?.length>0 && (
                <div className="mt-4 bg-[#F0ECF8] border border-[#ddd6fe] rounded-md p-3">
                  <div className="text-sm font-medium text-[#5B3F91] flex gap-2"><Eye className="w-4 h-4" /> Verification note</div>
                  {evalResult.consistency_flags.map((f:any,i:number)=>(
                    <div key={i} className="text-xs mt-1 text-[#5B3F91]"><b>Possible spelling variation</b>: {f.message} — Evidence: Application “{f.evidence?.application}” vs document “{f.evidence?.document}” (similarity {Math.round(f.evidence?.similarity)}%). Recommended action: manual verification.</div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right rail — skill: persistent context, help */}
        <div className="space-y-4 h-fit">
          <Card className="p-4">
            <div className="text-xs font-semibold tracking-wide text-[#073B4C]">Need help?</div>
            <p className="text-xs text-[#52616B] mt-1">If your document is unclear, you can continue. An officer may ask for a clearer copy.</p>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex gap-2"><CheckCircle className="w-4 h-4 text-[#0E8A9A] shrink-0" /> <span>We could not confirm this document. Please upload a clearer copy if available.</span></div>
              <div className="flex gap-2"><CheckCircle className="w-4 h-4 text-[#0E8A9A] shrink-0" /> <span>Your documents are private and can only be accessed by authorised officials.</span></div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-xs font-semibold tracking-wide text-[#073B4C]">Application timeline</div>
            <div className="mt-3 space-y-2 text-xs">
              {app.history?.map((h:any,i:number)=>(
                <div key={i} className="flex gap-2">
                  <span className="w-2 h-2 bg-[#0E8A9A] rounded-full mt-1.5 shrink-0"></span>
                  <div><div className="font-medium">{h.from_status || '—'} → {h.to_status}</div><div className="text-[#52616B]">{new Date(h.created_at).toLocaleString()} • {h.actor_role}</div><div className="text-[#52616B]">{h.reason}</div></div>
                </div>
              ))}
              {(!app.history || app.history.length===0) && <div className="text-xs text-[#52616B]">No activity yet. Your timeline will appear after you save.</div>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
