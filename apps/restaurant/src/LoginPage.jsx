import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';

/**
 * Props:
 *  portalName   – e.g. "Customer Hub"
 *  portalIcon   – emoji string, e.g. "🍽️"
 *  accentColor  – CSS color string, e.g. "#10B981"
 *  allowRegister – boolean, whether to show the register tab
 *  registerRole  – role string to use when registering, e.g. "customer"
 *  onSuccess    – called after successful login/register
 *  features     – array of { icon, title, desc } for left panel
 */
export default function LoginPage({
  portalName = 'FoodTrail',
  portalIcon = '🍽️',
  accentColor = '#FF5A36',
  allowRegister = true,
  registerRole = 'customer',
  onSuccess,
  features = [],
}) {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode]         = useState('login');
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);

  const accentGlow = accentColor + '33';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const u = await login(email, password);
        showToast(`Welcome back, ${u.name}!`, 'success');
        onSuccess && onSuccess(u);
      } else {
        const u = await register(name, email, password, registerRole);
        showToast(`Account created! Welcome, ${u.name}!`, 'success');
        onSuccess && onSuccess(u);
      }
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', overflow: 'hidden',
      background: 'var(--bg-main)', position: 'relative',
    }}>
      {/* ── Left Branding Panel ── */}
      <div style={{
        flex: '0 0 48%', padding: '52px 56px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient blobs */}
        <div style={{
          position: 'absolute', top: '-100px', left: '-100px',
          width: '550px', height: '550px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}20 0%, transparent 70%)`,
          filter: 'blur(70px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-60px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)`,
          filter: 'blur(80px)', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '64px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}99 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.7rem', boxShadow: `0 8px 24px ${accentGlow}`,
            }}>
              {portalIcon}
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.5rem',
                background: `linear-gradient(90deg, #fff 40%, ${accentColor} 100%)`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                FoodTrail
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em', marginTop: '-2px' }}>
                {portalName.toUpperCase()}
              </div>
            </div>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '18px' }}>
            {portalName}
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: '400px', marginBottom: '48px' }}>
            Sign in to access your personalized dashboard on the FoodTrail platform.
          </p>

          {/* Feature list */}
          {features.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                    background: `${accentColor}18`, border: `1px solid ${accentColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}>
                    {f.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '2px' }}>{f.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          © 2025 FoodTrail Platform · Verified dining experiences
        </div>
      </div>

      {/* ── Right Auth Panel ── */}
      <div style={{
        flex: '0 0 52%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 48px',
        borderLeft: '1px solid var(--border-subtle)',
        background: 'linear-gradient(160deg, rgba(19,27,42,0.98) 0%, rgba(11,15,23,0.98) 100%)',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Tab toggle */}
          {allowRegister && (
            <div style={{
              display: 'flex', background: 'var(--bg-surface)', padding: '5px',
              borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', marginBottom: '36px',
            }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: '10px', borderRadius: 'var(--radius-full)', border: 'none',
                  fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'var(--transition)',
                  background: mode === m ? accentColor : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                }}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px', lineHeight: 1.6 }}>
            {mode === 'login'
              ? `Sign in to your ${portalName} account to continue.`
              : `Join FoodTrail as a ${registerRole.replace('_', ' ')}.`}
          </p>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text" required placeholder="Your full name"
                    className="form-input" value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ paddingLeft: '42px' }}
                  />
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email" required placeholder="you@example.com"
                  className="form-input" value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: '42px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '28px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                  className="form-input" value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: '42px', paddingRight: '42px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '4px',
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 'var(--radius-lg)',
                border: 'none', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'var(--transition)',
                background: loading ? 'var(--bg-surface-elevated)' : `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
                color: '#fff', boxShadow: loading ? 'none' : `0 6px 24px ${accentGlow}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} /> Processing…</>
              ) : (
                <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          {allowRegister && (
            <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: accentColor, fontWeight: 700, fontSize: '0.85rem',
              }}>
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
