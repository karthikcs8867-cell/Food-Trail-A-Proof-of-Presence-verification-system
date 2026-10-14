import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Mail, Lock, User, Store, Compass, ChevronRight,
  Sparkles, Shield, MapPin, Receipt, Gift, Star,
  CheckCircle2, ArrowRight
} from 'lucide-react';

const FEATURES = [
  {
    icon: <MapPin size={20} color="#10B981" />,
    bg: 'rgba(16, 185, 129, 0.15)',
    title: 'Live GPS Geofencing',
    desc: 'Proximity-verified reviews from real diners at the table',
  },
  {
    icon: <Receipt size={20} color="#60A5FA" />,
    bg: 'rgba(59, 130, 246, 0.15)',
    title: 'Bill Proof OCR',
    desc: 'Restaurant receipt scanned and validated instantly',
  },
  {
    icon: <Gift size={20} color="#FFB300" />,
    bg: 'rgba(255, 179, 0, 0.15)',
    title: 'Instant Gift Vouchers',
    desc: 'Reward vouchers auto-issued after every verified review',
  },
  {
    icon: <Shield size={20} color="#C084FC" />,
    bg: 'rgba(139, 92, 246, 0.15)',
    title: 'Zero Fake Reviews',
    desc: 'All reviews cryptographically verified via GPS or OCR',
  },
];

