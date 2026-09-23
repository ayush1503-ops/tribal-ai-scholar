import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, StatusBadge } from '../../components/Layout'

export default function Timeline() {
  const { id } = useParams()
  const [app, setApp] = useState<any>(null)
  useEffect(()=>{ if(id) api.get(`/applications/${id}`).then(r=>setApp(r.data)) },[id])
  if(!app) return <div className="p-8 text-center">Loading...</div>
  const steps = [
    "Application Created",
    "Submitted",
    "Automated Checks",
    "Document Verification",
    "Officer Scrutiny",
    "Committee Review",
    "Decision",
    "Sanction",
    "Payment"
  ]
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/applicant/dashboard" className="text-sm text-gray-600 hover:text-gray-900">← Dashboard</Link>
      <h1 className="text-2xl font-bold mt-2">Application Timeline</h1>
      <div className="flex items-center gap-2 mt-2"><span className="text-sm text-gray-600">Status:</span><StatusBadge status={app.status} /></div>
      <Card className="p-6 mt-6">
        <div className="space-y-0">
          {app.history?.map((h:any,i:number)=>(
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-primary-600 rounded-full mt-1"></div>
                {i < app.history.length-1 && <div className="w-px h-12 bg-gray-200"></div>}
              </div>
              <div className="pb-6">
                <div className="text-sm font-medium">{h.from_status || 'Start'} → {h.to_status}</div>
                <div className="text-xs text-gray-500">{new Date(h.created_at).toLocaleString()} • {h.actor_role} • {h.reason || '—'}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold text-sm">Visual Stages</h3>
          <div className="mt-3 flex flex-wrap gap-1">
            {steps.map((s, idx)=> <span key={idx} className="text-xs bg-gray-50 border px-2.5 py-1 rounded-full">{idx+1}. {s}</span>)}
          </div>
        </div>
        {app.eligibility_result && (
          <div className="mt-6 border rounded-lg p-4">
            <h4 className="font-semibold text-sm">Eligibility Details</h4>
            {app.eligibility_result.results.map((r:any,i:number)=>(
              <div key={i} className="text-xs border rounded-lg p-2 mt-2">
                <div className="font-medium">{r.rule} → {r.result}</div>
                <div>Expected: {String(r.expected)} | Actual: {String(r.actual)}</div>
                <div className="text-gray-500">{r.explanation}</div>
              </div>
            ))}
          </div>
        )}
        {app.verification_priority && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            Verification Priority: {app.verification_priority.score}/100 — {app.verification_priority.level} — {app.verification_priority.recommendation}
          </div>
        )}
        {app.merit_score && (
          <div className="mt-4 p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm">
            Merit: {app.merit_score.total}/100 — {Object.entries(app.merit_score.components).map(([k,v]:any)=>`${k} ${v.score}/${v.max}`).join(' • ')}
          </div>
        )}
      </Card>
    </div>
  )
}
