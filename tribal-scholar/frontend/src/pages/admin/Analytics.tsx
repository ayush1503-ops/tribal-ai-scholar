import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function Analytics() {
  const [data, setData] = useState<any>(null)
  useEffect(()=>{ api.get('/admin/analytics').then(r=>setData(r.data)) },[])
  if(!data) return <div className="p-8 text-center">Loading...</div>
  const COLORS=['#0f5b3a','#0d4a2e','#22c55e','#f59e0b','#ef4444','#8b5cf6']
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6"><h3 className="font-semibold">Applications by Status</h3><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.applications_by_status}><XAxis dataKey="name" tick={{fontSize:9}} interval={0} angle={-20} height={60}/><YAxis/><Tooltip/><Bar dataKey="value" fill="#0f5b3a" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-6"><h3 className="font-semibold">By District</h3><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.applications_by_district}><XAxis dataKey="district" tick={{fontSize:9}} /><YAxis/><Tooltip/><Bar dataKey="count" fill="#0f4a2e" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-6"><h3 className="font-semibold">Document Verification Status</h3><div className="h-64 mt-4"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data.document_verification_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>{data.document_verification_status.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div></Card>
        <Card className="p-6"><h3 className="font-semibold">Summary</h3><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between border rounded-lg px-3 py-2"><span>Appeals</span><b>{data.appeal_count}</b></div><div className="flex justify-between border rounded-lg px-3 py-2"><span>Grievances</span><b>{data.grievance_count}</b></div><div className="text-xs text-gray-500 mt-2">Generated at {new Date(data.generated_at).toLocaleString()}</div></div></Card>
      </div>
    </div>
  )
}
