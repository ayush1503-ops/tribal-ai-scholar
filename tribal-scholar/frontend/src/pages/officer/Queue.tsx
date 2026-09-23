import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card, StatusBadge } from '../../components/Layout'

export default function Queue() {
  const [items, setItems] = useState<any[]>([])
  const [filters, setFilters] = useState({status:'', scheme:'', district:'', priority:''})

  const load = async ()=>{
    const res = await api.get('/officer/queue', {params: {
      status: filters.status || undefined,
      verification_priority: filters.priority || undefined,
      page_size: 20
    }})
    setItems(res.data.items)
  }
  useEffect(()=>{ load() },[])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Verification Queue</h1>
      <Card className="p-4 mt-4">
        <div className="grid md:grid-cols-4 gap-3">
          <select value={filters.status} onChange={e=>setFilters({...filters, status:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="AUTOMATED_CHECK">AUTOMATED_CHECK</option>
            <option value="INSTITUTE_VERIFICATION">INSTITUTE_VERIFICATION</option>
            <option value="OFFICER_SCRUTINY">OFFICER_SCRUTINY</option>
            <option value="DEFICIENCY_RAISED">DEFICIENCY_RAISED</option>
          </select>
          <select value={filters.priority} onChange={e=>setFilters({...filters, priority:e.target.value})} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <input placeholder="District" value={filters.district} onChange={e=>setFilters({...filters, district:e.target.value})} className="border rounded-lg px-3 py-2 text-sm" />
          <button onClick={load} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Apply Filters</button>
        </div>
      </Card>

      <div className="mt-6 space-y-3">
        {items.map(app=>(
          <Card key={app.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{app.applicant_name} • {app.applicant_district || '—'}, {app.applicant_state || ''}</div>
              <div className="text-sm text-gray-600">{app.scheme_name}</div>
              <div className="text-xs text-gray-500">ID {app.id.slice(0,8)} • {new Date(app.created_at).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={app.status} />
              {app.verification_priority && <span className={`text-xs px-2 py-1 rounded-full border ${app.verification_priority.level==='High'?'bg-red-50 text-red-700 border-red-200':app.verification_priority.level==='Medium'?'bg-amber-50 text-amber-700 border-amber-200':'bg-green-50 text-green-700 border-green-200'}`}>{app.verification_priority.score}/100 {app.verification_priority.level}</span>}
              <Link to={`/officer/review/${app.id}`} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm">Open Workspace</Link>
            </div>
          </Card>
        ))}
        {items.length===0 && <div className="text-center py-12 text-gray-500">No applications in queue.</div>}
      </div>
    </div>
  )
}
