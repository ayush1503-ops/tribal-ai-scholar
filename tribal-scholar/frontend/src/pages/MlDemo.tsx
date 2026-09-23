import React, { useState } from 'react'
import api from '../services/api'
import { Card } from '../components/Layout'
import { Brain, FileText, ShieldCheck, MessageCircle, Scale, Beaker, ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function MlDemo(){
  const [elig, setElig] = useState<any>(null)
  const [docRes, setDocRes] = useState<any>(null)
  const [verif, setVerif] = useState<any>(null)
  const [fair, setFair] = useState<any>(null)
  const [chatDemo, setChatDemo] = useState<any>(null)
  const [models, setModels] = useState<any>(null)

  const runElig = async ()=>{
    const res = await api.post('/ml/eligibility', {income:240000,income_limit:500000,category:'ST',target_category:'ST',course:'PhD',allowed_courses:['PhD','MPhil'],marks:78})
    setElig(res.data)
  }
  const runDoc = async ()=>{
    const res = await api.post('/ml/document-classify', {text:"Scheduled Tribe Certificate Government of Jharkhand issued by District Collector certificate number ST number validity", filename:"st_certificate.pdf"})
    setDocRes(res.data)
  }
  const runVerif = async ()=>{
    const res = await api.post('/ml/verification-priority', {quality_count:1, quality_penalty:15, duplicate_score:0.72, mismatch:0.68, low_confidence_fields:1, missing_docs:0})
    setVerif(res.data)
  }
  const runFair = async ()=>{
    const res = await api.post('/ml/fairness-audit', {})
    setFair(res.data)
  }
  const runChat = async ()=>{
    const res = await api.post('/chatbot/chat', {message:"Am I eligible for ST PhD with income 2.4 lakh?", lang:"en"})
    setChatDemo(res.data)
  }
  const loadModels = async ()=>{
    const res = await api.get('/ml/models')
    setModels(res.data)
  }

  React.useEffect(()=>{ loadModels()},[])

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-[#073B4C] text-white flex items-center justify-center"><Brain className="w-5 h-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-[#073B4C]">ML models & Sahayak chatbot — full project</h1>
          <p className="text-sm text-[#52616B]">6 advisory models + bilingual chatbot + photo forensic • Synthetic training data • Human-in-loop • Not auto-decision</p>
        </div>
        <span className="ml-auto text-xs bg-[#E6F6F8] border border-[#bee9ec] text-[#0F6B78] px-2 py-1 rounded">Advisory only</span>
      </div>

      {models && (
        <Card className="p-4 mt-4 bg-[#F6F9FA]">
          <div className="text-xs font-semibold tracking-wide text-[#073B4C] flex items-center gap-2"><Beaker className="w-4 h-4" /> Registered models</div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
            {models.models.map((m:any)=>(
              <div key={m.name} className="bg-white border border-[#D7E0E5] rounded-md p-2.5">
                <div className="text-xs font-semibold text-[#073B4C]">{m.name}</div>
                <div className="text-[11px] text-[#52616B] mt-0.5">{m.version}</div>
                <div className="text-[11px] text-[#52616B]">{m.type}</div>
                {m.intents && <div className="text-[11px] text-[#52616B]">{m.intents} intents</div>}
              </div>
            ))}
          </div>
          <div className="text-[11px] text-[#52616B] mt-2">{models.note}</div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#073B4C]"><ShieldCheck className="w-4 h-4 text-[#0F6B78]" /> Eligibility potential-match (ML)</div>
          <p className="text-xs text-[#52616B] mt-1">LogisticRegression on synthetic data — predicts potential match, deterministic engine remains source of truth.</p>
          <button onClick={runElig} className="mt-3 px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium min-h-[44px]">Run demo — ST PhD ₹2.4L</button>
          {elig && (
            <div className="mt-3 bg-[#F6F9FA] border border-[#D7E0E5] rounded-md p-3 text-xs">
              <div className="font-semibold text-[#073B4C]">{elig.label} • p={elig.probability} • confidence {elig.confidence}%</div>
              <div className="text-[#52616B] mt-1">{elig.reasons.join(' • ')}</div>
              <div className="text-[11px] text-[#52616B] mt-1">{elig.disclaimer}</div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#073B4C]"><FileText className="w-4 h-4 text-[#0F6B78]" /> Document classifier (TF-IDF + LogReg)</div>
          <p className="text-xs text-[#52616B] mt-1">Classifies OCR text into st_certificate / income_certificate / marksheet / admission_proof.</p>
          <button onClick={runDoc} className="mt-3 px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium min-h-[44px]">Classify ST certificate text</button>
          {docRes && (
            <div className="mt-3 bg-[#F6F9FA] border border-[#D7E0E5] rounded-md p-3 text-xs">
              <div className="font-semibold text-[#073B4C]">{docRes.predicted} • {docRes.confidence}% {docRes.needs_review? "(needs review)":""}</div>
              <div className="mt-1 flex flex-wrap gap-1">{docRes.top_candidates.map((c:any)=><span key={c.label} className="bg-white border px-2 py-1 rounded-full text-xs">{c.label} {c.score}%</span>)}</div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#073B4C]"><ShieldCheck className="w-4 h-4 text-[#D97706]" /> Verification priority (RandomForest)</div>
          <p className="text-xs text-[#52616B] mt-1">Regression 0-100 → Low/Medium/High. Flags possible duplicate / mismatch for manual review.</p>
          <button onClick={runVerif} className="mt-3 px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium min-h-[44px]">Score — duplicate 0.72 + mismatch</button>
          {verif && (
            <div className="mt-3 border border-[#D7E0E5] rounded-md p-3 text-xs" style={{background: verif.level==='High'? '#FEF3C7':'#F6F9FA'}}>
              <div className="font-semibold" style={{color: verif.level==='High'? '#92400E':'#073B4C'}}>{verif.score}/100 • {verif.level} • {verif.recommendation}</div>
              <div className="mt-2 space-y-1">{verif.reasons.map((r:any,i:number)=><div key={i} className="bg-white border rounded px-2 py-1 flex justify-between"><span>{r.factor}</span><span>{r.detail}</span></div>)}</div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#073B4C]"><MessageCircle className="w-4 h-4 text-[#0F6B78]" /> Sahayak chatbot</div>
          <p className="text-xs text-[#52616B] mt-1">Bilingual en/hi, 9 intents, scheme RAG, eligibility advisory, never legal decision.</p>
          <button onClick={runChat} className="mt-3 px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium min-h-[44px]">Ask: Am I eligible ST PhD 2.4L?</button>
          {chatDemo && (
            <div className="mt-3 bg-white border border-[#D7E0E5] rounded-md p-3 text-xs">
              <div className="text-[#073B4C] font-medium">Intent: {chatDemo.intent} • {chatDemo.confidence}% • lang:{chatDemo.lang}</div>
              <div className="mt-2 bg-[#F6F9FA] border rounded p-2 whitespace-pre-wrap">{chatDemo.answer}</div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#073B4C]"><ScanLine className="w-4 h-4 text-[#B42318]" /> Photo scan — fake detection (forensic)</div>
          <p className="text-xs text-[#52616B] mt-1">OpenCV forensic: ELA, blur map, noise, edges, histogram, EXIF, entropy → 0-85 capped. Never fraud-confirmed.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/photo-scan" className="px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium hover:bg-[#0F6B78] min-h-[44px] inline-flex items-center">Try photo scan →</Link>
            <span className="text-xs text-[#52616B] self-center">Samples: authentic Low, Photoshop Medium, screenshot High</span>
          </div>
          <div className="mt-3 bg-[#F6F9FA] border border-[#D7E0E5] rounded-md p-2.5 text-xs">
            <div className="font-medium text-[#073B4C]">What it checks</div>
            <ul className="list-disc pl-4 text-[#52616B] mt-1 space-y-0.5">
              <li>ELA recompression + hotspot (copy-paste)</li>
              <li>Blur 3×3 Laplacian, noise top vs bottom, Canny edges</li>
              <li>Histogram white peak, EXIF Software (Photoshop), filename, entropy</li>
            </ul>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#073B4C]"><Scale className="w-4 h-4 text-[#0F6B78]" /> Fairness audit</div>
          <p className="text-xs text-[#52616B] mt-1">Computes selection rate gaps across category and state. Flags for human reviewer, not auto block.</p>
          <button onClick={runFair} className="mt-3 px-4 py-2 bg-[#073B4C] text-white rounded-sm text-sm font-medium min-h-[44px]">Run fairness audit</button>
          {fair && (
            <div className="mt-3 grid md:grid-cols-2 gap-3 text-xs">
              <div className="bg-[#F6F9FA] border border-[#D7E0E5] rounded-md p-3">
                <div className="font-semibold text-[#073B4C]">By category</div>
                {Object.entries(fair.by_category).map(([k,v]:any)=><div key={k} className="flex justify-between bg-white border rounded px-2 py-1 mt-1"><span>{k}</span><span>{v.selected}/{v.applied} = {(v.rate*100).toFixed(1)}%</span></div>)}
              </div>
              <div className="bg-[#F6F9FA] border border-[#D7E0E5] rounded-md p-3">
                <div className="font-semibold text-[#073B4C]">By state</div>
                {Object.entries(fair.by_state).map(([k,v]:any)=><div key={k} className="flex justify-between bg-white border rounded px-2 py-1 mt-1"><span>{k}</span><span>{v.selected}/{v.applied} = {(v.rate*100).toFixed(1)}%</span></div>)}
              </div>
              <div className="md:col-span-2 bg-white border rounded p-2">
                {fair.flags.map((f:any,i:number)=><div key={i} className="text-xs"><b>{f.type}</b>: {f.detail}</div>)}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4 mt-6 bg-[#E6F6F8] border-[#bee9ec]">
        <div className="text-sm font-semibold text-[#073B4C]">How to use full project</div>
        <ul className="text-xs text-[#0F6B78] list-disc ml-4 mt-2 space-y-1">
          <li>Chatbot floating bottom-right on every page — try en & hi, uses intent model + scheme retrieval + ML eligibility advisory.</li>
          <li>Photo scan at <code>/photo-scan</code> — upload or try demo samples; also runs automatically on document upload + officer review “Photo scan — fake check”.</li>
          <li>Backend ML: <code>/api/v1/ml/*</code> and <code>/api/v1/chatbot/chat</code> — all synthetic, advisory.</li>
          <li>Run <code>python -m ml.train_all</code> in backend to retrain.</li>
        </ul>
      </Card>
    </div>
  )
}
