import { useState, useEffect } from 'react'
import { Mail, Plus, Copy, Check, Clock, UserCheck, X } from 'lucide-react'

export default function Invitations({ token, API }) {
  const [invitations, setInvitations] = useState([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [newInvite, setNewInvite] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const loadInvitations = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/invitations/`, { headers: h })
      if (res.ok) setInvitations(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadInvitations() }, [])

  const sendInvite = async () => {
    if (!email) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API}/invitations/`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail); setSending(false); return }
      setNewInvite(data)
      setEmail('')
      loadInvitations()
    } catch { setError('Errore di connessione') }
    setSending(false)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(newInvite.invite_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Inviti</h1>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Invita nuovi utenti nel tuo tenant</p>
      </div>

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>Nuovo invito</div>
        {error && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, padding: '8px 12px', background: 'rgba(248,113,113,0.08)', borderRadius: 6 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendInvite()}
            placeholder="email@azienda.it"
            style={{ flex: 1, padding: '9px 14px', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'DM Sans,sans-serif' }}
          />
          <button onClick={sendInvite} disabled={sending || !email}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', opacity: sending ? 0.7 : 1 }}>
            <Plus size={14} /> {sending ? 'Invio...' : 'Invita'}
          </button>
        </div>

        {newInvite && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={13} /> Invito creato per {newInvite.message.split('for ')[1]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 8 }}>
              Scadenza: {new Date(newInvite.expires_at).toLocaleDateString('it-IT')}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'var(--accent2)', background: 'rgba(124,106,255,0.08)', padding: '8px 12px', borderRadius: 6, wordBreak: 'break-all' }}>
                {newInvite.invite_url}
              </div>
              <button onClick={copyLink}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: copied ? 'rgba(52,211,153,0.1)' : 'var(--bg2)', border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'var(--border2)'}`, borderRadius: 6, color: copied ? 'var(--green)' : 'var(--text2)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans,sans-serif', flexShrink: 0 }}>
                {copied ? <><Check size={12} /> Copiato</> : <><Copy size={12} /> Copia</>}
              </button>
              <button onClick={() => setNewInvite(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: '1rem' }}>Inviti inviati</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Caricamento...</div>
        ) : invitations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text3)' }}>
            <Mail size={32} style={{ margin: '0 auto 1rem', opacity: 0.3, display: 'block' }} />
            Nessun invito inviato
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>{['Email', 'Stato', 'Scadenza', 'Inviato'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h.toUpperCase()}</th>
              ))}</tr>
            </thead>
            <tbody>
              {invitations.map(inv => (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', fontSize: 13, color: 'var(--text)' }}>{inv.email}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {inv.is_used
                      ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.1)', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><UserCheck size={11} /> Accettato</span>
                      : <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: 'rgba(251,191,36,0.1)', color: 'var(--amber)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Clock size={11} /> In attesa</span>
                    }
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: 12, color: 'var(--text3)' }}>{new Date(inv.expires_at).toLocaleDateString('it-IT')}</td>
                  <td style={{ padding: '0.75rem', fontSize: 12, color: 'var(--text3)' }}>{new Date(inv.created_at).toLocaleDateString('it-IT')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
