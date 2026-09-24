import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'

export default function Profile() {
  const [profile, setProfile] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [msg, setMsg] = useState('')
  useEffect(()=>{ api.get('/profile').then(r=>{setProfile(r.data); setForm(r.data.applicant || {})}) },[])
  const save = async (e:React.FormEvent)=>{
    e.preventDefault()
    try{ await api.put('/profile', form); setMsg('Profile updated (synthetic data)');} catch(e:any){ setMsg(e.response?.data?.detail || 'Failed')}
  }
  if(!profile) return <div className="p-8 text-center">Loading...</div>
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Applicant Profile</h1>
      <p className="text-sm text-gray-600">Synthetic demo — no real IDs. Bank placeholder only.</p>
      {msg && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">{msg}</div>}
      <Card className="p-6 mt-6">
        <form onSubmit={save} className="grid md:grid-cols-2 gap-4">
          {[
            ['full_name','Full Name','text'],
            ['dob','Date of Birth','date'],
            ['gender','Gender','text'],
            ['category','Category','text'],
            ['state','State','text'],
            ['district','District','text'],
            ['mobile','Mobile','text'],
            ['email','Email','email'],
            ['course','Course','text'],
            ['admission_year','Admission Year','number'],
            ['annual_family_income','Annual Family Income','number'],
            ['parent_name','Parent Name','text'],
            ['bank_account_placeholder','Bank (placeholder)','text'],
            ['address','Address','textarea'],
          ].map(([key,label,type])=>(
            <div key={key} className={key==='address' ? 'md:col-span-2' : ''}>
              <label className="text-sm font-medium">{label}</label>
              {type==='textarea' ? <textarea value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              : <input type={type} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />}
            </div>
          ))}
          <div className="md:col-span-2 flex gap-3">
            <button className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">Save Profile</button>
            <span className="text-xs text-gray-500 py-2">Do not use real Aadhaar/bank numbers.</span>
          </div>
        </form>
      </Card>
    </div>
  )
}
