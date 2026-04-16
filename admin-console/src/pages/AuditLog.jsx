import { useState, useEffect } from 'react'
import { Activity, Download, Filter, CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export default function AuditLog({ token, API }) {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [loading, setLoading] = useState(true)

  const h = { Authorization: `Bearer ${token}` }

  const loadLogs = async () => {
    setLoading(true)
    try {
      let url = `${API}/audit/logs?page=${page}&limit=50`
      if (filterStatus) url += `&status=${filterStatus}`
      if (filterAction) url += `&action=${filterAction}`
      const res = await fetch(url, { headers: h })
      const data = await res.json()
      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }

  const loadStats = async () => {
    try {
      const res = await fetch(`${API}/audit/stats`, { headers: h })
      if (res.ok) setStats(await res.json())
    } catch {}
  }

  useEffect(() => { loadLogs(); loadStats() }, [page, filterStatus, filterAction])

  const exportCSV = () => {
    window.open(`${API}/audit/export`, '_blank')
  }

  const actionColor = (action) => {
    const colors = {
      login: '96,165,250',
      logout: '148,163,184',
      register: '52,211,153',
      token_refresh: '251,191,36',
      mfa_setup: '167,139,250',
      mfa_verify: '167,139,250',
    }
    return colors[action] || '148,163,184'
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.75rem' }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Audit Log</h1>
          <p style={{ fontSize:13, color:'var(--text2)' }}>Registro completo di tutte le attività — {total} eventi totali</p>
        </div>
        <button onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
          <Download size={14}/> Esporta CSV
        </button>
      </div>

      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12, marginBottom:'1.5rem' }}>
          {[
            { label:'Totale eventi', value:stats.total, color:'var(--accent2)', bg:'rgba(124,106,255,0.08)' },
            { label:'Login', value:stats.logins, color:'var(--blue)', bg:'rgba(96,165,250,0.08)' },
            { label:'Successi', value:stats.success, color:'var(--green)', bg:'rgba(52,211,153,0.08)' },
            { label:'Falliti', value:stats.failed, color:'var(--red)', bg:'rgba(248,113,113,0.08)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:14, padding:'1rem' }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, fontWeight:500, letterSpacing:'0.04em' }}>{label.toUpperCase()}</div>
              <div style={{ fontSize:22, fontWeight:700, color, fontFamily:'Syne,sans-serif' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem', marginBottom:12 }}>
        <div style={{ display:'flex', gap:10, marginBottom:'1rem', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text2)' }}>
            <Filter size={13}/>
            <select value={filterAction} onChange={e=>{ setFilterAction(e.target.value); setPage(1) }}
              style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:6, color:'var(--text)', fontSize:12, padding:'5px 10px', outline:'none', fontFamily:'DM Sans,sans-serif' }}>
              <option value="">Tutte le azioni</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="register">Registrazione</option>
              <option value="token_refresh">Token refresh</option>
              <option value="mfa_setup">MFA setup</option>
            </select>
          </div>
          <select value={filterStatus} onChange={e=>{ setFilterStatus(e.target.value); setPage(1) }}
            style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:6, color:'var(--text)', fontSize:12, padding:'5px 10px', outline:'none', fontFamily:'DM Sans,sans-serif' }}>
            <option value="">Tutti gli stati</option>
            <option value="success">Successo</option>
            <option value="failed">Fallito</option>
          </select>
          <button onClick={loadLogs} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 12px', background:'transparent', border:'1px solid var(--border2)', borderRadius:6, color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
            <RefreshCw size={12}/> Aggiorna
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'2rem', color:'var(--text3)' }}>Caricamento...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem', color:'var(--text3)' }}>
            <Activity size={32} style={{ margin:'0 auto 1rem', opacity:0.3 }}/>
            <div>Nessun evento trovato</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Timestamp','Utente','Azione','IP','Status'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'0.5rem 0.75rem', fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h.toUpperCase()}</th>
              ))}</tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'0.6rem 0.75rem', fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>
                    {new Date(log.created_at).toLocaleString('it-IT')}
                  </td>
                  <td style={{ padding:'0.6rem 0.75rem', fontSize:12, color:'var(--text)' }}>{log.user_email || '—'}</td>
                  <td style={{ padding:'0.6rem 0.75rem' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 10px', borderRadius:20, background:`rgba(${actionColor(log.action)},0.1)`, color:`rgb(${actionColor(log.action)})` }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding:'0.6rem 0.75rem', fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>{log.ip_address || '—'}</td>
                  <td style={{ padding:'0.6rem 0.75rem' }}>
                    {log.status === 'success'
                      ? <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--green)' }}><CheckCircle size={12}/> Successo</span>
                      : <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--red)' }}><XCircle size={12}/> Fallito</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {total > 50 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:'1rem' }}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
              style={{ padding:'5px 14px', background:'transparent', border:'1px solid var(--border2)', borderRadius:6, color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              Precedente
            </button>
            <span style={{ fontSize:12, color:'var(--text3)', padding:'5px 10px' }}>Pagina {page}</span>
            <button onClick={()=>setPage(p=>p+1)} disabled={page*50>=total}
              style={{ padding:'5px 14px', background:'transparent', border:'1px solid var(--border2)', borderRadius:6, color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
              Successiva
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
