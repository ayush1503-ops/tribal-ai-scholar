import React, { useEffect, useState } from 'react'
import api from '../../services/api'
import { Card } from '../../components/Layout'
import { Plus, Trash2, Eye, Copy, Save } from 'lucide-react'

type Tab = 'basic'|'eligibility'|'fields'|'documents'|'merit'|'workflow'|'preview'

export default function SchemeConfigurator() {
  const [schemes, setSchemes] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('basic')
  const [form, setForm] = useState<any>({})
  const [fields, setFields] = useState<any[]>([])
  const [docs, setDocs] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [weights, setWeights] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async ()=>{
    const res = await api.get('/schemes?page_size=20')
    setSchemes(res.data.items)
    if (!selected && res.data.items.length) handleSelect(res.data.items[0])
  }
  useEffect(()=>{ load() },[])

  const handleSelect = async (s:any)=>{
    const res = await api.get(`/schemes/${s.id}`)
    const data = res.data
    setSelected(data)
    setForm({name: data.name, description: data.description, department: data.department, education_level: data.education_level, target_category: data.target_category, income_limit: data.income_limit, age_min: data.age_min, age_max: data.age_max, seats: data.seats, start_date: data.start_date?.slice(0,10), end_date: data.end_date?.slice(0,10), status: data.status})
    setFields(data.fields)
    setDocs(data.documents)
    setRules(data.rules)
    setWeights(data.score_weights)
  }

  const save = async ()=>{
    try{
      const payload:any = {
        name: form.name,
        description: form.description,
        department: form.department,
        education_level: form.education_level,
        target_category: form.target_category,
        income_limit: form.income_limit ? parseInt(form.income_limit) : undefined,
        age_min: form.age_min ? parseInt(form.age_min) : undefined,
        age_max: form.age_max ? parseInt(form.age_max) : undefined,
        seats: form.seats ? parseInt(form.seats) : 100,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
        status: form.status,
        fields: fields.map((f,i)=>({field_key:f.field_key, label:f.label, field_type:f.field_type, placeholder:f.placeholder, required:f.required, options:f.options, help_text:f.help_text, order_index:i})),
        documents: docs.map((d,i)=>({document_key:d.document_key, document_name:d.document_name, required:d.required, allowed_file_types:d.allowed_file_types, max_size_mb:d.max_size_mb, order_index:i})),
        rules: rules.map((r,i)=>({field_key:r.field_key, operator:r.operator, value:r.value, action:r.action, message:r.message, order_index:i})),
        score_weights: weights
      }
      // Check weight total
      const total = weights.reduce((a,b)=>a+b.weight,0)
      if(total!==100){ setMsg(`Weights must total 100, got ${total}`); return }
      if(creating){
        const res = await api.post('/admin/schemes', payload)
        setMsg('Scheme created')
        setCreating(false)
        load()
        handleSelect(res.data)
      } else if(selected){
        const res = await api.put(`/admin/schemes/${selected.id}`, payload)
        setMsg('Scheme updated — applicant form will auto-reflect')
        handleSelect(res.data)
      }
    } catch(e:any){ setMsg(e.response?.data?.detail || 'Save failed')}
  }

  const duplicate = async ()=>{
    if(!selected) return
    const res = await api.post(`/admin/schemes/${selected.id}/duplicate`)
    setMsg('Duplicated')
    load()
  }

  const publish = async ()=>{
    if(!selected) return
    await api.post(`/admin/schemes/${selected.id}/publish`)
    setMsg('Published & active')
    load()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Scheme Configurator — No-Code</h1>
        <div className="flex gap-2">
          <button onClick={()=>{ setCreating(true); setSelected(null); setForm({name:'New Scheme', target_category:'ST', education_level:'PhD', seats:100}); setFields([{field_key:'full_name', label:'Full Name', field_type:'text', required:true}]); setDocs([{document_key:'st_certificate', document_name:'ST Certificate', required:true}]); setWeights([{component:'academic', weight:40},{component:'research', weight:25},{component:'institution', weight:15},{component:'socio_economic', weight:10},{component:'interview', weight:10}]); setRules([])}} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4"/> New Scheme</button>
        </div>
      </div>
      {msg && <div className="mt-4 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">{msg}</div>}

      <div className="grid lg:grid-cols-4 gap-6 mt-6">
        {/* List */}
        <Card className="p-4 h-fit">
          <h3 className="font-semibold text-sm">Schemes</h3>
          <div className="mt-3 space-y-2 max-h-[70vh] overflow-y-auto">
            {schemes.map(s=>(
              <div key={s.id} onClick={()=>{setCreating(false); handleSelect(s)}} className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 ${selected?.id===s.id?'bg-primary-50 border-primary-200':''}`}>
                <div className="font-medium text-sm leading-tight">{s.name}</div>
                <div className="text-xs text-gray-500">{s.target_category} • {s.education_level} • {s.status}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Editor */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <div className="flex flex-wrap gap-1 border-b pb-3">
              {[
                ['basic','Basic Information'],
                ['eligibility','Eligibility'],
                ['fields','Dynamic Fields'],
                ['documents','Documents'],
                ['merit','Merit'],
                ['workflow','Workflow'],
                ['preview','Preview'],
              ].map(([k,label])=>(
                <button key={k} onClick={()=>setTab(k as Tab)} className={`px-3 py-1.5 rounded-full text-xs font-medium border ${tab===k?'bg-primary-600 text-white border-primary-600':'bg-white hover:bg-gray-50'}`}>{label}</button>
              ))}
            </div>

            {tab==='basic' && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Scheme name</label>
                  <input value={form.name||''} onChange={e=>setForm({...form, name:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea value={form.description||''} onChange={e=>setForm({...form, description:e.target.value})} rows={3} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div><label className="text-sm font-medium">Department</label><input value={form.department||''} onChange={e=>setForm({...form, department:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">Education level</label><input value={form.education_level||''} onChange={e=>setForm({...form, education_level:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" placeholder="PhD, Post-Matric" /></div>
                <div><label className="text-sm font-medium">Target category</label><input value={form.target_category||''} onChange={e=>setForm({...form, target_category:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">Seats</label><input type="number" value={form.seats||''} onChange={e=>setForm({...form, seats:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">Start date</label><input type="date" value={form.start_date||''} onChange={e=>setForm({...form, start_date:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">End date</label><input type="date" value={form.end_date||''} onChange={e=>setForm({...form, end_date:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="text-sm font-medium">Income limit</label><input type="number" value={form.income_limit||''} onChange={e=>setForm({...form, income_limit:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div className="flex gap-3"><div className="flex-1"><label className="text-sm font-medium">Age min</label><input type="number" value={form.age_min||''} onChange={e=>setForm({...form, age_min:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div><div className="flex-1"><label className="text-sm font-medium">Age max</label><input type="number" value={form.age_max||''} onChange={e=>setForm({...form, age_max:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div></div>
              </div>
            )}

            {tab==='eligibility' && (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-gray-600">Configure income, category, age, course rules. Deterministic — AI not used for final eligibility.</div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div><label className="text-sm font-medium">Category (target_category)</label><input value={form.target_category||''} onChange={e=>setForm({...form, target_category:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                  <div><label className="text-sm font-medium">Income limit</label><input type="number" value={form.income_limit||''} onChange={e=>setForm({...form, income_limit:e.target.value})} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm" /></div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mt-4">Rule Builder (visual)</h4>
                  <div className="space-y-2 mt-2">
                    {rules.map((r,i)=>(
                      <div key={i} className="border rounded-lg p-3 grid md:grid-cols-5 gap-2">
                        <input value={r.field_key} onChange={e=>{ const nr=[...rules]; nr[i].field_key=e.target.value; setRules(nr)}} placeholder="FIELD: Annual Income" className="border rounded-lg px-2 py-1.5 text-sm" />
                        <select value={r.operator} onChange={e=>{ const nr=[...rules]; nr[i].operator=e.target.value; setRules(nr)}} className="border rounded-lg px-2 py-1.5 text-sm">
                          <option value="=">=</option><option value="!=">!=</option><option value="<=">{'<='}</option><option value=">=">{'>='}</option><option value="in">in</option><option value="missing">missing</option>
                        </select>
                        <input value={r.value} onChange={e=>{ const nr=[...rules]; nr[i].value=e.target.value; setRules(nr)}} placeholder="Value: 500000 / ST" className="border rounded-lg px-2 py-1.5 text-sm" />
                        <select value={r.action} onChange={e=>{ const nr=[...rules]; nr[i].action=e.target.value; setRules(nr)}} className="border rounded-lg px-2 py-1.5 text-sm">
                          <option value="fail">Fail</option><option value="deficiency">Deficiency</option><option value="manual_review">Manual Review</option><option value="eligible">Eligible</option>
                        </select>
                        <button onClick={()=>setRules(rules.filter((_,idx)=>idx!==i))} className="text-red-600 border rounded-lg px-2 py-1.5 text-sm flex items-center justify-center gap-1"><Trash2 className="w-4 h-4"/> Remove</button>
                      </div>
                    ))}
                    <button onClick={()=>setRules([...rules, {field_key:'annual_family_income', operator:'<=', value:'500000', action:'fail', message:'Income check'}])} className="px-3 py-1.5 border rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4"/> Add Rule</button>
                  </div>
                  <div className="mt-3 p-3 bg-gray-50 border rounded-lg text-xs">
                    Example: <code>FIELD: Category OPERATOR: = VALUE: ST ACTION: Eligible</code> — stored as JSON, evaluated safely (no code execution).
                  </div>
                </div>
              </div>
            )}

            {tab==='fields' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Dynamic Fields (applicant form auto-generates)</div>
                  <button onClick={()=>setFields([...fields, {field_key:`field_${fields.length+1}`, label:'New Field', field_type:'text', required:false, help_text:''}])} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4"/> Add Field</button>
                </div>
                {fields.map((f,i)=>(
                  <div key={i} className="border rounded-xl p-4">
                    <div className="grid md:grid-cols-3 gap-3">
                      <div><label className="text-xs font-medium">key</label><input value={f.field_key} onChange={e=>{const nf=[...fields]; nf[i].field_key=e.target.value; setFields(nf)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                      <div><label className="text-xs font-medium">label</label><input value={f.label} onChange={e=>{const nf=[...fields]; nf[i].label=e.target.value; setFields(nf)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                      <div><label className="text-xs font-medium">type</label>
                        <select value={f.field_type} onChange={e=>{const nf=[...fields]; nf[i].field_type=e.target.value; setFields(nf)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm">
                          <option value="text">text</option><option value="textarea">textarea</option><option value="number">number</option><option value="date">date</option><option value="dropdown">dropdown</option><option value="radio">radio</option><option value="checkbox">checkbox</option><option value="file">file</option><option value="email">email</option><option value="phone">phone</option>
                        </select>
                      </div>
                      <div><label className="text-xs font-medium">placeholder</label><input value={f.placeholder||''} onChange={e=>{const nf=[...fields]; nf[i].placeholder=e.target.value; setFields(nf)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                      <div><label className="text-xs font-medium">options (comma)</label><input value={(f.options||[]).join(',')} onChange={e=>{const nf=[...fields]; nf[i].options=e.target.value?e.target.value.split(',').map(s=>s.trim()):[]; setFields(nf)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="opt1, opt2" /></div>
                      <div className="flex items-end gap-2">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.required} onChange={e=>{const nf=[...fields]; nf[i].required=e.target.checked; setFields(nf)}} /> Required</label>
                        <button onClick={()=>setFields(fields.filter((_,idx)=>idx!==i))} className="ml-auto px-3 py-1.5 border rounded-lg text-xs flex items-center gap-1"><Trash2 className="w-4 h-4"/> Remove</button>
                      </div>
                      <div className="md:col-span-3"><label className="text-xs font-medium">help text</label><input value={f.help_text||''} onChange={e=>{const nf=[...fields]; nf[i].help_text=e.target.value; setFields(nf)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-500">Frontend renders: text→input, number→number, select→dropdown, date→picker, file→upload — based on field_type.</div>
              </div>
            )}

            {tab==='documents' && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between"><div className="text-sm font-medium">Document Configuration</div><button onClick={()=>setDocs([...docs, {document_key:`doc_${docs.length+1}`, document_name:'New Document', required:true, allowed_file_types:['pdf','jpg','jpeg','png'], max_size_mb:5}])} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-1"><Plus className="w-4 h-4"/> Add Doc</button></div>
                {docs.map((d,i)=>(
                  <div key={i} className="border rounded-xl p-4 grid md:grid-cols-3 gap-3">
                    <div><label className="text-xs font-medium">document key</label><input value={d.document_key} onChange={e=>{const nd=[...docs]; nd[i].document_key=e.target.value; setDocs(nd)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                    <div><label className="text-xs font-medium">document name</label><input value={d.document_name} onChange={e=>{const nd=[...docs]; nd[i].document_name=e.target.value; setDocs(nd)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                    <div className="flex items-end gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!d.required} onChange={e=>{const nd=[...docs]; nd[i].required=e.target.checked; setDocs(nd)}} /> Required</label><button onClick={()=>setDocs(docs.filter((_,idx)=>idx!==i))} className="ml-auto px-3 py-1.5 border rounded-lg text-xs flex items-center gap-1"><Trash2 className="w-4 h-4"/> Remove</button></div>
                    <div><label className="text-xs font-medium">allowed types</label><input value={(d.allowed_file_types||[]).join(',')} onChange={e=>{const nd=[...docs]; nd[i].allowed_file_types=e.target.value.split(',').map(s=>s.trim()); setDocs(nd)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                    <div><label className="text-xs font-medium">max size MB</label><input type="number" value={d.max_size_mb} onChange={e=>{const nd=[...docs]; nd[i].max_size_mb=parseInt(e.target.value); setDocs(nd)}} className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm" /></div>
                  </div>
                ))}
              </div>
            )}

            {tab==='merit' && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold">Merit Score Weights — Total must =100</h4>
                <div className="space-y-2 mt-3">
                  {weights.map((w,i)=>(
                    <div key={i} className="border rounded-lg p-3 flex items-center gap-3">
                      <input value={w.component} onChange={e=>{const nw=[...weights]; nw[i].component=e.target.value; setWeights(nw)}} className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
                      <input type="number" value={w.weight} onChange={e=>{const nw=[...weights]; nw[i].weight=parseInt(e.target.value)||0; setWeights(nw)}} className="w-24 border rounded-lg px-2 py-1.5 text-sm" />
                      <span className="text-sm">/100</span>
                      <button onClick={()=>setWeights(weights.filter((_,idx)=>idx!==i))} className="px-2 py-1 border rounded-lg text-xs"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  ))}
                  <button onClick={()=>setWeights([...weights, {component:'new_component', weight:10}])} className="px-3 py-1.5 border rounded-lg text-sm">Add Component</button>
                  <div className={`p-3 rounded-lg text-sm border ${weights.reduce((a,b)=>a+b.weight,0)===100?'bg-green-50 border-green-200 text-green-700':'bg-red-50 border-red-200 text-red-700'}`}>Total: {weights.reduce((a,b)=>a+b.weight,0)} / 100 {weights.reduce((a,b)=>a+b.weight,0)===100 ? '✓' : '✗ must equal 100'}</div>
                </div>
              </div>
            )}

            {tab==='workflow' && (
              <div className="mt-4 text-sm">
                <h4 className="font-semibold">Workflow States & Transitions</h4>
                <div className="mt-2 bg-gray-50 border rounded-lg p-4 font-mono text-xs leading-relaxed">
                  DRAFT → SUBMITTED → AUTOMATED_CHECK → INSTITUTE_VERIFICATION → OFFICER_SCRUTINY → COMMITTEE_REVIEW → SELECTED / WAITLISTED / REJECTED → SANCTIONED → PAYMENT_RELEASED → FELLOWSHIP_MONITORING<br/>
                  Each transition validates: current state, user role, required info, reason, audit.
                </div>
                <div className="mt-3 text-xs text-gray-500">Workflow editor stores from_state, to_state, allowed_roles, require_reason — in workflow_transitions table. Visual editor in full system.</div>
              </div>
            )}

            {tab==='preview' && (
              <div className="mt-4">
                <h4 className="font-semibold">Preview — How applicant sees form</h4>
                <div className="mt-3 border rounded-xl p-4 bg-gray-50">
                  <div className="grid md:grid-cols-2 gap-3">
                    {fields.map((f:any)=>(
                      <div key={f.field_key} className={f.field_type==='textarea'?'md:col-span-2':''}>
                        <label className="text-sm font-medium">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                        {f.field_type==='text' && <input placeholder={f.placeholder} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white" />}
                        {f.field_type==='number' && <input type="number" placeholder={f.placeholder} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white" />}
                        {f.field_type==='dropdown' && <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"><option>Select</option>{(f.options||[]).map((o:string)=><option key={o}>{o}</option>)}</select>}
                        {f.field_type==='date' && <input type="date" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white" />}
                        {f.field_type==='textarea' && <textarea placeholder={f.placeholder} rows={2} className="mt-1 w-full border rounded-lg px-3 py-2 text-sm bg-white"></textarea>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <div className="text-sm font-medium">Documents to upload</div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {docs.map((d:any)=><span key={d.document_key} className="text-xs bg-white border px-2.5 py-1 rounded-full">{d.document_name}{d.required?' *':''}</span>)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-gray-500">This preview reflects current configurator state. Save to make it live for applicants.</div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-6">
              <button onClick={save} className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"><Save className="w-4 h-4"/> Save Scheme</button>
              {!creating && selected && <>
                <button onClick={duplicate} className="px-4 py-2 border rounded-lg text-sm flex items-center gap-1"><Copy className="w-4 h-4"/> Duplicate</button>
                <button onClick={publish} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"><Eye className="w-4 h-4"/> Publish</button>
              </>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
