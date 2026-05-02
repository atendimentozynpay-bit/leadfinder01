import { useState } from 'react'
import { signIn } from '../lib/supabase'

const css = {
  screen: {
    minHeight: '100dvh',
    background: 'linear-gradient(160deg, #1a1f2e 0%, #0f2027 100%)',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '2rem 1.5rem', fontFamily: "'DM Sans', sans-serif",
  },
  logoIcon: {
    width: 64, height: 64, background: '#059669', borderRadius: 18,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 28, margin: '0 auto 12px',
  },
  logoTitle: {
    fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800,
    color: '#f8fafc', textAlign: 'center', letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 11, color: '#94a3b8', textAlign: 'center',
    letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, marginBottom: 32,
  },
  card: {
    width: '100%', maxWidth: 380,
    background: '#252b3b',
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '1.75rem 1.5rem',
  },
  roleRow: { display: 'flex', gap: 8, marginBottom: '1.25rem' },
  roleBtn: (sel) => ({
    flex: 1, padding: '9px 8px', borderRadius: 8, cursor: 'pointer',
    border: sel ? '0.5px solid #059669' : '0.5px solid rgba(255,255,255,0.15)',
    background: sel ? 'rgba(5,150,105,0.2)' : 'transparent',
    color: sel ? '#34d399' : '#94a3b8',
    fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
  }),
  fieldLabel: {
    fontSize: 11, fontWeight: 500, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'block',
  },
  input: {
    width: '100%', background: '#1a1f2e',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '11px 14px',
    color: '#f8fafc', fontFamily: "'DM Sans', sans-serif",
    fontSize: 14, outline: 'none', marginBottom: '1rem', boxSizing: 'border-box',
  },
  btn: (loading) => ({
    width: '100%', marginTop: 4,
    background: loading ? '#047857' : '#059669',
    border: 'none', borderRadius: 10, padding: 13,
    color: '#fff', fontFamily: "'Syne', sans-serif",
    fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
    letterSpacing: 0.5, opacity: loading ? 0.8 : 1,
  }),
  error: {
    marginTop: 12, padding: '8px 12px', borderRadius: 8,
    background: 'rgba(239,68,68,0.15)', color: '#f87171',
    fontSize: 12, textAlign: 'center',
  },
}

export default function LoginPage() {
  const [role, setRole] = useState('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await signIn(email, password)
    if (err) { setError(err.message); setLoading(false) }
    // AuthProvider vai redirecionar automaticamente
  }

  return (
    <div style={css.screen}>
      <div style={{ textAlign: 'center' }}>
        <div style={css.logoIcon}>⚡</div>
        <div style={css.logoTitle}>
          Lead<span style={{ color: '#059669' }}>Finder</span>
        </div>
        <div style={css.logoSub}>Habil Soluções Energéticas</div>
      </div>

      <form style={css.card} onSubmit={handleLogin}>
        <div style={css.roleRow}>
          <button type="button" style={css.roleBtn(role === 'admin')} onClick={() => setRole('admin')}>
            👤 Diretor
          </button>
          <button type="button" style={css.roleBtn(role === 'vendedor')} onClick={() => setRole('vendedor')}>
            🧑‍💼 Vendedor
          </button>
        </div>

        <label style={css.fieldLabel}>E-mail</label>
        <input
          style={css.input} type="email" required
          placeholder="seu@email.com.br"
          value={email} onChange={e => setEmail(e.target.value)}
        />

        <label style={css.fieldLabel}>Senha</label>
        <input
          style={css.input} type="password" required
          placeholder="••••••••"
          value={password} onChange={e => setPassword(e.target.value)}
        />

        <button type="submit" style={css.btn(loading)} disabled={loading}>
          {loading ? 'ENTRANDO...' : 'ENTRAR NO APP →'}
        </button>

        {error && <div style={css.error}>{error}</div>}
      </form>
    </div>
  )
}
