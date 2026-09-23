import React from 'react'
import { ShieldCheck, ShieldAlert, Eye, FileSearch, AlertCircle, CheckCircle, Info } from 'lucide-react'

export function PhotoScanCard({ forensic, quality, classification, summary }: { forensic:any, quality?:any, classification?:any, summary?:any }){
  if(!forensic) return null
  const level = forensic.level as string
  const score = forensic.score as number
  const pct = Math.min(100, (score/85)*100) // 85 cap -> 100%
  const color = level==='Low' ? '#166534' : level==='Medium' ? '#92400E' : '#B42318'
  const bg = level==='Low' ? '#DCFCE7' : level==='Medium' ? '#FEF3C7' : '#FEE4E2'
  const border = level==='Low' ? '#bbf7d0' : level==='Medium' ? '#fde68a' : '#fecaca'
  const icon = level==='Low' ? <ShieldCheck className="w-4 h-4" style={{color}} /> : level==='Medium' ? <Eye className="w-4 h-4" style={{color}} /> : <ShieldAlert className="w-4 h-4" style={{color}} />

  return (
    <div className="border rounded-md bg-white overflow-hidden" style={{borderColor: '#D7E0E5'}}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between" style={{background: level==='Low'? '#F6F9FA' : bg, borderBottom: `1px solid ${border}`}}>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-semibold tracking-wide" style={{color: level==='Low'? '#073B4C': color}}>Photo scan — fake-document check</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full border font-medium bg-white" style={{color, borderColor:border, background: bg}}>{level} • {score}/85</span>
        </div>
        <span className="text-[11px] text-[#52616B]">{forensic.model}</span>
      </div>

      <div className="p-3">
        <div className="text-sm font-medium" style={{color}}>{forensic.verdict}</div>
        <div className="text-xs text-[#52616B] mt-1">{forensic.recommendation} — {forensic.disclaimer.slice(0,120)}</div>

        {/* Gauge */}
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-[#52616B]"><span>Authentic</span><span>Suspicious</span></div>
          <div className="h-2 bg-[#F6F9FA] border border-[#D7E0E5] rounded-full overflow-hidden mt-1">
            <div className="h-full transition-all" style={{width: `${pct}%`, background: color}}></div>
          </div>
          <div className="flex gap-1 mt-1 text-[11px]">
            <span className="flex-1 text-center py-0.5 rounded" style={{background: score<30? bg:'#F6F9FA', color: score<30? color:'#52616B', border:'1px solid #D7E0E5'}}>0-30 Low</span>
            <span className="flex-1 text-center py-0.5 rounded" style={{background: score>=30 && score<60? bg:'#F6F9FA', color: score>=30 && score<60? color:'#52616B', border:'1px solid #D7E0E5'}}>30-60 Med</span>
            <span className="flex-1 text-center py-0.5 rounded" style={{background: score>=60? bg:'#F6F9FA', color: score>=60? color:'#52616B', border:'1px solid #D7E0E5'}}>60-85 High</span>
          </div>
        </div>

        {/* Evidence */}
        {forensic.evidence && forensic.evidence.length>0 && (
          <div className="mt-3 bg-[#F6F9FA] border border-[#D7E0E5] rounded-md p-2.5">
            <div className="text-xs font-semibold text-[#073B4C] flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Evidence (for officer)</div>
            <ul className="mt-1.5 space-y-1 text-xs text-[#172B35] list-disc pl-4">
              {forensic.evidence.map((e:string,i:number)=><li key={i}>{e}</li>)}
            </ul>
            <div className="text-[11px] text-[#52616B] mt-2">This scan checks compression (ELA), blur map, noise variance, edge consistency, histogram, metadata, entropy — advisory only. Officer verifies with issuing authority if needed.</div>
          </div>
        )}

        {/* Factors table */}
        {forensic.factors && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-[#073B4C]">Forensic breakdown</div>
            <div className="mt-1.5 border border-[#D7E0E5] rounded-md overflow-hidden">
              <div className="max-h-[220px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#F6F9FA] text-[11px] text-[#52616B] sticky top-0">
                    <tr><th className="text-left px-2 py-1.5 font-semibold">Check</th><th className="text-left px-2 py-1.5 font-semibold">Detail</th><th className="text-right px-2 py-1.5 font-semibold">Score</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#F6F9FA]">
                    {forensic.factors.map((f:any,i:number)=>(
                      <tr key={i} className={f.status==='fail'? 'bg-[#FEE4E2]/30' : f.status==='warn'? 'bg-[#FEF3C7]/30' : ''}>
                        <td className="px-2 py-1.5">
                          <span className="inline-flex items-center gap-1">
                            {f.status==='pass' ? <CheckCircle className="w-3 h-3 text-[#166534]" /> : f.status==='warn' ? <AlertCircle className="w-3 h-3 text-[#92400E]" /> : <ShieldAlert className="w-3 h-3 text-[#B42318]" />}
                            {f.name}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-[#52616B]">{f.detail}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{f.score}/{f.max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Classification + Quality row */}
        {(classification || quality) && (
          <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
            {classification && (
              <div className="border border-[#D7E0E5] rounded-md p-2 bg-[#F6F9FA]">
                <div className="font-semibold text-[#073B4C] flex items-center gap-1"><FileSearch className="w-3.5 h-3.5" /> Document type</div>
                <div className="mt-1">Predicted <b className="text-[#073B4C]">{classification.predicted}</b> • {classification.confidence}% {classification.needs_review? "• needs review":""}</div>
                <div className="text-[11px] text-[#52616B] mt-1">{classification.disclaimer}</div>
              </div>
            )}
            {quality && (
              <div className="border border-[#D7E0E5] rounded-md p-2 bg-[#F6F9FA]">
                <div className="font-semibold text-[#073B4C]">Quality flags</div>
                {quality.flags?.length ? (
                  <ul className="mt-1 space-y-1">
                    {quality.flags.map((f:any,i:number)=><li key={i} className="flex justify-between"><span>{f.message}</span><span className="font-mono">+{f.score}</span></li>)}
                  </ul>
                ) : <div className="text-[#52616B] mt-1">No quality issues.</div>}
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 text-[11px] text-[#52616B] bg-white border border-[#D7E0E5] rounded-md px-2.5 py-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span><b>Advisory:</b> Scan detects inconsistencies, not proof of fraud. No automatic rejection — officer must verify with issuer. <b>Cap 85/85</b> prevents auto-block.</span>
        </div>
      </div>
    </div>
  )
}
