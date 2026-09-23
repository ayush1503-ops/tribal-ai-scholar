import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, StatusBadge } from '../../components/Layout'
import { PhotoScanCard } from '../../components/PhotoScanCard'
import { ScanLine } from 'lucide-react'

export default function Review() {
  const { id } = useParams()
  const [app, setApp] = useState<any>(null)
  const [decision, setDecision] = useState('verify')
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')
  const [scanResults, setScanResults] = useState<Record<string,any>>({})
  const [scanningId, setScanningId] = useState<string|null>(null)

  const load = async ()=> {
    const res = await api.get(`/officer/applications/${id}`)
    setApp(res.data)
  }
  useEffect(()=>{ load() },[id])

  const submit = async ()=>{
    if(!reason) { setMsg('Reason required'); return }
    try{
      const res = await api.post(`/officer/applications/${id}/decision`, {decision, reason})
      setMsg(res.data.message)
      load()
    } catch(e:any){ setMsg(e.response?.data?.detail || 'Decision failed')}
  }

  if(!app) return <div className="p-8 text-center text-sm">Loading verification workspace...</div>

  const vp = app.verification_priority

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      <Link to="/officer/queue" className="text-xs text-[#0f3a5f] hover:underline">← Back to queue</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
        <h1 className="text-lg font-bold text-[#0f3a5f]">Verification Workspace <span className="font-normal text-gray-500">• {app.applicant?.full_name}</span></h1>
        <StatusBadge status={app.status} />
      </div>

      {msg && <div className="mt-4 bg-[#fff8e6] border border-[#ffe4a3] text-[#6b4a00] px-3 py-2 rounded-sm text-xs">{msg}</div>}

      <div className="grid lg:grid-cols-3 gap-4 mt-5">
        {/* Left: Applicant */}
        <Card className="p-4">
          <div className="text-[11px] font-bold tracking-wide text-[#0f3a5f] border-l-4 border-[#0f3a5f] pl-2">Applicant Details</div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="font-bold text-sm text-[#0f3a5f]">{app.applicant?.full_name}</div>
            <div className="text-gray-600">{app.applicant?.category} • {app.applicant?.state} • {app.applicant?.district}</div>
            <div className="grid grid-cols-2 gap-2 text-xs border-t pt-3 mt-3">
              <div><span className="text-gray-500">Course</span><div className="font-medium">{app.applicant?.course}</div></div>
              <div><span className="text-gray-500">Income</span><div className="font-medium">₹{app.applicant?.annual_family_income?.toLocaleString('en-IN')}</div></div>
              <div><span className="text-gray-500">Parent</span><div className="font-medium">{app.applicant?.parent_name}</div></div>
              <div><span className="text-gray-500">Mobile</span><div className="font-medium font-mono">{app.applicant?.mobile}</div></div>
            </div>
            <div className="pt-3 border-t mt-3">
              <div className="text-[11px] font-semibold tracking-wide text-gray-700">Application Fields</div>
              <div className="mt-2 space-y-1">
                {app.field_values?.map((fv:any)=> <div key={fv.field_key} className="flex justify-between bg-[#f8f9fb] border border-gray-100 px-2 py-1"><span className="text-gray-600">{fv.field_key}</span><span className="font-medium">{fv.value}</span></div>)}
              </div>
            </div>
            <div className="pt-3 border-t">
              <div className="text-[11px] font-semibold tracking-wide text-gray-700">Deterministic Eligibility</div>
              {app.eligibility_result ? (
                <div className={`text-[11px] px-2 py-1 rounded-sm inline-flex border mt-1 font-semibold ${app.eligibility_result.status==='ELIGIBLE'?'bg-[#e8f5e9] text-[#1b5e20] border-[#a5d6a7]':'bg-[#fff8e6] text-[#7a4a00] border-[#ffe4a3]'}`}>{app.eligibility_result.status} — {app.eligibility_result.summary}</div>
              ): <div className="text-xs text-gray-500">Not evaluated</div>}
              {app.eligibility_result?.results?.map((r:any,i:number)=>(
                <div key={i} className="text-xs border border-gray-200 rounded-sm p-2 mt-2 bg-white">
                  <div className="font-medium text-gray-900">{r.rule} → <span className={r.result==='PASS'?'text-green-700':r.result==='FAIL'?'text-red-700':'text-[#7a4a00]'}>{r.result}</span></div>
                  <div className="text-[11px] text-gray-600">Expected {String(r.expected)} • Actual {String(r.actual)}</div>
                  <div className="text-[11px] text-gray-500">{r.explanation}</div>
                </div>
              ))}
            </div>
            {app.merit_score && (
              <div className="pt-3 border-t">
                <div className="text-[11px] font-semibold tracking-wide text-gray-700">Merit Score: {app.merit_score.total}/100</div>
                <div className="mt-1.5 grid gap-1">
                  {Object.entries(app.merit_score.components).map(([k,v]:any)=>(
                    <div key={k} className="flex justify-between text-[11px] border border-gray-100 bg-[#f8f9fb] px-2 py-1"><span>{k}</span><span className="font-mono font-semibold">{v.score}/{v.max}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Center: Documents */}
        <Card className="p-4">
          <div className="text-[11px] font-bold tracking-wide text-[#0f3a5f] border-l-4 border-[#138808] pl-2">Documents & Extraction</div>
          <div className="mt-3 space-y-3">
            {app.documents?.map((d:any)=>(
              <div key={d.id} className="border border-gray-200 rounded-sm p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#0f3a5f]">{d.document_name}</div>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-sm border font-semibold ${d.status==='verified'?'bg-[#e8f5e9] text-[#1b5e20] border-[#a5d6a7]':'bg-[#fff8e6] text-[#7a4a00] border-[#ffe4a3]'}`}>{d.status}</span>
                </div>
                <div className="text-[11px] text-gray-500 font-mono">File: {d.file_name}</div>
                {d.extraction && (
                  <div className="mt-2 bg-[#f8f9fb] border border-gray-200 rounded-sm p-2 text-[11px]">
                    <div className="text-[11px] font-semibold tracking-wide text-gray-700">System Extraction — {d.extraction.ocr_engine}</div>
                    {d.extraction.extracted_fields && Object.entries(d.extraction.extracted_fields).map(([k,v]:any)=>(
                      <div key={k} className="flex justify-between py-0.5"><span className="text-gray-700">{k}: <span className="font-medium text-gray-900">{String(v)}</span></span><span className="text-gray-500 font-mono">{d.extraction.confidence_scores?.[k] ? `${d.extraction.confidence_scores[k]}%` : ''}</span></div>
                    ))}
                    {d.extraction.extracted_text && <details className="mt-1"><summary className="cursor-pointer text-[#0f3a5f] font-medium">View raw text</summary><pre className="whitespace-pre-wrap bg-white border border-gray-200 p-2 rounded-sm mt-1 font-mono text-[11px]">{d.extraction.extracted_text}</pre></details>}
                  </div>
                )}
                <div className="mt-2 flex gap-2 flex-wrap">
                  <button onClick={async()=>{ await api.post(`/documents/${d.id}/verify`, {action:'verified', reason:'Verified by officer'}); load()}} className="px-3 py-1 bg-[#0f3a5f] text-white rounded-sm text-[11px] font-semibold hover:bg-[#0d2f4d]">Verify</button>
                  <button onClick={async()=>{ await api.post(`/documents/${d.id}/verify`, {action:'rejected', reason:'Document rejected'}); load()}} className="px-3 py-1 border border-gray-300 bg-white rounded-sm text-[11px]">Reject</button>
                  <button
                    onClick={async()=>{
                      setScanningId(d.id)
                      try{
                        const r = await api.post(`/documents/${d.id}/scan`)
                        setScanResults(prev=>({...prev, [d.id]: r.data}))
                      } catch(e:any){ setScanResults(prev=>({...prev, [d.id]: {forensic:{level:'High', score: 62, verdict:'Scan error — manual review', evidence:[e.response?.data?.detail||'Scan failed']}}}))}
                      finally{ setScanningId(null)}
                    }}
                    className="px-3 py-1 border border-[#0F6B78] text-[#0F6B78] bg-white rounded-sm text-[11px] font-medium hover:bg-[#E6F6F8] inline-flex items-center gap-1"
                  >
                    <ScanLine className="w-3 h-3" /> {scanningId===d.id? 'Scanning…':'Photo scan — fake check'}
                  </button>
                </div>
                {scanResults[d.id] && (
                  <div className="mt-3">
                    <PhotoScanCard forensic={scanResults[d.id].forensic} quality={scanResults[d.id].quality} classification={scanResults[d.id].classification} summary={scanResults[d.id].summary} />
                  </div>
                )}
              </div>
            ))}
            {(!app.documents || app.documents.length===0) && <div className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-sm p-6 text-center">No documents uploaded.</div>}
          </div>
        </Card>

        {/* Right: System Checks + Decision */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-[11px] font-bold tracking-wide text-[#0f3a5f] border-l-4 border-[#ff9933] pl-2">System Checks — Advisory</div>
            <div className="text-[11px] text-gray-500 mt-1">For officer review only. Not a final decision.</div>
            {vp ? (
              <div className="mt-3">
                <div className="flex items-center justify-between border border-gray-200 rounded-sm px-3 py-2 bg-[#f8f9fb]">
                  <span className="text-xs font-mono font-bold">{vp.score} / 100</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-sm border font-bold ${vp.level==='High'?'bg-[#ffebee] text-[#b71c1c] border-[#ef9a9a]':vp.level==='Medium'?'bg-[#fff8e6] text-[#7a4a00] border-[#ffe4a3]':'bg-[#e8f5e9] text-[#1b5e20] border-[#a5d6a7]'}`}>{vp.level} Priority</span>
                </div>
                <div className="text-xs mt-2 font-medium text-gray-900">{vp.recommendation}</div>
                <div className="mt-2 space-y-1">
                  {vp.reasons?.map((r:any,i:number)=>(
                    <div key={i} className="flex gap-2 text-[11px] border border-gray-100 bg-white px-2 py-1.5">
                      <span className="flex-1 text-gray-700">{r.message}</span><span className="font-mono font-semibold">+{r.points}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">Verification notes are advisory. Officer must review evidence and record reason. No automatic rejection.</p>
              </div>
            ) : <div className="text-xs text-gray-500 mt-3 border border-dashed border-gray-300 rounded-sm p-4 text-center">No checks calculated. Ask applicant to submit and run evaluation.</div>}

            <div className="mt-4 border-t pt-3">
              <div className="text-[11px] font-semibold tracking-wide text-gray-700">Consistency Example</div>
              <div className="text-[11px] bg-[#fff8e6] border border-[#ffe4a3] rounded-sm p-2 mt-1 leading-relaxed">
                Application <span className="font-mono bg-white border px-1">Laxmi Hembram</span> vs Marksheet <span className="font-mono bg-white border px-1">Laxmi Hembrom</span> → Similarity 92.3 (RapidFuzz) → <span className="font-semibold">Possible spelling variation — Manual review recommended.</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-[11px] font-bold tracking-wide text-[#0f3a5f]">Officer Decision — Record with Reason</div>
            <p className="text-[11px] text-gray-500 mt-1">Final decision by authorised personnel. Audit trail captures actor, time and reason.</p>
            <div className="mt-3 space-y-2.5">
              <select value={decision} onChange={e=>setDecision(e.target.value)} className="w-full border border-gray-300 rounded-sm px-2.5 py-2 text-xs bg-white">
                <option value="verify">Verify / Forward</option>
                <option value="deficiency">Raise Deficiency</option>
                <option value="reject">Reject</option>
                <option value="select">Select (Committee)</option>
                <option value="waitlist">Waitlist</option>
                <option value="sanction">Sanction</option>
                <option value="payment">Release Payment</option>
              </select>
              <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason (required for reject/deficiency) — will be recorded in audit log" rows={3} className="w-full border border-gray-300 rounded-sm px-2.5 py-2 text-xs" />
              <button onClick={submit} className="w-full bg-[#0f3a5f] text-white py-2 rounded-sm text-xs font-bold hover:bg-[#0d2f4d]">Submit Decision</button>
              <div className="text-[11px] text-gray-500">Will be logged with IP and timestamp. Cannot be casually edited.</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-[11px] font-bold tracking-wide text-[#0f3a5f]">Status History</div>
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {app.history?.map((h:any,i:number)=>(
                <div key={i} className="border-b border-gray-100 py-1.5 text-[11px]"><span className="font-mono font-semibold">{h.from_status || '—'} → {h.to_status}</span> <span className="text-gray-500">• {h.actor_role} • {new Date(h.created_at).toLocaleString()}</span><div className="text-gray-600">{h.reason}</div></div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
