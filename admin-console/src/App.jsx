import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import './index.css'

const API = 'http://localhost:8000'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('tl_token') || '')
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (token) fetchUser(token)
  }, [token])

  const fetchUser = async (t) => {
    try {
      const res = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${t}` }
      })
      if (res.ok) setUser(await res.json())
      else logout()
    } catch { logout() }
  }

  const login = (t) => {
    localStorage.setItem('tl_token', t)
    setToken(t)
  }

  const logout = () => {
    localStorage.removeItem('tl_token')
    setToken('')
    setUser(null)
  }

  if (!token || !user) return <Login onLogin={login} API={API} />
  return <Dashboard user={user} token={token} onLogout={logout} API={API} />
}
