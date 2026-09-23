import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Card, StatusBadge } from '../components/Layout'
import { Search, Filter, Calendar } from 'lucide-react'

export default function Schemes() {
  const [schemes, setSchemes] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [level, setLevel] = useState('')
  const [loading, setLoading] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await api.get('/schemes', {params: {search: search || undefined, category: category || undefined, education_level: level || undefined, page_size: 20}})
      setSchemes(res.data.items)
      setTotal(res.data.total)
    } finally { setLoading(false)}
  }
  useEffect(()=>{ fetch() },[])

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#073B4C]">Find a scheme</h1>
          <p className="text-sm text-[#52616B] mt-1">Search and filter schemes that match your profile. Eligibility is decided after you apply and an officer verifies your documents.</p>
        </div>
        <div className="text-xs text-[#52616B] bg-white border border-[#D7E0E5] px-3 py-1.5 rounded-sm">{total} schemes available</div>
      </div>

      <Card className="p-4 mt-5">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#52616B]" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search scheme name..." className="pl-9 w-full border border-[#D7E0E5] rounded-sm px-3 py-2 text-sm focus:border-[#073B4C] focus:outline-none" />
          </div>
          <select value={category} onChange={e=>setCategory(e.target.value)} className="border border-[#D7E0E5] rounded-sm px-3 py-2 text-sm bg-white focus:border-[#073B4C] focus:outline-none">
            <option value="">All categories</option>
            <option value="ST">ST</option>
            <option value="SC">SC</option>
            <option value="OBC">OBC</option>
          </select>
          <select value={level} onChange={e=>setLevel(e.target.value)} className="border border-[#D7E0E5] rounded-sm px-3 py-2 text-sm bg-white focus:border-[#073B4C] focus:outline-none">
            <option value="">All education levels</option>
            <option value="PhD">PhD</option>
            <option value="Post-Matric">Post-Matric</option>
            <option value="Masters">Masters</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <button onClick={fetch} className="px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium hover:bg-[#0F6B78] min-h-[44px]">Search</button>
          <button onClick={()=>{setSearch('');setCategory('');setLevel(''); setTimeout(fetch,100)}} className="px-4 py-2 border border-[#D7E0E5] bg-white rounded-sm text-sm min-h-[44px]">Clear</button>
          <span className="ml-auto flex items-center gap-1 text-xs text-[#52616B]"><Filter className="w-4 h-4" /> Filters: state, course, category, deadline</span>
        </div>
        <div className="text-xs text-[#52616B] mt-3 bg-[#F6F9FA] border border-[#D7E0E5] rounded-sm px-3 py-2">We show <b>potential match</b> only — based on your profile. Final eligibility is confirmed after verification. <Link to="/about" className="underline text-[#0F6B78]">How we determine a match</Link></div>
      </Card>

      {loading ? <div className="text-center py-12 text-[#52616B] text-sm">Loading schemes...</div> : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {schemes.map(s=>(
            <Card key={s.id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-[#073B4C] leading-tight text-sm">{s.name}</h3>
                <StatusBadge status={s.status} />
              </div>
              <p className="text-sm text-[#52616B] mt-2 line-clamp-3">{s.description}</p>
              <div className="mt-3 space-y-1 text-xs text-[#172B35]">
                <div>Category: <b className="font-medium">{s.target_category}</b> • Level: {s.education_level}</div>
                <div>Income limit: <b className="font-medium">₹{s.income_limit?.toLocaleString('en-IN') || 'Not specified'}</b> • Seats: {s.seats}</div>
                <div className="flex items-center gap-1 text-[#52616B]"><Calendar className="w-3.5 h-3.5" /> Deadline: {s.end_date ? new Date(s.end_date).toLocaleDateString() : 'Open'} </div>
              </div>
              <div className="mt-3">
                <div className="text-xs font-medium text-[#172B35]">Documents needed:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {s.documents.map((d:any)=>(
                    <span key={d.document_key} className="text-[11px] bg-[#F6F9FA] border border-[#D7E0E5] px-2 py-1 rounded-sm">{d.document_name}{d.required?' • Required':''}</span>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#F6F9FA] flex gap-2">
                <Link to={`/schemes/${s.id}`} className="flex-1 text-center px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium hover:bg-[#0F6B78] min-h-[44px] flex items-center justify-center">View details</Link>
                <span className="text-xs text-[#52616B] self-center">We will check eligibility after you apply</span>
              </div>
            </Card>
          ))}
        </div>
      )}
      {schemes.length===0 && !loading && <div className="mt-8 border border-dashed border-[#D7E0E5] rounded-md bg-[#F6F9FA] p-8 text-center text-sm text-[#52616B]">No schemes match your filters. Try clearing filters or searching a different term. <br/>Need help? Call 1800-123-4567</div>}
    </div>
  )
}
