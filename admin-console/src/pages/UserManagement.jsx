import { useState, useEffect } from 'react'
import { Users, Search, Shield, ShieldOff, RotateCcw, ChevronRight, X, Check } from 'lucide-react'

export default function UserManagement({ token, API }) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const loadUsers = async () => {
    setLoading(true)
    try {
      let url = `${API}/admin/users/?page=${page}&limit=50`
      if (search) url += `&search=${search}`
      const res = await fetch(url, { headers: h })
      const data = await res.json()
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }

  const loadDetail = async (userId) => {
    try {
      const res = await fetch(`${API}/admin/users/${userId}`, { headers: h })
      if (res.ok) setDetail(await res.json())
    } catch {}
  }

  useEffect(() => { loadUsers() }, [page, search])

  const blockUser = async (userId) => {
    await fetch(`${API}/admin/users/${userId}/block`, { method:'POST', headers: h })
    loadUsers()
    if (detail?.id === userId) loadDetail(userId)
  }

  const unblockUser = async (userId) => {
    await fetch(`${API}/admin/users/${userId}/unblock`, { method:'POST', headers: h })
    loadUsers()
    if (detail?.id === userId) loadDetail(userId)
  }

  const resetMfa = async (userId) => {
    await fetch(`${API}/admin/users/${userId}/mfa`, { method:'DELETE', headers: h })
    loadUsers()
    if (detail?.id === userId) loadDetail(userId)
  }

  const selectUser = (user) => {
    setSelected(user.id)
    loadDetail(user.id)
  }

  return (
    <div>
      <div style={{ marginBottom:'1.75rem' }}>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Gestione Utenti</h1>
        <p style={{ fontSize:13, color:'var(--text2)' }}>{total} utenti totali</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: detail ? '1fr 360px' : '1fr', gap:14 }}>
        <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem' }}>
          <div style={{ display:'flex', gap:10, marginBottom:'1rem' }}>
            <div style={{ flex:1, position:'relative' }}>
              <Search size={14} color="var(--text3)" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
              <input
                value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }}
                placeholder="Cerca per email o nome..."
                style={{ width:'100%', padding:'8px 12px 8px 36px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text)', fontSize:13, outline:'none', fontFamily:'DM Sans,sans-serif' }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'2rem', color:'var(--text3)' }}>Caricamento...</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Utente','Stato','MFA','Creato',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'0.5rem 0.75rem', fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h.toUpperCase()}</th>
                ))}</tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} onClick={()=>selectUser(user)}
                    style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', background: selected===user.id ? 'rgba(124,106,255,0.06)' : 'transparent', transition:'background 0.15s' }}>
                    <td style={{ padding:'0.75rem' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:'rgba(124,106,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'var(--accent2)', flexShrink:0 }}>
                          {(user.full_name||user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{user.full_name||'—'}</div>
                          <div style={{ fontSize:11, color:'var(--text3)' }}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'0.75rem' }}>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, background: user.is_active ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', color: user.is_active ? 'var(--green)' : 'var(--red)' }}>
                        {user.is_active ? 'Attivo' : 'Bloccato'}
                      </span>
                    </td>
                    <td style={{ padding:'0.75rem' }}>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, background: user.mfa_enabled ? 'rgba(167,139,250,0.1)' : 'rgba(255,255,255,0.05)', color: user.mfa_enabled ? '#a78bfa' : 'var(--text3)' }}>
                        {user.mfa_enabled ? 'Attivo' : 'Off'}
                      </span>
                    </td>
                    <td style={{ padding:'0.75rem', fontSize:11, color:'var(--text3)' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('it-IT') : '—'}
                    </td>
                    <td style={{ padding:'0.75rem' }}>
                      <ChevronRight size={14} color="var(--text3)"/>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} style={{ padding:'3rem', textAlign:'center', color:'var(--text3)' }}>
                    <Users size={32} style={{ margin:'0 auto 1rem', opacity:0.3, display:'block' }}/>
                    Nessun utente trovato
                  </td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {detail && (
          <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem', height:'fit-content' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Dettagli utente</span>
              <button onClick={()=>{ setDetail(null); setSelected(null) }} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}><X size={16}/></button>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.25rem', padding:'0.875rem', background:'var(--bg2)', borderRadius:10 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'rgba(124,106,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'var(--accent2)' }}>
                {(detail.full_name||detail.email)[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>{detail.full_name||'—'}</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>{detail.email}</div>
              </div>
            </div>

            {[
              ['Stato', detail.is_active ? 'Attivo' : 'Bloccato', detail.is_active ? 'var(--green)' : 'var(--red)'],
              ['Verificato', detail.is_verified ? 'Sì' : 'No', detail.is_verified ? 'var(--green)' : 'var(--text2)'],
              ['MFA', detail.mfa_enabled ? 'Attivo' : 'Disattivo', detail.mfa_enabled ? '#a78bfa' : 'var(--text2)'],
              ['Login totali', detail.login_count || 0, 'var(--text)'],
              ['Ultimo accesso', detail.last_login ? new Date(detail.last_login).toLocaleString('it-IT') : 'Mai', 'var(--text2)'],
              ['Registrato', detail.created_at ? new Date(detail.created_at).toLocaleDateString('it-IT') : '—', 'var(--text2)'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)' }}>
                <span style={{ fontSize:12, color:'var(--text3)' }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:500, color }}>{value}</span>
              </div>
            ))}

            <div style={{ marginTop:'1.25rem', display:'flex', flexDirection:'column', gap:8 }}>
              {detail.is_active ? (
                <button onClick={()=>blockUser(detail.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:8, color:'var(--red)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                  <ShieldOff size={13}/> Blocca utente
                </button>
              ) : (
                <button onClick={()=>unblockUser(detail.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', background:'rgba(52,211,153,0.08)', border:'1px solid rgba(52,211,153,0.2)', borderRadius:8, color:'var(--green)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                  <Shield size={13}/> Sblocca utente
                </button>
              )}
              {detail.mfa_enabled && (
                <button onClick={()=>resetMfa(detail.id)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px', background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)', borderRadius:8, color:'#a78bfa', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
                  <RotateCcw size={13}/> Reset MFA
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
