import { useState, useEffect } from 'react'

export default function Dashboard({ user, token, onLogout, API }) {
  const [view, setView] = useState('dashboard')
  const [apps, setApps] = useState([])
  const [sub, setSub] = useState(null)
  const [newApp, setNewApp] = useState({ name:'', redirect_uris:'' })
  const [showNewApp, setShowNewApp] = useState(false)

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    fetch(`${API}/applications/`, { headers: h }).then(r=>r.json()).then(setApps).catch(()=>{})
    fetch(`${API}/billing/subscription`, { headers: h }).then(r=>r.json()).then(setSub).catch(()=>{})
  }, [])

  const createApp = async () => {
    const res = await fetch(`${API}/applications/`, { method:'POST', headers: h, body: JSON.stringify({...newApp, scopes:'openid profile email'}) })
    if (res.ok) {
      const app = await res.json()
      setApps([...apps, app])
      setShowNewApp(false)
      setNewApp({ name:'', redirect_uris:'' })
    }
  }

  const startCheckout = async (plan) => {
    const res = await fetch(`${API}/billing/checkout`, { method:'POST', headers: h, body: JSON.stringify({ plan, billing_cycle:'monthly' }) })
    const data = await res.json()
    if (data.checkout_url) window.open(data.checkout_url, '_blank')
  }

  const s = {
    container: { display:'flex', minHeight:'100vh' },
    sidebar: { width:220, background:'#0f0f18', borderRight:'0.5px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', padding:'1.25rem 0' },
    logo: { padding:'0 1.25rem 1.25rem', borderBottom:'0.5px solid rgba(255,255,255,0.06)', marginBottom:'1rem' },
    nav: (active) => ({ padding:'0.5rem 1.25rem', fontSize:13, cursor:'pointer', color: active?'#fff':'rgba(255,255,255,0.4)', borderLeft: active?'2px solid #6c63ff':'2px solid transparent', background: active?'rgba(108,99,255,0.1)':'transparent' }),
    main: { flex:1, padding:'1.5rem 2rem' },
    pageTitle: { fontSize:18, fontWeight:500, color:'#fff', marginBottom:4 },
    pageSub: { fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:'1.75rem' },
    grid4: { display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:10, marginBottom:'1.5rem' },
    statCard: { background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'1rem' },
    statLbl: { fontSize:11, color:'rgba(255,255,255,0.35)', marginBottom:6 },
    statVal: { fontSize:20, fontWeight:500, color:'#fff' },
    panel: { background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'1.25rem', marginBottom:12 },
    panelHdr: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' },
    panelTitle: { fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
    th: { textAlign:'left', padding:'0.4rem 0.75rem', fontSize:11, color:'rgba(255,255,255,0.3)', borderBottom:'0.5px solid rgba(255,255,255,0.06)' },
    td: { padding:'0.6rem 0.75rem', color:'rgba(255,255,255,0.65)', borderBottom:'0.5px solid rgba(255,255,255,0.04)' },
    btnPrimary: { fontSize:12, padding:'6px 14px', borderRadius:6, background:'#6c63ff', color:'#fff', border:'none', cursor:'pointer', fontWeight:500 },
    btnGhost: { fontSize:12, padding:'6px 14px', borderRadius:6, background:'transparent', color:'rgba(255,255,255,0.5)', border:'0.5px solid rgba(255,255,255,0.12)', cursor:'pointer' },
    input: { display:'block', width:'100%', padding:'8px 12px', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:8, color:'#fff', fontSize:13, marginBottom:10 },
    badge: (c) => ({ fontSize:10, fontWeight:500, padding:'2px 8px', borderRadius:10, background:`rgba(${c},0.1)`, color:`rgb(${c})` }),
    pricingGrid: { display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:12 },
    pricingCard: (featured) => ({ border: featured?'2px solid #6c63ff':'0.5px solid rgba(255,255,255,0.08)', borderRadius:12, padding:'1.25rem', background: featured?'rgba(108,99,255,0.06)':'rgba(255,255,255,0.03)' }),
  }

  const planFeatures = {
    starter: ['SSO OIDC + SAML', 'MFA TOTP', 'Social login', '5 app connesse', 'GDPR EU'],
    business: ['Tutto Starter +', 'WebAuthn', 'SCIM', 'App illimitate', 'NIS2 report'],
    enterprise: ['Tutto Business +', 'Multi-tenant', 'White-label', 'SLA 99.99%', 'On-premise'],
  }

  return (
    <div style={s.container}>
      <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={{ fontSize:16, fontWeight:500, color:'#fff' }}>Trust<span style={{color:'#6c63ff'}}>Layer</span></div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:3 }}>{user.email}</div>
        </div>
        <div style={s.nav(view==='dashboard')} onClick={()=>setView('dashboard')}>Dashboard</div>
        <div style={s.nav(view==='apps')} onClick={()=>setView('apps')}>Applicazioni</div>
        <div style={s.nav(view==='billing')} onClick={()=>setView('billing')}>Billing</div>
        <div style={s.nav(view==='security')} onClick={()=>setView('security')}>Sicurezza</div>
        <div style={{ marginTop:'auto', padding:'1rem 1.25rem', borderTop:'0.5px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>{user.full_name}</div>
          <div style={{ fontSize:11, color:'#6c63ff', cursor:'pointer' }} onClick={onLogout}>Esci</div>
        </div>
      </div>

      <div style={s.main}>
        {view === 'dashboard' && <>
          <div style={s.pageTitle}>Dashboard</div>
          <div style={s.pageSub}>Benvenuto in TrustLayer</div>
          <div style={s.grid4}>
            <div style={s.statCard}><div style={s.statLbl}>Piano</div><div style={s.statVal}>{sub?.plan||'—'}</div></div>
            <div style={s.statCard}><div style={s.statLbl}>Stato</div><div style={s.statVal}>{sub?.status||'—'}</div></div>
            <div style={s.statCard}><div style={s.statLbl}>App connesse</div><div style={s.statVal}>{apps.length}</div></div>
            <div style={s.statCard}><div style={s.statLbl}>MFA</div><div style={s.statVal}>{user.mfa_enabled?'Attivo':'Off'}</div></div>
          </div>
          <div style={s.panel}>
            <div style={s.panelTitle}>Il tuo account</div>
            <table style={s.table}>
              <tbody>
                <tr><td style={s.td}>Email</td><td style={s.td}>{user.email}</td></tr>
                <tr><td style={s.td}>Nome</td><td style={s.td}>{user.full_name}</td></tr>
                <tr><td style={s.td}>Verificato</td><td style={s.td}><span style={s.badge(user.is_verified?'74,222,128':'248,113,113')}>{user.is_verified?'Sì':'No'}</span></td></tr>
                <tr><td style={s.td}>MFA</td><td style={s.td}><span style={s.badge(user.mfa_enabled?'74,222,128':'248,113,113')}>{user.mfa_enabled?'Attivo':'Disattivo'}</span></td></tr>
              </tbody>
            </table>
          </div>
        </>}

        {view === 'apps' && <>
          <div style={s.pageTitle}>Applicazioni</div>
          <div style={s.pageSub}>Gestisci le app connesse a TrustLayer</div>
          <div style={s.panel}>
            <div style={s.panelHdr}>
              <span style={s.panelTitle}>App registrate</span>
              <button style={s.btnPrimary} onClick={()=>setShowNewApp(!showNewApp)}>+ Nuova app</button>
            </div>
            {showNewApp && <div style={{ marginBottom:'1rem', padding:'1rem', background:'rgba(255,255,255,0.02)', borderRadius:8, border:'0.5px solid rgba(255,255,255,0.06)' }}>
              <input style={s.input} placeholder="Nome app" value={newApp.name} onChange={e=>setNewApp({...newApp,name:e.target.value})}/>
              <input style={s.input} placeholder="Redirect URI (es. https://miaapp.com/callback)" value={newApp.redirect_uris} onChange={e=>setNewApp({...newApp,redirect_uris:e.target.value})}/>
              <div style={{display:'flex',gap:8}}>
                <button style={s.btnPrimary} onClick={createApp}>Crea</button>
                <button style={s.btnGhost} onClick={()=>setShowNewApp(false)}>Annulla</button>
              </div>
            </div>}
            <table style={s.table}>
              <thead><tr><th style={s.th}>Nome</th><th style={s.th}>Client ID</th><th style={s.th}>Redirect URI</th><th style={s.th}>Stato</th></tr></thead>
              <tbody>
                {apps.map(a=>(
                  <tr key={a.id}>
                    <td style={s.td}>{a.name}</td>
                    <td style={{...s.td,fontFamily:'monospace',fontSize:11}}>{a.client_id}</td>
                    <td style={{...s.td,fontSize:11}}>{a.redirect_uris}</td>
                    <td style={s.td}><span style={s.badge('74,222,128')}>Attiva</span></td>
                  </tr>
                ))}
                {apps.length===0&&<tr><td style={s.td} colSpan={4}>Nessuna app — creane una</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {view === 'billing' && <>
          <div style={s.pageTitle}>Billing</div>
          <div style={s.pageSub}>Gestisci il tuo abbonamento</div>
          {sub?.plan && <div style={{...s.panel,marginBottom:'1.5rem'}}>
            <div style={s.panelTitle}>Piano attuale</div>
            <table style={{...s.table,marginTop:'0.75rem'}}>
              <tbody>
                <tr><td style={s.td}>Piano</td><td style={s.td}><span style={s.badge('108,99,255')}>{sub.plan}</span></td></tr>
                <tr><td style={s.td}>Stato</td><td style={s.td}>{sub.status}</td></tr>
                <tr><td style={s.td}>Ciclo</td><td style={s.td}>{sub.billing_cycle}</td></tr>
                <tr><td style={s.td}>Fine trial</td><td style={s.td}>{sub.trial_ends_at?new Date(sub.trial_ends_at).toLocaleDateString('it-IT'):'—'}</td></tr>
              </tbody>
            </table>
          </div>}
          <div style={s.pricingGrid}>
            {[['starter','€299/mese',false],['business','€699/mese',true],['enterprise','€1.499/mese',false]].map(([plan,price,featured])=>(
              <div key={plan} style={s.pricingCard(featured)}>
                {featured&&<div style={{fontSize:10,background:'#6c63ff',color:'#fff',padding:'2px 8px',borderRadius:10,display:'inline-block',marginBottom:8}}>Più scelto</div>}
                <div style={{fontSize:14,fontWeight:500,color:'#fff',marginBottom:4,textTransform:'capitalize'}}>{plan}</div>
                <div style={{fontSize:22,fontWeight:500,color:'#fff',marginBottom:'0.75rem'}}>{price}</div>
                {planFeatures[plan].map(f=><div key={f} style={{fontSize:12,color:'rgba(255,255,255,0.45)',padding:'3px 0'}}>{f}</div>)}
                <button style={{...s.btnPrimary,width:'100%',marginTop:'1rem',background:featured?'#6c63ff':'transparent',border:featured?'none':'0.5px solid rgba(255,255,255,0.15)',color:featured?'#fff':'rgba(255,255,255,0.6)'}} onClick={()=>startCheckout(plan)}>
                  {sub?.plan===plan?'Piano attivo':'Attiva'}
                </button>
              </div>
            ))}
          </div>
        </>}

        {view === 'security' && <>
          <div style={s.pageTitle}>Sicurezza</div>
          <div style={s.pageSub}>Impostazioni di sicurezza del tuo account</div>
          <div style={s.panel}>
            <div style={s.panelTitle}>Multi-Factor Authentication</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:'0.75rem',marginBottom:'1rem'}}>
              {user.mfa_enabled?'MFA abilitato — il tuo account è protetto con Google Authenticator.':'MFA non abilitato — ti consigliamo di abilitarlo per proteggere il tuo account.'}
            </div>
            <span style={s.badge(user.mfa_enabled?'74,222,128':'248,113,113')}>{user.mfa_enabled?'Attivo':'Disattivo'}</span>
          </div>
          <div style={s.panel}>
            <div style={s.panelTitle}>SAML Metadata</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:'0.75rem',marginBottom:'1rem'}}>
              Usa questo URL per configurare TrustLayer come Identity Provider nelle tue app SAML.
            </div>
            <code style={{fontSize:12,color:'#a09aff',background:'rgba(108,99,255,0.1)',padding:'6px 12px',borderRadius:6,display:'block'}}>
              http://localhost:8000/saml/metadata
            </code>
          </div>
          <div style={s.panel}>
            <div style={s.panelTitle}>OIDC Discovery</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginTop:'0.75rem',marginBottom:'1rem'}}>
              Endpoint di configurazione automatica OIDC per le tue app.
            </div>
            <code style={{fontSize:12,color:'#a09aff',background:'rgba(108,99,255,0.1)',padding:'6px 12px',borderRadius:6,display:'block'}}>
              http://localhost:8000/.well-known/openid-configuration
            </code>
          </div>
        </>}
      </div>
    </div>
  )
}
