import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card } from '../../components/Layout'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function OfficerDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [queue, setQueue] = useState<any[]>([])

  useEffect(()=>{
    api.get('/officer/dashboard/stats').then(r=>setStats(r.data)).catch(()=>{})
    api.get('/officer/queue?page_size=5').then(r=>setQueue(r.data.items)).catch(()=>{})
  },[])

  if(!stats) return <div className="p-8 text-center">Loading officer dashboard...</div>
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Officer Dashboard</h1>
      <p className="text-sm text-gray-600">Queue, verification priorities, and reports.</p>

      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <Card className="p-5"><div className="text-sm text-gray-500">Total Applications</div><div className="text-2xl font-bold">{stats.total}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">Pending Verification</div><div className="text-2xl font-bold text-amber-600">{stats.pending_verification}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">High Priority</div><div className="text-2xl font-bold text-red-600">{stats.high_priority}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">Deficiencies</div><div className="text-2xl font-bold">{stats.deficiencies}</div></Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <Card className="p-5"><div className="text-sm text-gray-500">Selected</div><div className="text-xl font-bold text-green-600">{stats.selected}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">Rejected</div><div className="text-xl font-bold text-red-600">{stats.rejected}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">Waitlisted</div><div className="text-xl font-bold">{stats.waitlisted}</div></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        <Card className="p-6">
          <h3 className="font-semibold">Applications by Scheme</h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.by_scheme}>
                <XAxis dataKey="scheme" tick={{fontSize:10}} interval={0} angle={-15} dy={20} height={60} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0f5b3a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">Verification Queue (5 latest)</h3>
          <div className="mt-4 space-y-2">
            {queue.map(q=>(
              <div key={q.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                <div><div className="font-medium">{q.applicant_name}</div><div className="text-xs text-gray-500">{q.scheme_name} • {q.status}</div></div>
                <Link to={`/officer/review/${q.id}`} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs">Review</Link>
              </div>
            ))}
            {queue.length===0 && <div className="text-sm text-gray-500">No pending items.</div>}
          </div>
          <Link to="/officer/queue" className="mt-4 inline-flex text-sm text-primary-600 font-medium">View full queue →</Link>
        </Card>
      </div>
    </div>
  )
}
