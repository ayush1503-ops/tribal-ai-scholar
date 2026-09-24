import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'

export default function Appeals() {
  const [appeals, setAppeals] = useState<any[]>([])
  const [grievances, setGrievances] = useState<any[]>([])
  const [tab, setTab] = useState<'appeals'|'grievances'>('appeals')
  const [form, setForm] = useState({subject:'', description:'', application_id:''})
  const [msg, setMsg] = useState('')

  const load = async ()=> {
    const a = await api.get('/appeals'); setAppeals(a.data.items)
    const g = await api.get('/grievances'); setGrievances(g.data.items)
  }
  useEffect(()=>{ load() },[])

  const submitAppeal = async (e:React.FormEvent)=>{
    e.preventDefault()
    try{ await api.post('/appeals', form); setMsg('Appeal submitted'); setForm({subject:'',description:'',application_id:''}); load() } catch(e:any){ setMsg(e.response?.data?.detail || 'Failed')}
  }
  const submitGrievance = async (e:React.FormEvent)=>{
    e.preventDefault()
    try{ await api.post('/grievances', form); setMsg('Grievance submitted'); setForm({subject:'',description:'',application_id:''}); load() } catch(e:any){ setMsg(e.response?.data?.detail || 'Failed')}
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Appeals & Grievances</h1>
      <div className="flex gap-2 mt-4">
        <button onClick={()=>setTab('appeals')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==='appeals' ? 'bg-primary-600 text-white' : 'border'}`}>My Appeals</button>
        <button onClick={()=>setTab('grievances')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab==='grievances' ? 'bg-primary-600 text-white' : 'border'}`}>My Grievances</button>
      </div>
      {msg && <div className="mt-4 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">{msg}</div>}

      <Card className="p-6 mt-6">
        <h3 className="font-semibold">Create {tab==='appeals' ? 'Appeal' : 'Grievance'}</h3>
        <form onSubmit={tab==='appeals' ? submitAppeal : submitGrievance} className="mt-3 space-y-3">
          <input value={form.subject} onChange={e=>setForm({...form, subject:e.target.value})} placeholder="Subject" required className="w-full border rounded-lg px-3 py-2 text-sm" />
          <textarea value={form.description} onChange={e=>setForm({...form, description:e.target.value})} placeholder="Description" required rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={form.application_id} onChange={e=>setForm({...form, application_id:e.target.value})} placeholder="Application ID (optional)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Submit</button>
        </form>
      </Card>

      <div className="mt-6 space-y-3">
        {(tab==='appeals' ? appeals : grievances).map((item:any)=>(
          <Card key={item.id} className="p-4">
            <div className="font-medium text-sm">{item.subject}</div>
            <div className="text-sm text-gray-600 mt-1">{item.description}</div>
            <div className="text-xs text-gray-500 mt-2">Status: {item.status} • {new Date(item.created_at).toLocaleString()}</div>
            {item.officer_response && <div className="mt-2 text-sm bg-gray-50 border rounded-lg p-2">Response: {item.officer_response}</div>}
            {item.response && <div className="mt-2 text-sm bg-gray-50 border rounded-lg p-2">Response: {item.response}</div>}
          </Card>
        ))}
        {(tab==='appeals' ? appeals : grievances).length===0 && <div className="text-sm text-gray-500 text-center py-6">No {tab} yet.</div>}
      </div>
    </div>
  )
}
