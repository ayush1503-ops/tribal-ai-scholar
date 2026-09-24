import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import { Card } from '../../components/Layout'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  useEffect(()=>{
    api.get('/admin/dashboard').then(r=>setData(r.data))
    api.get('/admin/analytics').then(r=>setAnalytics(r.data))
  },[])
  if(!data) return <div className="p-8 text-center">Loading admin dashboard...</div>
  const COLORS = ['#0f5b3a','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-4 mt-6">
        <Card className="p-5"><div className="text-sm text-gray-500">Total Applications</div><div className="text-2xl font-bold">{data.total_applications}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">Total Schemes</div><div className="text-2xl font-bold">{data.total_schemes}</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">Avg Processing</div><div className="text-2xl font-bold">{data.avg_processing_time_days} days</div></Card>
        <Card className="p-5"><div className="text-sm text-gray-500">Deficiency Rate</div><div className="text-2xl font-bold">{data.deficiency_rate}%</div></Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h3 className="font-semibold">Applications by Status</h3>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_status.map((d:any)=>({name:d.status, value:d.count}))}>
                <XAxis dataKey="name" tick={{fontSize:9}} interval={0} angle={-20} height={60}/>
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0f5b3a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">Verification Priority Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={Object.entries(data.verification_priority_distribution).map(([k,v]:any)=>({name:k, value:v}))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                  {Object.entries(data.verification_priority_distribution).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 justify-center text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Low</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> Medium</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> High</span>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <h3 className="font-semibold">By District</h3>
          <div className="mt-3 space-y-2">
            {data.by_district.map((d:any)=>(
              <div key={d.district} className="flex justify-between text-sm border rounded-lg px-3 py-2"><span>{d.district}</span><span className="font-medium">{d.count}</span></div>
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold">By Scheme</h3>
          <div className="mt-3 space-y-2">
            {data.by_scheme.map((s:any)=>(
              <div key={s.scheme} className="flex justify-between text-sm border rounded-lg px-3 py-2"><span className="truncate pr-4">{s.scheme}</span><span className="font-medium">{s.count}</span></div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Link to="/admin/schemes" className="p-6 bg-white border rounded-xl hover:shadow-md"><div className="font-semibold">Scheme Configurator</div><div className="text-sm text-gray-500 mt-1">Create / edit schemes — no code</div></Link>
        <Link to="/admin/analytics" className="p-6 bg-white border rounded-xl hover:shadow-md"><div className="font-semibold">Analytics</div><div className="text-sm text-gray-500 mt-1">Charts & processing metrics</div></Link>
        <Link to="/admin/audit" className="p-6 bg-white border rounded-xl hover:shadow-md"><div className="font-semibold">Audit Logs</div><div className="text-sm text-gray-500 mt-1">Who, what, when, reason</div></Link>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        <Link to="/admin/fairness" className="p-6 bg-white border rounded-xl hover:shadow-md"><div className="font-semibold">Fairness Monitoring</div><div className="text-sm text-gray-500 mt-1">Aggregate district stats</div></Link>
        <Link to="/admin/simulator" className="p-6 bg-white border rounded-xl hover:shadow-md"><div className="font-semibold">Scheme Simulator</div><div className="text-sm text-gray-500 mt-1">Test config impact</div></Link>
        <Link to="/admin/users" className="p-6 bg-white border rounded-xl hover:shadow-md"><div className="font-semibold">Users & Roles</div><div className="text-sm text-gray-500 mt-1">RBAC management</div></Link>
      </div>
    </div>
  )
}
