import { useState, useEffect } from 'react'
import { Monitor, Trash2, AlertTriangle, Clock, Wifi } from 'lucide-react'

export default function Sessions({ token, API }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState(null)

  const h = { Authorization: `Bearer ${token}` }

  const loadSessions = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/sessions/`, { headers: h })
      if (res.ok) setSessions(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadSessions() }, [])

  const revokeSession = async (sessionId) => {
    setRevoking(sessionId)
    await fetch(`${API}/sessions/${sessionId}`, { method: 'DELETE', headers: h })
    setSessions(sessions.filter(s => s.id !== sessionId))
    setRevoking(null)
  }

  const revokeAll = async () => {
    await fetch(`${API}/sessions/`, { method: 'DELETE', headers: h })
    setSessions([])
  }

  const parseUA = (ua) => {
    if (!ua) return 'Browser sconosciuto'
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return ua.substring(0, 30) + '...'
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return '—'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Adesso'
    if (mins < 60) return `${mins} min fa`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h fa`
    return `${Math.floor(hours / 24)}g fa`
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Sessioni attive</h1>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>{sessions.length} sessioni attive sul tuo account</p>
        </div>
        {sessions.length > 0 && (
          <button onClick={revokeAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif' }}>
            <AlertTriangle size={13} /> Revoca tutte
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Caricamento...</div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>
            <Monitor size={32} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }} />
            <div>Nessuna sessione attiva</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Le sessioni appaiono dopo il primo login</div>
          </div>
        ) : (
          sessions.map(session => (
            <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0.875rem', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(124,106,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Monitor size={16} color="var(--accent2)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{parseUA(session.user_agent)}</div>
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Wifi size={10} /> {session.ip_address || '—'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} /> Ultimo accesso: {timeAgo(session.last_seen)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                    Creata: {session.created_at ? new Date(session.created_at).toLocaleDateString('it-IT') : '—'}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(52,211,153,0.1)', color: 'var(--green)' }}>Attiva</span>
              <button onClick={() => revokeSession(session.id)} disabled={revoking === session.id}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'transparent', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, color: 'var(--red)', fontSize: 11, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', opacity: revoking === session.id ? 0.5 : 1 }}>
                <Trash2 size={11} /> {revoking === session.id ? '...' : 'Revoca'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
