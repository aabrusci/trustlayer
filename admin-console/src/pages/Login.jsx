import { useState } from 'react'

export default function Login({ onLogin, API }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail); setLoading(false); return }
      onLogin(data.access_token)
    } catch { setError('Errore di connessione'); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0f' }}>
      <div style={{ width:400, background:'rgba(255,255,255,0.03)', border:'0.5px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'2rem' }}>
        <div style={{ fontSize:22, fontWeight:500, color:'#fff', marginBottom:8 }}>
          Trust<span style={{ color:'#6c63ff' }}>Layer</span>
        </div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', marginBottom:'1.5rem' }}>Admin Console</div>
        {error && <div style={{ fontSize:12, color:'#f87171', marginBottom:12, padding:'8px 12px', background:'rgba(248,113,113,0.08)', borderRadius:6 }}>{error}</div>}
        <label style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Email</label>
        <input
          type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="andrea@trustlayer.eu"
          style={{ display:'block', width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:8, color:'#fff', fontSize:13, marginTop:4, marginBottom:12 }}
        />
        <label style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>Password</label>
        <input
          type="password" value={password} onChange={e=>setPassword(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&handleLogin()}
          placeholder="••••••••"
          style={{ display:'block', width:'100%', padding:'9px 12px', background:'rgba(255,255,255,0.05)', border:'0.5px solid rgba(255,255,255,0.12)', borderRadius:8, color:'#fff', fontSize:13, marginTop:4, marginBottom:20 }}
        />
        <button
          onClick={handleLogin} disabled={loading}
          style={{ width:'100%', padding:'10px', background:'#6c63ff', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:500, cursor:'pointer', opacity:loading?0.7:1 }}
        >
          {loading ? 'Accesso...' : 'Accedi'}
        </button>
      </div>
    </div>
  )
}
