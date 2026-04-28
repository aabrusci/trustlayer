import { useState, useEffect } from 'react'
import { Palette, Save, Eye } from 'lucide-react'

export default function Brand({ token, API }) {
  const [brand, setBrand] = useState({
    company_name: 'TrustLayer',
    logo_url: '',
    primary_color: '#7c6aff',
    background_color: '#080810',
    accent_color: '#a594ff',
    support_email: '',
    custom_domain: ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState(false)

  const h = { Authorization:`Bearer ${token}`, 'Content-Type':'application/json' }

  useEffect(() => {
    fetch(`${API}/brand/`, { headers: h })
      .then(r => r.json())
      .then(data => setBrand({
        company_name: data.company_name || 'TrustLayer',
        logo_url: data.logo_url || '',
        primary_color: data.primary_color || '#7c6aff',
        background_color: data.background_color || '#080810',
        accent_color: data.accent_color || '#a594ff',
        support_email: data.support_email || '',
        custom_domain: data.custom_domain || ''
      }))
      .catch(() => {})
  }, [])

  const save = async () => {
    setSaving(true)
    await fetch(`${API}/brand/`, {
      method:'PATCH', headers: h,
      body: JSON.stringify(brand)
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle = {
    width:'100%', padding:'9px 14px',
    background:'var(--bg2)', border:'1px solid var(--border2)',
    borderRadius:8, color:'var(--text)', fontSize:13,
    outline:'none', fontFamily:'DM Sans,sans-serif',
    marginBottom:12
  }

  const labelStyle = {
    fontSize:12, fontWeight:500,
    color:'var(--text2)', display:'block', marginBottom:4
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'1.75rem' }}>
        <div>
          <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Brand & Personalizzazione</h1>
          <p style={{ fontSize:13, color:'var(--text2)' }}>Personalizza la login page con il tuo brand</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setPreview(!preview)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'transparent', border:'1px solid var(--border2)', borderRadius:8, color:'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
            <Eye size={14}/> {preview ? 'Nascondi' : 'Anteprima'}
          </button>
          <button onClick={save} disabled={saving}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans,sans-serif' }}>
            <Save size={14}/> {saving ? 'Salvataggio...' : saved ? '✓ Salvato' : 'Salva'}
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap:14 }}>
        <div>
          <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem', marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', letterSpacing:'0.05em', marginBottom:'1rem' }}>IDENTITÀ AZIENDALE</div>
            <label style={labelStyle}>Nome azienda</label>
            <input style={inputStyle} value={brand.company_name} onChange={e=>setBrand({...brand,company_name:e.target.value})} placeholder="Acme Corp"/>
            <label style={labelStyle}>URL Logo (link immagine)</label>
            <input style={inputStyle} value={brand.logo_url} onChange={e=>setBrand({...brand,logo_url:e.target.value})} placeholder="https://tuodominio.com/logo.png"/>
            <label style={labelStyle}>Email supporto</label>
            <input style={inputStyle} value={brand.support_email} onChange={e=>setBrand({...brand,support_email:e.target.value})} placeholder="support@tuodominio.com"/>
            <label style={labelStyle}>Dominio custom</label>
            <input style={{...inputStyle,marginBottom:0}} value={brand.custom_domain} onChange={e=>setBrand({...brand,custom_domain:e.target.value})} placeholder="login.tuodominio.com"/>
          </div>

          <div style={{ background:'var(--bg1)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem' }}>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text2)', letterSpacing:'0.05em', marginBottom:'1rem' }}>COLORI</div>
            {[
              ['Colore primario', 'primary_color'],
              ['Colore sfondo', 'background_color'],
              ['Colore accent', 'accent_color'],
            ].map(([label, key]) => (
              <div key={key} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <input type="color" value={brand[key]} onChange={e=>setBrand({...brand,[key]:e.target.value})}
                  style={{ width:40, height:36, borderRadius:8, border:'1px solid var(--border2)', cursor:'pointer', padding:2, background:'var(--bg2)' }}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:'var(--text2)', marginBottom:2 }}>{label}</div>
                  <code style={{ fontSize:11, color:'var(--accent2)' }}>{brand[key]}</code>
                </div>
                <input value={brand[key]} onChange={e=>setBrand({...brand,[key]:e.target.value})}
                  style={{ width:100, padding:'6px 10px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:6, color:'var(--text)', fontSize:12, outline:'none', fontFamily:'monospace' }}/>
              </div>
            ))}
          </div>
        </div>

        {preview && (
          <div style={{ background: brand.background_color, borderRadius:14, padding:'2rem', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
            <div style={{ width:'100%', maxWidth:360, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:'2rem' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1.5rem' }}>
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt="logo" style={{ height:32, objectFit:'contain' }}/>
                ) : (
                  <div style={{ width:32, height:32, background:brand.primary_color, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#fff' }}>
                    {brand.company_name[0]}
                  </div>
                )}
                <span style={{ fontSize:16, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif' }}>{brand.company_name}</span>
              </div>
              <div style={{ fontSize:20, fontWeight:700, color:'#fff', fontFamily:'Syne,sans-serif', marginBottom:6 }}>Bentornato</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:'1.25rem' }}>Accedi al tuo account</div>
              <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, marginBottom:10, fontSize:13, color:'rgba(255,255,255,0.4)' }}>email@azienda.it</div>
              <div style={{ padding:'10px 14px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, marginBottom:16, fontSize:13, color:'rgba(255,255,255,0.4)' }}>••••••••</div>
              <div style={{ padding:'11px', background:brand.primary_color, borderRadius:8, textAlign:'center', fontSize:14, fontWeight:600, color:'#fff' }}>Accedi</div>
              {brand.support_email && (
                <div style={{ marginTop:'1rem', textAlign:'center', fontSize:11, color:'rgba(255,255,255,0.3)' }}>
                  Supporto: {brand.support_email}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
