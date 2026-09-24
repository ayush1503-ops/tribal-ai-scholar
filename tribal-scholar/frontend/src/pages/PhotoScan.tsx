import React, { useState, useRef } from 'react'
import { Card } from '../components/Layout'
import { PhotoScanCard } from '../components/PhotoScanCard'
import { Camera, Upload, Shield, ScanLine, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react'
import api from '../services/api'

export default function PhotoScan(){
  const [file, setFile] = useState<File|null>(null)
  const [preview, setPreview] = useState<string|null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [docHint, setDocHint] = useState('st_certificate')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const onFile = (f: File | null)=>{
    if(!f) return
    if(f.size > 5*1024*1024){ setError('File must be ≤5MB'); return }
    if(!['image/jpeg','image/jpg','image/png','application/pdf'].includes(f.type) && !/\.(jpg|jpeg|png|pdf)$/i.test(f.name)){
      setError('Only JPG/PNG/PDF allowed'); return
    }
    setFile(f); setError(''); setResult(null)
    if(f.type.startsWith('image/')){
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview(null)
    }
  }

  const scan = async ()=>{
    if(!file) return
    setLoading(true); setError('')
    try{
      const fd = new FormData()
      fd.append('file', file)
      if(docHint) fd.append('doc_type_hint', docHint)
      // use ml/photo-scan (no auth needed) for demo; fallback to documents/scan if auth
      const res = await api.post('/ml/photo-scan', fd, { headers: {'Content-Type':'multipart/form-data'}})
      setResult(res.data)
    } catch(e:any){
      // try alternative endpoint with auth
      try{
        const fd2 = new FormData()
        fd2.append('file', file)
        if(docHint) fd2.append('document_key', docHint)
        // try documents/scan (requires auth) — if user logged in
        const res2 = await api.post('/documents/scan', fd2, { headers: {'Content-Type':'multipart/form-data'}})
        setResult(res2.data)
      } catch(e2:any){
        setError(e.response?.data?.detail || e2.response?.data?.detail || 'Scan failed — try a clearer JPG/PNG.')
      }
    } finally{ setLoading(false)}
  }

  const clear = ()=>{ setFile(null); setPreview(null); setResult(null); setError('') }

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-[#073B4C] text-white flex items-center justify-center"><ScanLine className="w-5 h-5" /></div>
        <div>
          <h1 className="text-xl font-semibold text-[#073B4C]">Photo scan — fake document detection</h1>
          <p className="text-sm text-[#52616B] mt-1">Upload a photo or scan of your document. The system checks compression (ELA), blur map, noise, edges, histogram, metadata and entropy — <b>advisory only, no automatic rejection</b>. Officer verifies finally.</p>
          <div className="mt-1 inline-flex items-center gap-2 text-xs">
            <span className="bg-[#DCFCE7] text-[#166534] border border-[#bbf7d0] px-2 py-1 rounded-full font-medium">Low 0-30</span>
            <span className="bg-[#FEF3C7] text-[#92400E] border border-[#fde68a] px-2 py-1 rounded-full font-medium">Medium 30-60</span>
            <span className="bg-[#FEE4E2] text-[#B42318] border border-[#fecaca] px-2 py-1 rounded-full font-medium">High 60-85</span>
            <span className="text-[#52616B]">Cap 85 prevents auto-block</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[420px_1fr] gap-6 mt-6">
        {/* Left: upload */}
        <Card className="p-5 h-fit">
          <div className="text-sm font-semibold text-[#073B4C] flex items-center gap-2"><Shield className="w-4 h-4" /> Scan your document</div>
          <p className="text-xs text-[#52616B] mt-1">Supported: JPG/PNG/PDF ≤5MB. For testing, try a clear scan vs a screenshot/edited image.</p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-[#172B35]">Document type hint (helps classification)</label>
              <select value={docHint} onChange={e=>setDocHint(e.target.value)} className="mt-1 w-full border border-[#D7E0E5] rounded-sm px-2.5 py-2 text-sm bg-white">
                <option value="st_certificate">ST Certificate</option>
                <option value="income_certificate">Income Certificate</option>
                <option value="marksheet">Marksheet</option>
                <option value="admission_proof">Admission Proof</option>
                <option value="id_proof">ID Proof</option>
              </select>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e=>{e.preventDefault()}}
              onDrop={e=>{e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) onFile(f)}}
              className="border-2 border-dashed border-[#D7E0E5] rounded-md bg-[#F6F9FA] p-6 flex flex-col items-center text-center hover:bg-white hover:border-[#0F6B78] cursor-pointer"
              onClick={()=>fileRef.current?.click()}
            >
              <Upload className="w-7 h-7 text-[#0F6B78]" />
              <div className="text-sm font-medium text-[#073B4C] mt-2">Drag and drop or choose file</div>
              <div className="text-xs text-[#52616B]">JPG, PNG, PDF — Max 5MB</div>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/*" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) onFile(f)}} />
              {file && <div className="mt-2 text-xs bg-white border border-[#D7E0E5] rounded-full px-3 py-1">{file.name} • {(file.size/1024).toFixed(0)} KB</div>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={()=>fileRef.current?.click()} className="px-3 py-2.5 border border-[#D7E0E5] bg-white rounded-sm text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#F6F9FA] min-h-[44px]"><ImageIcon className="w-4 h-4" /> Choose photo</button>
              <button onClick={()=>cameraRef.current?.click()} className="px-3 py-2.5 bg-[#073B4C] text-white rounded-sm text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-[#0F6B78] min-h-[44px]"><Camera className="w-4 h-4" /> Use camera</button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>{ const f=e.target.files?.[0]; if(f) onFile(f)}} />
            </div>

            {preview && (
              <div className="border border-[#D7E0E5] rounded-md overflow-hidden bg-white">
                <div className="text-xs font-medium text-[#073B4C] px-2.5 py-1.5 bg-[#F6F9FA] border-b border-[#D7E0E5]">Preview</div>
                <img src={preview} alt="preview" className="w-full max-h-[260px] object-contain bg-white" />
                <div className="text-[11px] text-[#52616B] px-2.5 py-1.5 bg-[#F6F9FA] border-t border-[#D7E0E5]">We never store your photo permanently in this demo scan — officer sees result inline.</div>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={scan} disabled={!file || loading} className="flex-1 h-11 inline-flex items-center justify-center gap-2 bg-[#073B4C] text-white rounded-sm text-sm font-semibold hover:bg-[#0F6B78] disabled:opacity-40"><ScanLine className="w-4 h-4" /> {loading? 'Scanning…':'Scan now — check for fake'}</button>
              <button onClick={clear} className="px-4 h-11 border border-[#D7E0E5] bg-white rounded-sm text-sm">Clear</button>
            </div>

            {error && <div className="text-xs text-[#B42318] bg-[#FEE4E2] border border-[#fecaca] rounded-md px-3 py-2">{error}</div>}

            <div className="bg-[#E6F6F8] border border-[#bee9ec] rounded-md p-2.5 text-xs">
              <div className="font-semibold text-[#073B4C] flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> How we check (advisory)</div>
              <ul className="mt-1 list-disc pl-4 text-[#0F6B78] space-y-0.5">
                <li>ELA — recompress JPEG and compare (detects pasted region / double JPEG)</li>
                <li>Blur map — 3×3 Laplacian variance (spliced region has different blur)</li>
                <li>Noise variance top vs bottom (composite has inconsistent noise)</li>
                <li>Canny edge density, histogram peak, EXIF software, entropy, resolution</li>
              </ul>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="text-xs font-semibold text-[#073B4C]">Try demo samples (no upload needed)</div>
              <div className="grid gap-2 mt-2">
                {[
                  {label:'Authentic — clear scan', file:'/samples/authentic_st_certificate.jpg', name:'authentic_st_certificate.jpg', hint:'st_certificate', expect:'Low 5'},
                  {label:'Edited — Photoshop + pasted', file:'/samples/fake_edited_photoshop.jpg', name:'fake_edited_photoshop.jpg', hint:'st_certificate', expect:'Medium 49'},
                  {label:'Screenshot + low-res', file:'/samples/fake_screenshot_lowres.jpg', name:'screenshot_fake_photoshop_edited.jpg', hint:'st_certificate', expect:'High 60'},
                ].map(s=>(
                  <div key={s.file} className="flex items-center gap-2 border border-[#D7E0E5] rounded-md p-2 bg-white">
                    <img src={s.file} alt={s.label} className="w-16 h-12 object-cover rounded border border-[#D7E0E5]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#073B4C] truncate">{s.label}</div>
                      <div className="text-[11px] text-[#52616B]">Expected: {s.expect} • {s.name}</div>
                    </div>
                    <button
                      onClick={async()=>{
                        setError(''); setLoading(true)
                        try{
                          const r = await fetch(s.file)
                          const blob = await r.blob()
                          const f = new File([blob], s.name, {type: blob.type || 'image/jpeg'})
                          setFile(f)
                          const url = URL.createObjectURL(blob)
                          setPreview(url)
                          const fd = new FormData()
                          fd.append('file', f)
                          fd.append('doc_type_hint', s.hint)
                          const res = await api.post('/ml/photo-scan', fd, {headers:{'Content-Type':'multipart/form-data'}})
                          setResult(res.data)
                        } catch(e:any){ setError('Demo scan failed')}
                        finally{ setLoading(false)}
                      }}
                      className="px-2.5 py-1.5 bg-[#073B4C] text-white rounded-sm text-xs font-medium hover:bg-[#0F6B78]"
                    >Scan</button>
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-[#52616B] mt-1">These samples are synthetic demo images generated for testing. In real use, upload your actual scan.</div>
            </div>
          </div>
        </Card>

        {/* Right: result */}
        <div className="space-y-4">
          {!result && !loading && (
            <Card className="p-8 text-center border-dashed">
              <div className="w-12 h-12 bg-[#F6F9FA] border border-[#D7E0E5] rounded-md flex items-center justify-center mx-auto"><ScanLine className="w-6 h-6 text-[#52616B]" /></div>
              <div className="text-sm font-semibold text-[#073B4C] mt-3">No scan yet</div>
              <div className="text-xs text-[#52616B] mt-1 max-w-md mx-auto">Upload a JPG/PNG and click <b>Scan now</b>. You’ll see a forensic breakdown with score, level, evidence and recommendation — never “fraud confirmed”.</div>
              <div className="mt-4 grid sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-[#F6F9FA] border border-[#D7E0E5] rounded-md p-2.5"><div className="font-semibold text-[#073B4C]">Authentic demo</div><div className="text-[#52616B]">Clear scan, uniform blur/noise, single JPEG, no editor EXIF → Low</div></div>
                <div className="bg-[#FEF3C7]/40 border border-[#fde68a] rounded-md p-2.5"><div className="font-semibold text-[#92400E]">Screenshot demo</div><div className="text-[#52616B]">Upload a screenshot → filename flag + low res → Medium</div></div>
                <div className="bg-[#FEE4E2]/40 border border-[#fecaca] rounded-md p-2.5"><div className="font-semibold text-[#B42318]">Edited demo</div><div className="text-[#52616B]">Image saved via Photoshop + pasted text block → High</div></div>
              </div>
            </Card>
          )}
          {loading && (
            <Card className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-[#E6F6F8] rounded w-1/2"></div>
                <div className="h-3 bg-[#F6F9FA] rounded"></div>
                <div className="h-24 bg-[#F6F9FA] rounded border"></div>
              </div>
              <div className="text-xs text-[#52616B] mt-3">Running forensic checks… ELA, blur map, noise, edges, histogram, EXIF. This is demo heuristic — not legal forensic.</div>
            </Card>
          )}
          {result && (
            <>
              <PhotoScanCard forensic={result.forensic} quality={result.quality} classification={result.classification} summary={result.summary} />
              {/* Also show summary extra */}
              <Card className="p-3 bg-[#F6F9FA]">
                <div className="text-xs font-semibold text-[#073B4C]">What to do next</div>
                <ul className="text-xs text-[#52616B] list-disc pl-4 mt-1.5 space-y-1">
                  <li>If <b>Low</b>: proceed to submit. Officer will do standard verification.</li>
                  <li>If <b>Medium</b>: manual review suggested — try uploading a clearer original scan (not screenshot/photo of screen).</li>
                  <li>If <b>High</b>: additional verification required — officer may ask for original issuer verification. No automatic rejection.</li>
                </ul>
                <div className="mt-2 text-[11px] text-[#52616B]">Want to use this result in your application? Go to <a href="/schemes" className="underline text-[#0F6B78]">Schemes → Apply</a> and upload the same file — scan runs automatically there too.</div>
              </Card>
            </>
          )}
          {result && (
            <Card className="p-3">
              <div className="text-xs font-semibold text-[#073B4C]">Raw response (for developers)</div>
              <pre className="mt-2 bg-[#0B1220] text-[#CBD5E1] text-[11px] p-3 rounded-md overflow-auto max-h-[240px]">{JSON.stringify(result, null, 2)}</pre>
            </Card>
          )}
        </div>
      </div>

      <Card className="p-4 mt-6 bg-[#073B4C] text-white">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-[#E6F6F8]" />
          <div>
            <div className="text-sm font-semibold">Important — advisory only</div>
            <div className="text-xs text-white/80 mt-1">Photo scan detects visual inconsistencies; it cannot prove intent. Final decision is by authorised officer with recorded reason and audit. In production, issuer database and original seal verification would be used. Synthetic demo.</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
