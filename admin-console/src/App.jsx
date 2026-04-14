import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './index.css'

const API = 'http://localhost:8000'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('tl_token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!localStorage.getItem('tl_token'))

  useEffect(() => {
    if (token) fetchUser(token)
    else setLoading(false)
  }, [token])

  const fetchUser = async (t) => {
    try {
      const res = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      if (res.ok) { setUser(await res.json()); setLoading(false) }
      else logout()
    } catch { logout() }
  }

  const login = (t) => { localStorage.setItem('tl_token', t); setToken(t) }
  const logout = () => { localStorage.removeItem('tl_token'); setToken(''); setUser(null); setLoading(false) }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:32, height:32, border:'2px solid var(--accent)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!token || !user) return <Login onLogin={login} API={API} />
  return <Dashboard user={user} token={token} onLogout={logout} API={API} />
}
