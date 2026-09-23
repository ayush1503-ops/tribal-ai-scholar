import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'

export default function Fairness() {
  const [items, setItems] = useState<any[]>([])
  useEffect(()=>{ api.get('/admin/fairness').then(r=>setItems(r.data.items)) },[])
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold">Fairness / Monitoring Dashboard</h1>
      <p className="text-sm text-gray-600">Admin-only aggregate statistics — helps identify operational disparities. Does not auto-label bias.</p>
      <Card className="p-6 mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b"><tr><th className="text-left py-2">District</th><th className="text-right py-2">Total</th><th className="text-right py-2">Deficiency %</th><th className="text-right py-2">Selection %</th></tr></thead>
            <tbody>
              {items.map((r:any)=>(
                <tr key={r.district} className="border-b hover:bg-gray-50"><td className="py-2 font-medium">{r.district}</td><td className="text-right">{r.total_applications}</td><td className="text-right">{r.deficiency_rate}%</td><td className="text-right">{r.selection_rate}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-gray-500 mt-3">Note: shows counts and rates only. No automatic “biased” label — officers investigate causes.</div>
      </Card>
    </div>
  )
}
