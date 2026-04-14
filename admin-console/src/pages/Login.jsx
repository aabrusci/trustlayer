import { useState } from 'react'
import { Shield, ArrowRight, Lock, Mail } from 'lucide-react'

export default function Login({ onLogin, API }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Inserisci email e password'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Credenziali non valide'); setLoading(false); return }
      onLogin(data.access_token)
    } catch { setError('Errore di connessione al server'); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', background:'var(--bg)', overflow:'hidden', position:'relative' }}>
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
        .input-field { width:100%; padding:12px 16px 12px 44px; background:var(--bg2); border:1px solid var(--border2); border-radius:10px; color:var(--text); font-size:14px; outline:none; transition:all 0.2s; }
        .input-field:focus { border-color:var(--accent); background:var(--bg3); box-shadow:0 0 0 3px var(--accent-glow); }
        .login-btn { width:100%; padding:13px; background:var(--accent); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s; font-family:'DM Sans',sans-serif; }
        .login-btn:hover { background:#6b59ee; transform:translateY(-1px); box-shadow:0 8px 24px rgba(124,106,255,0.35); }
        .login-btn:active { transform:translateY(0); }
        .login-btn:disabled { opacity:0.6; cursor:not-allowed; transform:none; box-shadow:none; }
      `}</style>

      <div className="orb" style={{ width:500, height:500, background:'rgba(124,106,255,0.12)', top:-100, left:-100, animation:'float 8s ease-in-out infinite' }}/>
      <div className="orb" style={{ width:300, height:300, background:'rgba(99,179,237,0.08)', bottom:100, right:200, animation:'float 10s ease-in-out infinite 2s' }}/>
      <div className="orb" style={{ width:200, height:200, background:'rgba(196,181,253,0.06)', top:'40%', right:'10%', animation:'pulse 6s ease-in-out infinite' }}/>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', maxWidth:420, animation:'slideUp 0.5s ease forwards' }}>

          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'2.5rem' }}>
            <div style={{ width:36, height:36, background:'linear-gradient(135deg,#7c6aff,#a594ff)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Shield size={18} color="#fff" strokeWidth={2.5}/>
            </div>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, color:'var(--text)' }}>Trust<span style={{color:'var(--accent2)'}}>Layer</span></span>
          </div>

          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:700, color:'var(--text)', marginBottom:8, lineHeight:1.2 }}>Bentornato</h1>
          <p style={{ color:'var(--text2)', fontSize:14, marginBottom:'2rem', lineHeight:1.6 }}>Accedi alla tua admin console</p>

          {error && (
            <div style={{ padding:'10px 14px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, color:'#f87171', fontSize:13, marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:8 }}>
              <span style={{fontSize:16}}>⚠</span> {error}
            </div>
          )}

          <div style={{ marginBottom:'1rem', position:'relative' }}>
            <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:6, letterSpacing:'0.03em' }}>EMAIL</label>
            <div style={{ position:'relative' }}>
              <Mail size={16} color="var(--text3)" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
              <input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="andrea@trustlayer.eu" onFocus={()=>setFocused('email')} onBlur={()=>setFocused('')} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
            </div>
          </div>

          <div style={{ marginBottom:'1.75rem', position:'relative' }}>
            <label style={{ fontSize:12, fontWeight:500, color:'var(--text2)', display:'block', marginBottom:6, letterSpacing:'0.03em' }}>PASSWORD</label>
            <div style={{ position:'relative' }}>
              <Lock size={16} color="var(--text3)" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
              <input className="input-field" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" onFocus={()=>setFocused('password')} onBlur={()=>setFocused('')} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
            </div>
          </div>

          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/> Accesso in corso...</> : <><span>Accedi</span><ArrowRight size={16}/></>}
          </button>

          <div style={{ marginTop:'1.5rem', padding:'1rem', background:'var(--bg1)', borderRadius:10, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, fontWeight:500, letterSpacing:'0.05em' }}>INFRASTRUTTURA</div>
            <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
              {['AWS Frankfurt','GDPR Compliant','ISO 27001'].map(t=>(
                <div key={t} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text2)' }}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'var(--green)'}}/>
                  {t}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div style={{ width:480, background:'var(--bg1)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', justifyContent:'center', padding:'3rem', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, bottom:0, backgroundImage:'radial-gradient(circle at 30% 50%, rgba(124,106,255,0.08) 0%, transparent 60%)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--accent)', letterSpacing:'0.1em', marginBottom:'1rem' }}>PERCHÉ TRUSTLAYER</div>
          {[
            { icon:'🔐', title:'SSO Enterprise', desc:'SAML 2.0 e OIDC. Un solo login per tutte le app aziendali.' },
            { icon:'🛡️', title:'MFA Avanzato', desc:'TOTP, WebAuthn, passkey. Sicurezza a più livelli.' },
            { icon:'🇪🇺', title:'EU-First', desc:'Dati sempre in Europa. GDPR e NIS2 nativi.' },
            { icon:'💶', title:'Canone fisso', desc:'Nessun costo per utente. Prezzi prevedibili.' },
          ].map(({icon,title,desc})=>(
            <div key={title} style={{ display:'flex', gap:14, marginBottom:'1.5rem' }}>
              <div style={{ width:38, height:38, background:'var(--bg2)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0, border:'1px solid var(--border)' }}>{icon}</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
