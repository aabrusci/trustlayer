import { useState, useEffect } from 'react'
import { Webhook, Plus, Trash2, Play, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

const AVAILABLE_EVENTS = [
  'login', 'logout', 'login_failed', 'register',
  'user_blocked', 'user_unblocked', 'mfa_enabled',
  'mfa_disabled', 'invitation_sent', 'invitation_accepted',
  'session_revoked', 'password_reset'
]

export default function Webhooks({ token, API }) {
  const [webhooks, setWebhooks] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [newWebhook, setNewWebhook] = useState({ name:'', url:'', events:['login','logout'] })
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState(null)
  const [testResult, setTestResult] = useState({})
  const [expanded, setExpanded] = useState(null)
  const [deliveries, setDeliveries] = useState({})
  const [error, setError] = useState('')
  const [newSecret, setNewSecret] = useState(null)

  const h = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }

  const loadWebhooks = async () => {
    const res = await fetch(`${API}/webhooks/`, { headers: h })
    if (res.ok) setWebhooks(await res.json())
  }

  useEffect(() => { loadWebhooks() }, [])

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url || !newWebhook.events.length) {
      setError('Compila tutti i campi e seleziona almeno un evento')
      return
    }
    setCreating(true)
    setError('')
    const res = await fetch(`${API}/webhooks/`, {
      method:'POST', headers: h,
      body: JSON.stringify(newWebhook)
    })
    const data = await res.json()
    if (res.ok) {
      setNewSecret(data.secret)
      setShowNew(false)
      setNewWebhook({ name:'', url:'', events:['login','logout'] })
      loadWebhooks()
    } else {
      setError(data.detail)
    }
    setCreating(false)
  }

  const deleteWebhook = async (id) => {
    await fetch(`${API}/webhooks/${id}`, { method:'DELETE', headers: h })
    setWebhooks(webhooks.filter(w => w.id !== id))
  }

  const testWebhook = async (id) => {
    setTesting(id)
    const res = await fetch(`${API}/webhooks/${id}/test`, { method:'POST', headers: h })
    const data = await res.json()
    setTestResult({ ...testResult, [id]: data })
    setTesting(null)
  }

  const loadDeliveries = async (id) => {
    if (expanded === id) { setExpanded(null); return }
    const res = await fetch(`${API}/webhooks/${id}/deliveries`, { headers: h })
    if (res.ok) setDeliveries({ ...deliveries, [id]: await res.json() })
    setExpanded(id)
  }

  const toggleEvent = (event) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }))
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.75rem' }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Webhook</h1>
          <p style={{ fontSize:13, color:'var(--text2)' }}>Notifiche HTTP per eventi TrustLayer</p>
        </div>
        <button onClick={()=>{ setShowNew(!showNew); setError(''); setNewSecret(null) }}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
          <Plus size={14}/> Nuovo webhook
        </button>
      </div>

      {newSecret && (
        <div style={{ padding:'1rem', background:'rgba(52,211,153,0.06)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:10, marginBottom:14 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--green)', marginBottom:8 }}>✓ Webhook creato — salva il secret adesso</div>
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:6 }}>Questo secret non verrà mostrato di nuovo. Usalo per verificare la firma HMAC-SHA256 delle richieste.</div>
          <code style={{ fontSize:12, color:'var(--accent2)', background:'rgba(124,106,255,0.08)', padding:'8px 12px', borderRadius:6, display:'block', wordBreak:'break-all' }}>{newSecret}</code>
          <button onClick={()=>setNewSecret(null)} style={{ marginTop:8, fontSize:11, color:'var(--text3)', background:'none', border:'none', cursor:'pointer' }}>Chiudi</button>
        </div>
      )}

      {showNew && (
        <div style={{ background:'var(--bg1)', border:'1px solid rgba(124,106,255,0.25)', borderRadius:14, padding:'1.25rem', marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:'1rem' }}>Nuovo webhook</div>
          {error && <div style={{ fontSize:12, color:'var(--red)', marginBottom:10, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:6 }}>{error}</div>}
          <input value={newWebhook.name} onChange={e=>setNewWebhook({...newWebhook,name:e.target.value})}
            placeholder="Nome (es. Slack notifiche)"
            style={{ width:'100%', padding:'9px 14px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none', marginBottom:8, fontFamily:'DM Sans,sans-serif' }}/>
          <input value={newWebhook.url} onChange={e=>setNewWebhook({...newWebhook,url:e.target.value})}
            placeholder="https://tuoserver.com/webhook"
            style={{ width:'100%', padding:'9px 14px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none', marginBottom:'1rem', fontFamily:'DM Sans,sans-serif' }}/>
          <div style={{ fontSize:12, fontWeight:500, color:'var(--text2)', marginBottom:8 }}>Eventi da notificare:</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:'1rem' }}>
            {AVAILABLE_EVENTS.map(event => (
              <div key={event} onClick={()=>toggleEvent(event)}
                style={{ fontSize:11, fontWeight:500, padding:'4px 12px', borderRadius:20, cursor:'pointer', transition:'all 0.15s',
                  background: newWebhook.events.includes(event) ? 'rgba(124,106,255,0.15)' : 'var(--bg2)',
                  border: `1px solid ${newWebhook.events.includes(event) ? 'rgba(124,106,255,0.3)' : 'var(--border2)'}`,
                  color: newWebhook.events.includes(event) ? 'var(--accent2)' : 'var(--text3)'
                }}>
                {event}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={createWebhook} disabled={creating}
              style={{ padding:'8px 18px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              {creating ? 'Creazione...' : 'Crea webhook'}
            </button>
            <button onClick={()=>setShowNew(false)}
              style={{ padding:'8px 18px', background:'transparent', color:'var(--text2)', border:'1px solid var(--border2)', borderRadius:8, fontSize:13, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              Annulla
            </button>
          </div>
        </div>
      )}

      <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem' }}>
        {webhooks.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--text3)' }}>
            <div style={{ fontSize:32, marginBottom:'1rem', opacity:0.3 }}>🔗</div>
            <div style={{ fontSize:14, marginBottom:4 }}>Nessun webhook configurato</div>
            <div style={{ fontSize:12 }}>Crea un webhook per ricevere notifiche sugli eventi</div>
          </div>
        ) : webhooks.map(webhook => (
          <div key={webhook.id} style={{ borderBottom:'1px solid var(--border)', paddingBottom:'1rem', marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:8, background:'rgba(124,106,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:16 }}>🔗</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>{webhook.name}</div>
                <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{webhook.url}</div>
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', maxWidth:300 }}>
                {webhook.events.slice(0,3).map(e => (
                  <span key={e} style={{ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:10, background:'rgba(124,106,255,0.1)', color:'var(--accent2)' }}>{e}</span>
                ))}
                {webhook.events.length > 3 && <span style={{ fontSize:10, color:'var(--text3)' }}>+{webhook.events.length-3}</span>}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={()=>testWebhook(webhook.id)} disabled={testing===webhook.id}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:6, color:'var(--blue)', fontSize:11, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                  <Play size={11}/> {testing===webhook.id?'...':'Test'}
                </button>
                <button onClick={()=>loadDeliveries(webhook.id)}
                  style={{ display:'flex', alignItems:'center', gap:4, padding:'6px 12px', background:'transparent', border:'1px solid var(--border2)', borderRadius:6, color:'var(--text2)', fontSize:11, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                  {expanded===webhook.id ? <ChevronUp size={11}/> : <ChevronDown size={11}/>} Log
                </button>
                <button onClick={()=>deleteWebhook(webhook.id)}
                  style={{ padding:'6px 8px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:6, color:'var(--red)', cursor:'pointer' }}>
                  <Trash2 size={11}/>
                </button>
              </div>
            </div>
            {testResult[webhook.id] && (
              <div style={{ marginTop:8, padding:'8px 12px', background: testResult[webhook.id].success ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)', border:`1px solid ${testResult[webhook.id].success ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`, borderRadius:6, fontSize:12, color: testResult[webhook.id].success ? 'var(--green)' : 'var(--red)' }}>
                {testResult[webhook.id].success ? '✓ Test riuscito' : '✗ Test fallito'} — Status: {testResult[webhook.id].status_code || 'nessuna risposta'}
              </div>
            )}
            {expanded===webhook.id && deliveries[webhook.id] && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--text3)', marginBottom:6, letterSpacing:'0.05em' }}>ULTIME CONSEGNE</div>
                {deliveries[webhook.id].length === 0 ? (
                  <div style={{ fontSize:12, color:'var(--text3)' }}>Nessuna consegna ancora</div>
                ) : deliveries[webhook.id].map(d => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                    {d.success ? <Check size={12} color="var(--green)"/> : <X size={12} color="var(--red)"/>}
                    <span style={{ color:'var(--accent2)', fontWeight:500 }}>{d.event}</span>
                    <span style={{ color:'var(--text3)' }}>HTTP {d.response_status || '—'}</span>
                    <span style={{ color:'var(--text3)', marginLeft:'auto' }}>{new Date(d.created_at).toLocaleString('it-IT')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
