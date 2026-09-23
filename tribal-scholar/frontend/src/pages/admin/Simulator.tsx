import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'

export default function Simulator() {
  const [schemes, setSchemes] = useState<any[]>([])
  const [selected, setSelected] = useState('')
  const [income, setIncome] = useState('500000')
  const [seats, setSeats] = useState('100')
  const [result, setResult] = useState<any>(null)

  useEffect(()=>{ api.get('/schemes').then(r=>{setSchemes(r.data.items); if(r.data.items.length) setSelected(r.data.items[0].id)}) },[])

  const simulate = async ()=>{
    const res = await api.post(`/admin/scheme-simulator/${selected}`, {income_limit: parseInt(income), seats: parseInt(seats)})
    setResult(res.data)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Scheme Simulator</h1>
      <p className="text-sm text-gray-600">Admin changes config → see how synthetic applications would be evaluated. Clearly marked as simulation.</p>
      <Card className="p-6 mt-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="text-sm font-medium">Scheme</label><select value={selected} onChange={e=>setSelected(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm">{schemes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="text-sm font-medium">Income limit</label><input value={income} onChange={e=>setIncome(e.target.value)} type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
          <div><label className="text-sm font-medium">Seats</label><input value={seats} onChange={e=>setSeats(e.target.value)} type="number" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
        </div>
        <button onClick={simulate} className="mt-4 px-5 py-2 bg-primary-600 text-white rounded-lg text-sm">Simulate</button>
      </Card>
      {result && (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card className="p-6">
            <h3 className="font-semibold">Before</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between border rounded-lg px-3 py-2"><span>Eligible</span><b>{result.before.eligible}</b></div>
              <div className="flex justify-between border rounded-lg px-3 py-2"><span>Deficient</span><b>{result.before.deficient}</b></div>
              <div className="flex justify-between border rounded-lg px-3 py-2"><span>Ineligible</span><b>{result.before.ineligible}</b></div>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold">After config change</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between border rounded-lg px-3 py-2 bg-green-50"><span>Eligible</span><b>{result.after.eligible}</b></div>
              <div className="flex justify-between border rounded-lg px-3 py-2"><span>Deficient</span><b>{result.after.deficient}</b></div>
              <div className="flex justify-between border rounded-lg px-3 py-2"><span>Ineligible</span><b>{result.after.ineligible}</b></div>
            </div>
            <div className="text-xs text-gray-500 mt-3">{result.note}</div>
          </Card>
        </div>
      )}
    </div>
  )
}
