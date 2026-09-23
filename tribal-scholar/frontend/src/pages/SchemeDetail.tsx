import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { Card, StatusBadge } from '../components/Layout'
import { ArrowLeft, Calendar, Users, IndianRupee, FileText } from 'lucide-react'

export default function SchemeDetail() {
  const { id } = useParams()
  const [scheme, setScheme] = useState<any>(null)
  const nav = useNavigate()
  useEffect(()=>{ if(id) api.get(`/schemes/${id}`).then(r=>setScheme(r.data)) },[id])
  if (!scheme) return <div className="p-8 text-center">Loading...</div>

  const handleApply = async () => {
    try {
      // create draft application
      const res = await api.post('/applications', {scheme_id: scheme.id, data: {}})
      nav(`/applicant/apply/${res.data.id}`)
    } catch (e:any) {
      if (e.response?.data?.detail?.includes('already exists')) {
        // find existing
        const list = await api.get('/applications', {params:{scheme_id: scheme.id}})
        const existing = list.data.items?.[0]
        if (existing) nav(`/applicant/apply/${existing.id}`)
      } else {
        alert(e.response?.data?.detail || 'Failed to create application')
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/schemes" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft className="w-4 h-4" /> Back to schemes</Link>
      <Card className="p-6 sm:p-8 mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{scheme.name}</h1>
            <p className="text-gray-600 mt-2 max-w-3xl">{scheme.description}</p>
          </div>
          <StatusBadge status={scheme.status} />
        </div>
        <div className="grid sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 border rounded-xl p-4"><div className="text-xs text-gray-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Seats</div><div className="font-bold text-lg">{scheme.seats}</div></div>
          <div className="bg-gray-50 border rounded-xl p-4"><div className="text-xs text-gray-500 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> Income limit</div><div className="font-bold text-lg">₹{scheme.income_limit?.toLocaleString('en-IN')}</div></div>
          <div className="bg-gray-50 border rounded-xl p-4"><div className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Deadline</div><div className="font-bold">{scheme.end_date ? new Date(scheme.end_date).toLocaleDateString() : 'Open'}</div></div>
          <div className="bg-gray-50 border rounded-xl p-4"><div className="text-xs text-gray-500">Category</div><div className="font-bold">{scheme.target_category} • {scheme.education_level}</div></div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-8">
          <div>
            <h3 className="font-semibold">Eligibility summary</h3>
            <ul className="mt-2 text-sm text-gray-700 space-y-1 list-disc pl-5">
              <li>Category: {scheme.target_category} (deterministic rule)</li>
              <li>Annual family income ≤ ₹{scheme.income_limit?.toLocaleString('en-IN')}</li>
              <li>Age: {scheme.age_min}–{scheme.age_max} years</li>
              <li>Course: {scheme.rules.find((r:any)=>r.field_key==='course')?.value || 'As configured'}</li>
            </ul>
            <div className="mt-4">
              <h4 className="text-sm font-semibold">Dynamic fields (from configurator)</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {scheme.fields.map((f:any)=>(
                  <span key={f.field_key} className={`text-xs px-2.5 py-1 rounded-full border ${f.required?'bg-primary-50 border-primary-200 text-primary-700':'bg-gray-50'}`}>{f.label}{f.required?' *':''}</span>
                ))}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">Required documents</h3>
            <div className="mt-2 space-y-2">
              {scheme.documents.map((d:any)=>(
                <div key={d.document_key} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> {d.document_name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border ${d.required?'bg-red-50 text-red-700 border-red-200':'bg-gray-50'}`}>{d.required?'Required':'Optional'}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm">
              <div className="font-medium text-primary-800">Merit weights</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {scheme.score_weights.map((w:any)=> <span key={w.component} className="text-xs bg-white border px-2 py-1 rounded-full">{w.component}: {w.weight}</span>)}
              </div>
              <div className="text-xs text-gray-600 mt-1">Total must equal 100. Admin can change weights.</div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={handleApply} className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Start Application</button>
          <Link to="/schemes" className="px-6 py-3 border rounded-lg text-sm">Back</Link>
        </div>
        <p className="text-xs text-gray-500 mt-3">Application form is dynamically generated from scheme_fields & scheme_documents. If admin adds/removes a field, applicant form updates automatically.</p>
      </Card>
    </div>
  )
}
