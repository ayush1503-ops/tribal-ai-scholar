import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'

export default function CommitteeDashboard() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState('')

  const load = async ()=> {
    const res = await api.get('/committee/candidates')
    setCandidates(res.data.items)
  }
  useEffect(()=>{ load() },[])

  const decide = async (id:string, decision:string)=>{
    if(!reason) { setMsg('Reason required'); return }
    await api.post('/committee/decision', {application_id: id, decision, reason})
    setMsg(`Decision ${decision} recorded`)
    load()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Committee Dashboard</h1>
      <p className="text-sm text-gray-600">Review merit, eligibility, documents, AI flags — record Selected / Waitlisted / Not selected with reason.</p>
      {msg && <div className="mt-4 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">{msg}</div>}
      <Card className="p-4 mt-4">
        <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Reason for decision (required)" className="w-full border rounded-lg px-3 py-2 text-sm" />
      </Card>
      <div className="mt-6 space-y-3">
        {candidates.map(c=>(
          <Card key={c.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{c.applicant_name} • {c.district}, {c.state} • {c.course}</div>
                <div className="text-xs text-gray-500">{c.category} • Merit: {c.merit_score?.total || 0}/100 • Status: {c.status}</div>
                <div className="text-xs mt-1">Verification: {c.verification_priority?.score || 0}/100 {c.verification_priority?.level || ''}</div>
                {c.eligibility_result && <div className="text-xs">Eligibility: {c.eligibility_result.status}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>decide(c.id,'selected')} className="px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm">Selected</button>
                <button onClick={()=>decide(c.id,'waitlisted')} className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-sm">Waitlist</button>
                <button onClick={()=>decide(c.id,'not_selected')} className="px-4 py-1.5 border rounded-lg text-sm">Not Selected</button>
              </div>
            </div>
            {c.merit_score && (
              <div className="mt-3 grid grid-cols-5 gap-2 text-xs">
                {Object.entries(c.merit_score.components).map(([k,v]:any)=>(
                  <div key={k} className="border rounded-lg px-2 py-1 text-center"><div className="font-medium">{k}</div><div>{v.score}/{v.max}</div></div>
                ))}
              </div>
            )}
          </Card>
        ))}
        {candidates.length===0 && <div className="text-center py-8 text-gray-500">No candidates in committee review. Move applications to COMMITTEE_REVIEW via officer.</div>}
      </div>
    </div>
  )
}