const DEMO_PERSONAS = [
  {
    key: 'customer',
    label: 'Demo as Customer',
    subtitle: 'Alex Rivera — Browse, review & earn vouchers',
    icon: <Compass size={18} />,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  {
    key: 'owner',
    label: 'Demo as Restaurant Owner',
    subtitle: 'Chef Marco — Manage listings & redeem vouchers',
    icon: <Store size={18} />,
    color: '#FF5A36',
    bg: 'rgba(255, 90, 54, 0.12)',
    border: 'rgba(255, 90, 54, 0.35)',
  },
  {
    key: 'admin',
    label: 'Demo as Admin',
    subtitle: 'Elena Vance — Approve listings & view all data',
    icon: <Shield size={18} />,
    color: '#C084FC',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
  },
];

export default function LandingLogin({ onAuthenticated }) {
  const { login, register, loginOAuth, switchDemoPersona } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        showToast('Welcome back! Successfully signed in.', 'success');
      } else {
        await register(name, email, password, role);
        showToast(`Account created! Welcome to FoodTrail.`, 'success');
      }
      onAuthenticated();
    } catch (err) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider) => {
    setLoading(true);
    try {
      await loginOAuth(provider, role);
      showToast(`Signed in via ${provider.charAt(0).toUpperCase() + provider.slice(1)}!`, 'success');
      onAuthenticated();
    } catch (err) {
      showToast(err.message || 'OAuth login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (persona) => {
    setDemoLoading(persona);
    try {
      await switchDemoPersona(persona);
      showToast(`Entered as ${persona} demo persona.`, 'success');
      onAuthenticated();
    } catch (err) {
      showToast(err.message || 'Demo login failed', 'error');
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
      background: 'var(--bg-main)',
    }}>
      {/* ─── LEFT PANEL — Branding & Feature Showcase ─── */}
      <div style={{
        flex: '0 0 52%',
        padding: '48px 56px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Ambient blobs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '520px', height: '520px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,90,54,0.14) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', right: '-60px',
          width: '480px', height: '480px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
          filter: 'blur(70px)', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '60px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.6rem', boxShadow: '0 6px 20px rgba(255,90,54,0.4)',
            }}>
              🍽️
            </div>
            <span style={{
              fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.8rem',
              background: 'linear-gradient(90deg, #FFF 30%, #FFB300 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              FoodTrail
            </span>
          </div>

          {/* Hero Headline */}
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{
              fontSize: 'clamp(2.4rem, 4vw, 3.4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: '20px',
            }}>
              Restaurant Reviews
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                You Can Trust.
              </span>
            </h1>
            <p style={{
              fontSize: '1.1rem', color: 'var(--text-muted)',
              lineHeight: 1.7, maxWidth: '480px',
            }}>
              Every review on FoodTrail is authenticated with <strong style={{ color: '#FFF' }}>Live GPS Geofencing</strong> or <strong style={{ color: '#FFF' }}>Receipt OCR</strong> — verified diners earn instant restaurant gift vouchers.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '520px' }}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                style={{
                  background: f.bg,
                  border: `1px solid ${f.bg.replace('0.15', '0.3')}`,
                  borderRadius: '14px',
                  padding: '16px',
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: f.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', marginBottom: '10px',
                }}>
                  {f.icon}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>{f.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Demo Persona Quick-Launch */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)',
            letterSpacing: '0.06em', marginBottom: '12px',
          }}>
            <Sparkles size={14} color="var(--primary)" />
            INSTANT DEMO — NO SIGN-UP REQUIRED
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.key}
                onClick={() => handleDemo(p.key)}
                disabled={demoLoading !== null}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: demoLoading === p.key ? p.bg : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${p.border}`,
                  borderRadius: '12px', padding: '12px 16px',
                  cursor: 'pointer', transition: 'var(--transition)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = p.bg; }}
                onMouseLeave={(e) => {
                  if (demoLoading !== p.key) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: p.bg, border: `1px solid ${p.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: p.color, flexShrink: 0,
                }}>
                  {demoLoading === p.key ? '...' : p.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#FFF' }}>{p.label}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{p.subtitle}</div>
                </div>
                <ArrowRight size={16} color={p.color} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANEL — Auth Form ─── */}
      <div style={{
        flex: '0 0 48%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        borderLeft: '1px solid var(--border-subtle)',
        background: 'linear-gradient(170deg, rgba(19,27,42,0.98) 0%, rgba(11,15,23,0.98) 100%)',
        position: 'relative',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {/* Tab Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-surface)',
            padding: '5px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '32px',
          }}>
            <button
              onClick={() => setMode('login')}
              style={{
                flex: 1, padding: '10px', borderRadius: 'var(--radius-full)',
                border: 'none', fontFamily: 'var(--font-heading)', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)',
                background: mode === 'login' ? 'var(--primary)' : 'transparent',
                color: mode === 'login' ? '#FFF' : 'var(--text-muted)',
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('register')}
              style={{
                flex: 1, padding: '10px', borderRadius: 'var(--radius-full)',
                border: 'none', fontFamily: 'var(--font-heading)', fontWeight: 700,
                fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)',
                background: mode === 'register' ? 'var(--primary)' : 'transparent',
                color: mode === 'register' ? '#FFF' : 'var(--text-muted)',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 900, marginBottom: '6px' }}>
              {mode === 'login' ? 'Welcome back' : 'Join FoodTrail'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {mode === 'login'
                ? 'Sign in to your account to access reviews and rewards.'
                : 'Choose your role and start verifying real dining experiences.'}
            </p>
          </div>

          {/* Role Picker (register only) */}
          {mode === 'register' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '22px' }}>
              {[
                { val: 'customer', label: 'Customer', icon: <Compass size={17} />, desc: 'Review & Earn Vouchers', color: '#10B981' },
                { val: 'restaurant_owner', label: 'Owner', icon: <Store size={17} />, desc: 'Manage & Redeem', color: '#FF5A36' },
              ].map((r) => (
                <div
                  key={r.val}
                  onClick={() => setRole(r.val)}
                  style={{
                    padding: '14px 12px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${role === r.val ? r.color : 'var(--border-medium)'}`,
                    background: role === r.val ? `rgba(${r.color === '#10B981' ? '16,185,129' : '255,90,54'},0.1)` : 'var(--bg-surface)',
                    textAlign: 'center', transition: 'var(--transition)',
                  }}
                >
                  <div style={{ color: role === r.val ? r.color : 'var(--text-muted)', marginBottom: '4px' }}>{r.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{r.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* OAuth Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => handleOAuth('google')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '0.88rem', padding: '11px' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => handleOAuth('meta')}
              disabled={loading}
              className="btn btn-secondary"
              style={{ fontSize: '0.88rem', padding: '11px' }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Meta
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              OR WITH EMAIL
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: '42px' }}
                  />
                  <User size={17} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '42px' }}
                />
                <Mail size={17} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '22px' }}>
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '42px' }}
                />
                <Lock size={17} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', fontSize: '1rem' }}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In to FoodTrail'
                : 'Create My Account'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div style={{
            marginTop: '20px',
            padding: '12px 14px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--text-muted)' }}>Demo credentials:</strong>
            <br/>
            Customer: <code style={{ color: '#FFB300' }}>customer@foodtrail.com</code> / <code style={{ color: '#FFB300' }}>password123</code>
            <br/>
            Owner: <code style={{ color: '#FF5A36' }}>owner@foodtrail.com</code> / <code style={{ color: '#FF5A36' }}>password123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
