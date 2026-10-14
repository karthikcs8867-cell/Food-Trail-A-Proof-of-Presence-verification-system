import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { X, Lock, Mail, User, ShieldCheck, Store, Compass, Sparkles } from 'lucide-react';

export default function LoginModal({ isOpen, onClose }) {
  const { login, register, loginOAuth, switchDemoPersona } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [role, setRole] = useState('customer'); // 'customer' | 'restaurant_owner'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        showToast('Welcome back! Successfully logged in.', 'success');
      } else {
        await register(name, email, password, role);
        showToast(`Account created as ${role === 'customer' ? 'Customer' : 'Restaurant Owner'}!`, 'success');
      }
      onClose();
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
      showToast(`Logged in via ${provider.toUpperCase()} OAuth!`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message || 'OAuth login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSwitch = async (persona) => {
    setLoading(true);
    try {
      await switchDemoPersona(persona);
      showToast(`Switched persona to: ${persona.toUpperCase()}`, 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '480px', padding: '32px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {mode === 'login' ? 'Sign in to FoodTrail' : 'Join FoodTrail'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {mode === 'login' ? 'Access your verified reviews & rewards' : 'Choose your role and get started'}
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost" style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        {/* 1-Click Fast Demo Switcher */}
        <div style={{
          background: 'rgba(255, 90, 54, 0.08)',
          border: '1px solid rgba(255, 90, 54, 0.25)',
          borderRadius: '12px',
          padding: '12px 14px',
          marginBottom: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.82rem', color: '#FF784E', fontWeight: 700 }}>
            <Sparkles size={14} /> 1-CLICK DEMO PERSONAS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleDemoSwitch('customer')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '8px 6px' }}
            >
              <Compass size={13} color="#10B981" /> Customer
            </button>
            <button
              type="button"
              onClick={() => handleDemoSwitch('owner')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '8px 6px' }}
            >
              <Store size={13} color="#FF5A36" /> Owner
            </button>
            <button
              type="button"
              onClick={() => handleDemoSwitch('admin')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '8px 6px' }}
            >
              <ShieldCheck size={13} color="#8B5CF6" /> Admin
            </button>
          </div>
        </div>

        {/* OAuth 2.0 Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.88rem', padding: '10px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('meta')}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.88rem', padding: '10px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Meta
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '20px 0',
          color: 'var(--text-dim)',
          fontSize: '0.82rem',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>OR CONTINUE WITH EMAIL</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Role Toggle for Registration */}
        {mode === 'register' && (
          <div style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>I want to join as:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                onClick={() => setRole('customer')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: `2px solid ${role === 'customer' ? 'var(--primary)' : 'var(--border-medium)'}`,
                  background: role === 'customer' ? 'rgba(255, 90, 54, 0.12)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Compass size={20} color={role === 'customer' ? 'var(--primary)' : 'var(--text-muted)'} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '4px' }}>Customer</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Review & Earn Vouchers</div>
              </div>

              <div
                onClick={() => setRole('restaurant_owner')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: `2px solid ${role === 'restaurant_owner' ? 'var(--primary)' : 'var(--border-medium)'}`,
                  background: role === 'restaurant_owner' ? 'rgba(255, 90, 54, 0.12)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Store size={20} color={role === 'restaurant_owner' ? 'var(--primary)' : 'var(--text-muted)'} />
                <div style={{ fontWeight: 700, fontSize: '0.88rem', marginTop: '4px' }}>Restaurant Owner</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Manage & Redeem</div>
              </div>
            </div>
          </div>
        )}

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
                  style={{ paddingLeft: '40px' }}
                />
                <User size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
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
                style={{ paddingLeft: '40px' }}
              />
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '40px' }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '10px' }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
              >
                Sign in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
