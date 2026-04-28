import { useState, useEffect } from 'react'
import AuditLog from './AuditLog'
import UserManagement from './UserManagement'
import Invitations from './Invitations'
import Sessions from './Sessions'
import Webhooks from './Webhooks'
import Brand from './Brand'
import { LayoutDashboard, Boxes, CreditCard, Shield, LogOut, Plus, X, ChevronRight, Activity, Users, Zap, Globe, Check, ExternalLink, FileText, Mail, Monitor, Webhook, Palette } from 'lucide-react'

export default function Dashboard({ user, token, onLogout, API }) {
  const [view, setView] = useState('dashboard')
  const [apps, setApps] = useState([])
  const [sub, setSub] = useState(null)
  const [newApp, setNewApp] = useState({ name:'', redirect_uris:'' })
  const [showNewApp, setShowNewApp] = useState(false)
  const [creating, setCreating] = useState(false)

  const h = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }

  useEffect(() => {
    fetch(`${API}/applications/`, {headers:h}).then(r=>r.ok?r.json():[]).then(setApps).catch(()=>{})
    fetch(`${API}/billing/subscription`, {headers:h}).then(r=>r.ok?r.json():null).then(setSub).catch(()=>{})
  }, [])

  const createApp = async () => {
    if (!newApp.name || !newApp.redirect_uris) return
    setCreating(true)
    const res = await fetch(`${API}/applications/`, { method:'POST', headers:h, body:JSON.stringify({...newApp, scopes:'openid profile email'}) })
    if (res.ok) { const app = await res.json(); setApps([...apps, app]); setShowNewApp(false); setNewApp({name:'',redirect_uris:''}) }
    setCreating(false)
  }

  const startCheckout = async (plan) => {
    const res = await fetch(`${API}/billing/checkout`, { method:'POST', headers:h, body:JSON.stringify({plan, billing_cycle:'monthly'}) })
    const data = await res.json()
    if (data.checkout_url) window.open(data.checkout_url, '_blank')
  }

  const navItems = [
    { id:'dashboard', icon:LayoutDashboard, label:'Dashboard' },
    { id:'apps', icon:Boxes, label:'Applicazioni' },
    { id:'billing', icon:CreditCard, label:'Billing' },
    { id:'security', icon:Shield, label:'Sicurezza' },
    { id:'users', icon:Users, label:'Utenti' },
    { id:'invitations', icon:Mail, label:'Inviti' },
    { id:'sessions', icon:Monitor, label:'Sessioni' },
    { id:'webhooks', icon:Webhook, label:'Webhook' },
    { id:'brand', icon:Palette, label:'Brand' },
    { id:'audit', icon:FileText, label:'Audit Log' },
  ]

  const planFeatures = {
    starter: ['SSO OIDC + SAML 2.0','MFA TOTP + Email OTP','Social login','5 app connesse','GDPR EU'],
    business: ['Tutto Starter +','WebAuthn / Passkey','SCIM provisioning','App illimitate','NIS2 report'],
    enterprise: ['Tutto Business +','Multi-tenant B2B','White-label UI','SLA 99.99%','On-premise'],
  }

  const StatusDot = ({ok}) => <div style={{width:7,height:7,borderRadius:'50%',background:ok?'var(--green)':'var(--red)',boxShadow:ok?'0 0 6px var(--green)':'0 0 6px var(--red)'}}/>

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg)'}}>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .nav-item { display:flex;align-items:center;gap:10px;padding:9px 16px;margin:1px 8px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.15s;border:1px solid transparent; }
        .nav-item:hover { background:rgba(124,106,255,0.08);color:var(--text); }
        .nav-item.active { background:rgba(124,106,255,0.12);color:var(--accent2);border-color:rgba(124,106,255,0.2); }
        .stat-card { background:var(--bg1);border:1px solid var(--border);border-radius:14px;padding:1.25rem;transition:all 0.2s;cursor:default; }
        .stat-card:hover { border-color:rgba(124,106,255,0.25);transform:translateY(-2px); }
        .panel { background:var(--bg1);border:1px solid var(--border);border-radius:14px;padding:1.25rem;margin-bottom:14px; }
        .table-row:hover td { background:rgba(255,255,255,0.02); }
        .pricing-card { border:1px solid var(--border);border-radius:14px;padding:1.5rem;transition:all 0.2s; }
        .pricing-card:hover { border-color:rgba(124,106,255,0.3);transform:translateY(-2px); }
        .pricing-card.featured { border-color:var(--accent);background:rgba(124,106,255,0.06); }
        .action-btn { padding:8px 16px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;font-family:'DM Sans',sans-serif; }
        .action-btn.primary { background:var(--accent);color:#fff;border:none; }
        .action-btn.primary:hover { background:#6b59ee;transform:translateY(-1px);box-shadow:0 4px 16px rgba(124,106,255,0.3); }
        .action-btn.ghost { background:transparent;color:var(--text2);border:1px solid var(--border2); }
        .action-btn.ghost:hover { background:var(--bg2);color:var(--text); }
        .input-field { width:100%;padding:10px 14px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-size:13px;outline:none;transition:all 0.2s;margin-bottom:8px; }
        .input-field:focus { border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow); }
        .badge { display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px; }
        .badge.green { background:rgba(52,211,153,0.1);color:var(--green); }
        .badge.amber { background:rgba(251,191,36,0.1);color:var(--amber); }
        .badge.purple { background:rgba(124,106,255,0.12);color:var(--accent2); }
        .badge.red { background:rgba(248,113,113,0.1);color:var(--red); }
        .code-block { font-family:monospace;font-size:12px;color:var(--accent2);background:rgba(124,106,255,0.08);padding:10px 14px;border-radius:8px;border:1px solid rgba(124,106,255,0.15);word-break:break-all; }
      `}</style>

      <div style={{width:230,background:'var(--bg1)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',padding:'1rem 0',position:'sticky',top:0,height:'100vh'}}>
        <div style={{padding:'0.5rem 1.25rem 1.25rem',borderBottom:'1px solid var(--border)',marginBottom:'0.75rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <div style={{width:28,height:28,background:'linear-gradient(135deg,#7c6aff,#a594ff)',borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Shield size={14} color="#fff" strokeWidth={2.5}/>
            </div>
            <span style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700}}>Trust<span style={{color:'var(--accent2)'}}>Layer</span></span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            <StatusDot ok={true}/>
            <span style={{fontSize:11,color:'var(--text3)'}}>Sistema operativo</span>
          </div>
        </div>

        <div style={{flex:1,padding:'0.25rem 0'}}>
          {navItems.map(({id,icon:Icon,label})=>(
            <div key={id} className={`nav-item${view===id?' active':''}`} onClick={()=>setView(id)} style={{color:view===id?'var(--accent2)':'var(--text2)'}}>
              <Icon size={15} strokeWidth={2}/>
              {label}
            </div>
          ))}
        </div>

        <div style={{padding:'1rem',borderTop:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px',borderRadius:8,background:'var(--bg2)',marginBottom:8}}>
            <div style={{width:30,height:30,borderRadius:8,background:'linear-gradient(135deg,#7c6aff22,#a594ff22)',border:'1px solid rgba(124,106,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'var(--accent2)',flexShrink:0}}>
              {(user.full_name||user.email)[0].toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:500,color:'var(--text)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.full_name||'Admin'}</div>
              <div style={{fontSize:10,color:'var(--text3)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user.email}</div>
            </div>
          </div>
          <button onClick={onLogout} className="action-btn ghost" style={{width:'100%',justifyContent:'center',fontSize:12}}>
            <LogOut size={13}/> Esci
          </button>
        </div>
      </div>

      <div style={{flex:1,padding:'1.75rem 2rem',overflowY:'auto',animation:'fadeIn 0.3s ease'}}>

        {view==='dashboard' && <>
          <div style={{marginBottom:'1.75rem'}}>
            <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:4}}>Dashboard</h1>
            <p style={{fontSize:13,color:'var(--text2)'}}>Panoramica del tuo account TrustLayer</p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:12,marginBottom:'1.5rem'}}>
            {[
              {icon:Zap,label:'Piano',value:sub?.plan||'—',color:'var(--accent2)',bg:'rgba(124,106,255,0.08)'},
              {icon:Activity,label:'Stato',value:sub?.status||'—',color:'var(--green)',bg:'rgba(52,211,153,0.08)'},
              {icon:Boxes,label:'App connesse',value:apps.length,color:'var(--blue)',bg:'rgba(96,165,250,0.08)'},
              {icon:Shield,label:'MFA',value:user.mfa_enabled?'Attivo':'Off',color:user.mfa_enabled?'var(--green)':'var(--amber)',bg:user.mfa_enabled?'rgba(52,211,153,0.08)':'rgba(251,191,36,0.08)'},
            ].map(({icon:Icon,label,value,color,bg})=>(
              <div key={label} className="stat-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                  <span style={{fontSize:11,color:'var(--text3)',fontWeight:500,letterSpacing:'0.04em'}}>{label.toUpperCase()}</span>
                  <div style={{width:28,height:28,borderRadius:7,background:bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Icon size={13} color={color} strokeWidth={2.5}/>
                  </div>
                </div>
                <div style={{fontSize:20,fontWeight:700,color,fontFamily:'Syne,sans-serif'}}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <div className="panel">
              <div style={{fontSize:12,fontWeight:600,color:'var(--text2)',letterSpacing:'0.05em',marginBottom:'1rem'}}>DETTAGLI ACCOUNT</div>
              {[
                ['Email',user.email],
                ['Nome',user.full_name||'—'],
                ['Verificato',user.is_verified?'Sì':'No'],
                ['MFA',user.mfa_enabled?'Abilitato':'Disabilitato'],
              ].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--text3)'}}>{k}</span>
                  <span style={{fontSize:12,color:'var(--text)',fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>

            <div className="panel">
              <div style={{fontSize:12,fontWeight:600,color:'var(--text2)',letterSpacing:'0.05em',marginBottom:'1rem'}}>STATO INFRASTRUTTURA</div>
              {[
                ['API Server','Online','green'],
                ['Database','Online','green'],
                ['OIDC Endpoint','Online','green'],
                ['SAML IDP','Online','green'],
                ['Stripe Billing','Online','green'],
              ].map(([name,status,c])=>(
                <div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--text3)'}}>{name}</span>
                  <span className={`badge ${c}`}><StatusDot ok={c==='green'}/>{status}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {view==='apps' && <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.75rem'}}>
            <div>
              <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:4}}>Applicazioni</h1>
              <p style={{fontSize:13,color:'var(--text2)'}}>Gestisci le app connesse tramite OIDC o SAML</p>
            </div>
            <button className="action-btn primary" onClick={()=>setShowNewApp(!showNewApp)}>
              <Plus size={14}/> Nuova app
            </button>
          </div>

          {showNewApp && (
            <div className="panel" style={{marginBottom:'1rem',borderColor:'rgba(124,106,255,0.25)',animation:'slideIn 0.2s ease'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
                <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>Nuova applicazione OIDC</span>
                <button onClick={()=>setShowNewApp(false)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer'}}><X size={16}/></button>
              </div>
              <input className="input-field" placeholder="Nome app (es. Slack, GitHub)" value={newApp.name} onChange={e=>setNewApp({...newApp,name:e.target.value})}/>
              <input className="input-field" placeholder="Redirect URI (es. https://miaapp.com/callback)" value={newApp.redirect_uris} onChange={e=>setNewApp({...newApp,redirect_uris:e.target.value})}/>
              <div style={{display:'flex',gap:8,marginTop:4}}>
                <button className="action-btn primary" onClick={createApp} disabled={creating}>{creating?'Creazione...':'Crea applicazione'}</button>
                <button className="action-btn ghost" onClick={()=>setShowNewApp(false)}>Annulla</button>
              </div>
            </div>
          )}

          <div className="panel">
            {apps.length===0 ? (
              <div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
                <Boxes size={32} style={{margin:'0 auto 1rem',opacity:0.3}}/>
                <div style={{fontSize:14,marginBottom:8}}>Nessuna app connessa</div>
                <div style={{fontSize:12}}>Clicca "Nuova app" per iniziare</div>
              </div>
            ) : (
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead>
                  <tr>{['Nome','Client ID','Redirect URI','Stato'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'0.5rem 0.75rem',fontSize:11,color:'var(--text3)',fontWeight:600,letterSpacing:'0.05em',borderBottom:'1px solid var(--border)'}}>{h.toUpperCase()}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {apps.map(a=>(
                    <tr key={a.id} className="table-row">
                      <td style={{padding:'0.75rem',fontSize:13,color:'var(--text)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>{a.name}</td>
                      <td style={{padding:'0.75rem',borderBottom:'1px solid var(--border)'}}><code style={{fontSize:11,color:'var(--accent2)',background:'rgba(124,106,255,0.08)',padding:'2px 8px',borderRadius:4}}>{a.client_id}</code></td>
                      <td style={{padding:'0.75rem',fontSize:12,color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>{a.redirect_uris}</td>
                      <td style={{padding:'0.75rem',borderBottom:'1px solid var(--border)'}}><span className="badge green"><div style={{width:5,height:5,borderRadius:'50%',background:'var(--green)'}}/>Attiva</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>}

        {view==='billing' && <>
          <div style={{marginBottom:'1.75rem'}}>
            <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:4}}>Billing</h1>
            <p style={{fontSize:13,color:'var(--text2)'}}>Gestisci il tuo abbonamento TrustLayer</p>
          </div>

          {sub?.plan && (
            <div className="panel" style={{marginBottom:'1.5rem',borderColor:'rgba(124,106,255,0.2)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                <span style={{fontSize:12,fontWeight:600,color:'var(--text2)',letterSpacing:'0.05em'}}>PIANO ATTUALE</span>
                <span className="badge purple">{sub.plan}</span>
              </div>
              {[['Stato',sub.status],['Ciclo',sub.billing_cycle],['Fine trial',sub.trial_ends_at?new Date(sub.trial_ends_at).toLocaleDateString('it-IT'):'—']].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderTop:'1px solid var(--border)'}}>
                  <span style={{fontSize:12,color:'var(--text3)'}}>{k}</span>
                  <span style={{fontSize:12,color:'var(--text)',fontWeight:500}}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:14}}>
            {[['starter','€299',false],['business','€699',true],['enterprise','€1.499',false]].map(([plan,price,featured])=>(
              <div key={plan} className={`pricing-card${featured?' featured':''}`}>
                {featured && <div style={{fontSize:10,fontWeight:700,color:'var(--accent)',letterSpacing:'0.08em',marginBottom:10}}>CONSIGLIATO</div>}
                <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:'var(--text)',marginBottom:4,textTransform:'capitalize'}}>{plan}</div>
                <div style={{fontSize:26,fontWeight:800,color:featured?'var(--accent2)':'var(--text)',fontFamily:'Syne,sans-serif',marginBottom:2}}>{price}<span style={{fontSize:13,fontWeight:400,color:'var(--text3)'}}>/mese</span></div>
                <div style={{height:'1px',background:'var(--border)',margin:'1rem 0'}}/>
                {planFeatures[plan].map(f=>(
                  <div key={f} style={{display:'flex',gap:8,alignItems:'center',marginBottom:7}}>
                    <Check size={12} color="var(--green)" strokeWidth={3}/>
                    <span style={{fontSize:12,color:'var(--text2)'}}>{f}</span>
                  </div>
                ))}
                <button className="action-btn primary" style={{width:'100%',justifyContent:'center',marginTop:'1rem',background:featured?'var(--accent)':'transparent',border:featured?'none':'1px solid var(--border2)',color:featured?'#fff':'var(--text2)'}} onClick={()=>startCheckout(plan)}>
                  {sub?.plan===plan?'Piano attivo':'Attiva piano'}
                </button>
              </div>
            ))}
          </div>
        </>}

        {view==='brand' && <Brand token={token} API={API}/> }

        {view==='webhooks' && <Webhooks token={token} API={API}/> }

        {view==='invitations' && <Invitations token={token} API={API}/> }

        {view==='sessions' && <Sessions token={token} API={API}/> }

        {view==='users' && <UserManagement token={token} API={API}/> }

        {view==='audit' && <AuditLog token={token} API={API}/> }

        {view==='security' && <>
          <div style={{marginBottom:'1.75rem'}}>
            <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'var(--text)',marginBottom:4}}>Sicurezza</h1>
            <p style={{fontSize:13,color:'var(--text2)'}}>Configurazione di sicurezza e integrazione IdP</p>
          </div>

          <div className="panel" style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:3}}>Multi-Factor Authentication</div>
                <div style={{fontSize:12,color:'var(--text3)'}}>Proteggi il tuo account con un secondo fattore</div>
              </div>
              <span className={`badge ${user.mfa_enabled?'green':'red'}`}>{user.mfa_enabled?'Attivo':'Disattivo'}</span>
            </div>
            {!user.mfa_enabled && <div style={{padding:'10px 14px',background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:8,fontSize:12,color:'var(--amber)'}}>
              ⚠ MFA non attivo — vai su http://localhost:8000/docs per abilitarlo
            </div>}
          </div>

          <div className="panel" style={{marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:4}}>SAML 2.0 Metadata</div>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:'0.75rem'}}>Usa questo URL per configurare TrustLayer come IDP nelle app SAML</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div className="code-block" style={{flex:1}}>http://localhost:8000/saml/metadata</div>
              <button className="action-btn ghost" onClick={()=>window.open('http://localhost:8000/saml/metadata','_blank')} style={{flexShrink:0}}><ExternalLink size={13}/></button>
            </div>
          </div>

          <div className="panel">
            <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:4}}>OIDC Discovery</div>
            <div style={{fontSize:12,color:'var(--text3)',marginBottom:'0.75rem'}}>Endpoint di configurazione automatica per app OIDC</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <div className="code-block" style={{flex:1}}>http://localhost:8000/.well-known/openid-configuration</div>
              <button className="action-btn ghost" onClick={()=>window.open('http://localhost:8000/.well-known/openid-configuration','_blank')} style={{flexShrink:0}}><ExternalLink size={13}/></button>
            </div>
          </div>
        </>}

      </div>
    </div>
  )
}
