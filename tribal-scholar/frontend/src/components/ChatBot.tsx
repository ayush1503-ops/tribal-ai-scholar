import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Sparkles, Languages, HelpCircle } from 'lucide-react'
import api from '../services/api'

type Msg = { id: string, role: 'user'|'bot', text: string, schemes?: any[], suggestions?: string[], advisory?: any, evidence?: string[], lang?: string, ts: number }

const QUICK_EN = ["Show schemes","Compare schemes","Am I eligible? ST PhD ₹2.4L","Try photo scan","Which documents?","Check status","How to appeal?","What is deadline?"]
const QUICK_HI = ["योजनाएँ दिखाएँ","तुलना करें","क्या मैं ST PhD ₹2.4L पर पात्र हूँ?","फोटो स्कैन","कौन से दस्तावेज़?","आवेदन स्थिति","अपील कैसे करें?","अंतिम तिथि?"]

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    const init: Msg = {
      id: 'welcome',
      role: 'bot',
      text: "Namaste! I am TribalScholar Sahayak v2 — accurate (88% synthetic, 15 intents), Hinglish + typo tolerant, contextual. I can: show & compare schemes, check potential-match eligibility (share income/category/course), guide documents + photo-scan (fake check), track status, explain timeline, help with appeals & payment. Final decisions by officers. Try: “schems avilable?” or “फोटो स्कैन जाली?” — I understand typos. How can I help?",
      suggestions: QUICK_EN,
      lang: 'en',
      ts: Date.now()
    }
    return [init]
  })
  const [input, setInput] = useState('')
  const [lang, setLang] = useState<'en'|'hi'>('en')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(()=>{ listRef.current?.scrollTo(0, listRef.current.scrollHeight) }, [msgs, open])

  const send = async (text?: string) => {
    const msgText = (text ?? input).trim()
    if (!msgText || loading) return
    const userMsg: Msg = { id: String(Date.now()), role: 'user', text: msgText, ts: Date.now() }
    setMsgs(m=>[...m, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = msgs.slice(-6).map(m=>({role:m.role, content:m.text}))
      const res = await api.post('/chatbot/chat', { message: msgText, history, lang })
      const data = res.data
      const botMsg: Msg = {
        id: String(Date.now()+1),
        role: 'bot',
        text: data.answer,
        schemes: data.schemes,
        suggestions: data.suggestions,
        advisory: data.advisory,
        evidence: data.evidence,
        lang: data.lang,
        ts: Date.now()
      }
      setMsgs(m=>[...m, botMsg])
      if (data.lang && data.lang !== lang) {
        // keep user lang but don't auto switch; just note
      }
    } catch(e:any){
      const fallback: Msg = {
        id: String(Date.now()+2),
        role: 'bot',
        text: lang==='hi'
          ? "माफ़ करें, संपर्क में समस्या है। कृपया दोबारा कोशिश करें। हेल्पडेस्क: 1800-123-4567"
          : "Sorry, I could not connect. Please try again. Helpdesk: 1800-123-4567 — I am advisory only, officers decide finally.",
        suggestions: lang==='hi'? QUICK_HI: QUICK_EN,
        ts: Date.now()
      }
      setMsgs(m=>[...m, fallback])
    } finally { setLoading(false)}
  }

  const toggleLang = () => {
    const nl = lang==='en' ? 'hi' : 'en'
    setLang(nl)
    // push a short bot message in new language
    const msg: Msg = {
      id: String(Date.now()),
      role: 'bot',
      text: nl==='hi' ? "भाषा हिंदी में बदल दी गई है। पूछें: योजनाएँ दिखाएँ, पात्रता जाँचें, दस्तावेज़?" : "Language switched to English. Try: Show schemes, check eligibility, documents?",
      suggestions: nl==='hi' ? QUICK_HI : QUICK_EN,
      lang: nl,
      ts: Date.now()
    }
    setMsgs(m=>[...m, msg])
  }

  return (
    <>
      {/* Floating button - skill: 56px, teal #073B4C, shadow */}
      <button
        onClick={()=>setOpen(v=>!v)}
        aria-label={open ? "Close Sahayak chatbot" : "Open Sahayak chatbot"}
        className="fixed bottom-6 right-4 sm:right-6 z-50 w-[56px] h-[56px] rounded-full bg-[#073B4C] text-white shadow-[0_4px_16px_rgba(7,59,76,.24)] flex items-center justify-center hover:bg-[#0F6B78] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#155EEF] border-2 border-white"
        style={{ minWidth:56, minHeight:56 }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#0E8A9A] rounded-full border-2 border-white"></span>}
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-[84px] right-2 sm:right-6 z-50 w-[calc(100vw-16px)] sm:w-[380px] h-[520px] max-h-[72vh] bg-white border border-[#D7E0E5] rounded-[12px] shadow-[0_8px_24px_rgba(15,35,45,.12)] flex flex-col overflow-hidden">
          {/* Header - teal calm */}
          <div className="bg-[#073B4C] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 flex items-center justify-center"><Bot className="w-4 h-4" /></div>
              <div>
                <div className="text-sm font-semibold leading-none flex items-center gap-1.5">Sahayak v2 <span className="text-[10px] font-normal bg-white/15 px-1.5 py-0.5 rounded">88% • Advisory</span></div>
                <div className="text-[11px] text-white/80">15 intents • Hinglish • Photo scan • Synthetic</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleLang} aria-label="Toggle language" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 flex items-center justify-center" title={lang==='en'?'Switch to हिंदी':'Switch to English'}>
                <Languages className="w-4 h-4" />
              </button>
              <button onClick={()=>setOpen(false)} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Notice */}
          <div className="bg-[#E6F6F8] border-b border-[#bee9ec] px-3 py-2 flex gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#0F6B78] mt-0.5 shrink-0" />
            <p className="text-[11px] leading-[1.4] text-[#0F6B78]">Prototype assistant — gives information and <b>potential match</b> only. Final eligibility and selection are decided by officers after verification. Not a legal decision.</p>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-[#F6F9FA]">
            {msgs.map(m=>(
              <div key={m.id} className={`flex gap-2 ${m.role==='user'?'justify-end':'justify-start'}`}>
                {m.role==='bot' && <div className="w-7 h-7 rounded-full bg-[#E6F6F8] border border-[#bee9ec] flex items-center justify-center shrink-0 mt-0.5"><Bot className="w-3.5 h-3.5 text-[#073B4C]" /></div>}
                <div className={`max-w-[80%] rounded-[10px] px-3 py-2 text-sm leading-[1.5] shadow-sm border ${m.role==='user' ? 'bg-[#073B4C] text-white border-[#073B4C] rounded-br-sm' : 'bg-white text-[#172B35] border-[#D7E0E5] rounded-bl-sm'}`}>
                  <div className="whitespace-pre-wrap text-[13px]">{m.text}</div>

                  {m.schemes && m.schemes.length>0 && (
                    <div className="mt-2 space-y-1.5">
                      {m.schemes.map((s:any)=>(
                        <a key={s.id} href={`/schemes/${s.id}`} className="block border border-[#D7E0E5] rounded-md bg-[#F6F9FA] px-2.5 py-2 hover:bg-white">
                          <div className="text-xs font-semibold text-[#073B4C] leading-tight">{s.name}</div>
                          <div className="text-[11px] text-[#52616B] line-clamp-2">{s.description}</div>
                          <div className="text-[11px] text-[#0F6B78] mt-1">₹{Number(s.income_limit).toLocaleString('en-IN')} • {s.target_category} • View →</div>
                        </a>
                      ))}
                    </div>
                  )}

                  {m.advisory && (
                    <div className="mt-2 bg-[#F0ECF8] border border-[#ddd6fe] rounded-md px-2.5 py-2">
                      <div className="text-xs font-semibold text-[#5B3F91] flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Potential-match advisory</div>
                      <div className="text-xs text-[#5B3F91] mt-1">{m.advisory.label} • confidence {m.advisory.confidence}% • p={m.advisory.probability}</div>
                      <div className="text-[11px] text-[#5B3F91] mt-1">{(m.advisory.reasons||[]).join(' • ')}</div>
                      <div className="text-[10px] text-[#5B3F91]/80 mt-1">{m.advisory.disclaimer}</div>
                    </div>
                  )}

                  {m.evidence && m.evidence.length>0 && (
                    <div className="mt-1.5 text-[10px] text-[#52616B] bg-[#F6F9FA] border border-dashed border-[#D7E0E5] rounded px-2 py-1">
                      Evidence: {m.evidence.join(' • ')}
                    </div>
                  )}

                  {m.suggestions && m.suggestions.length>0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.suggestions.map(s=>(
                        <button key={s} onClick={()=>send(s)} className="text-xs px-2.5 py-1.5 bg-white border border-[#D7E0E5] rounded-full text-[#073B4C] hover:bg-[#E6F6F8] hover:border-[#0E8A9A]"> {s} </button>
                      ))}
                    </div>
                  )}

                  <div className={`text-[10px] mt-1 ${m.role==='user'?'text-white/60':'text-[#52616B]'}`}>{new Date(m.ts).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}{m.lang?` • ${m.lang}`:''}</div>
                </div>
                {m.role==='user' && <div className="w-7 h-7 rounded-full bg-[#073B4C] flex items-center justify-center shrink-0 mt-0.5"><User className="w-3.5 h-3.5 text-white" /></div>}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-[#E6F6F8] border border-[#bee9ec] flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-[#073B4C]" /></div>
                <div className="bg-white border border-[#D7E0E5] rounded-md px-3 py-2 text-xs text-[#52616B]">Sahayak is thinking… <span className="inline-block w-1 h-1 bg-[#0E8A9A] rounded-full animate-bounce ml-1"></span></div>
              </div>
            )}
          </div>

          {/* Input - 44px target */}
          <div className="p-2 bg-white border-t border-[#D7E0E5] flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() }}}
                placeholder={lang==='hi' ? "संदेश लिखें… जैसे: ST PhD पात्रता?" : "Type a message… e.g. Am I eligible for ST PhD?"}
                className="w-full border border-[#D7E0E5] rounded-full pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-[#073B4C] focus:ring-1 focus:ring-[#073B4C] bg-[#F6F9FA] focus:bg-white"
                aria-label="Message to Sahayak"
              />
              <span className="absolute right-3 top-2.5 text-[10px] text-[#52616B] hidden sm:block">{input.length}/300</span>
            </div>
            <button
              onClick={()=>send()}
              disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-full bg-[#073B4C] text-white flex items-center justify-center hover:bg-[#0F6B78] disabled:opacity-40 disabled:cursor-not-allowed shrink-0 focus-visible:ring-2 focus-visible:ring-[#155EEF]"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="px-3 pb-2 text-[10px] text-center text-[#52616B] bg-white">Press Enter to send • Sahayak is advisory, human officer decides • <a href="/about" className="underline">Learn how it works</a></div>
        </div>
      )}
    </>
  )
}
