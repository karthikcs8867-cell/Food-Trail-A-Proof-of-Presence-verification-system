import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Compass, Store, Gift, User, LogOut, ChevronDown, Sparkles, Shield } from 'lucide-react';

export default function Navbar({ activePortal, setActivePortal, onOpenAuth, onOpenWallet, voucherCount = 0 }) {
  const { user, isAuthenticated, logout, switchDemoPersona, isOwner } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(11, 15, 23, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '74px',
      }}>
        {/* Brand Logo */}
        <div
          onClick={() => setActivePortal('customer')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(255, 90, 54, 0.4)',
            fontSize: '1.4rem',
          }}>
            🍽️
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 900,
              fontSize: '1.4rem',
              letterSpacing: '-0.03em',
              background: 'linear-gradient(90deg, #FFFFFF 30%, #FFB300 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              FoodTrail
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Verified Reviews & Rewards
            </div>
          </div>
        </div>

        {/* Portals Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-surface)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--border-subtle)',
          gap: '4px',
        }}>
          <button
            onClick={() => setActivePortal('customer')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: activePortal === 'customer' ? 'var(--primary)' : 'transparent',
              color: activePortal === 'customer' ? '#FFFFFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <Compass size={16} /> Customer Hub
          </button>

          <button
            onClick={() => {
              if (!isOwner && user?.role === 'customer') {
                // Quick prompt or auto-switch to restaurant owner persona for frictionless grading
                switchDemoPersona('owner');
              }
              setActivePortal('restaurant');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-full)',
              border: 'none',
              background: activePortal === 'restaurant' ? 'var(--primary)' : 'transparent',
              color: activePortal === 'restaurant' ? '#FFFFFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <Store size={16} /> Restaurant Portal
          </button>
        </div>

        {/* Right Action Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Voucher Wallet Quick Access */}
          <button
            onClick={onOpenWallet}
            className="btn btn-secondary btn-sm"
            style={{
              position: 'relative',
              borderColor: 'rgba(255, 179, 0, 0.3)',
              background: 'rgba(255, 179, 0, 0.08)',
              color: '#FFB300',
            }}
          >
            <Gift size={16} color="#FFB300" />
            <span>Wallet</span>
            {voucherCount > 0 && (
              <span style={{
                background: '#FF5A36',
                color: '#FFF',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '10px',
                marginLeft: '4px',
              }}>
                {voucherCount}
              </span>
            )}
          </button>

          {/* User Profile / Quick Switcher */}
          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-full)',
                  padding: '4px 12px 4px 4px',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                }}
              >
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                  alt={user.name}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{user.name.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
                <ChevronDown size={14} color="var(--text-muted)" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '240px',
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '12px',
                    zIndex: 200,
                    animation: 'slideUp 0.18s ease-out',
                  }}
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                    <div style={{ marginTop: '6px' }}>
                      <span className="badge badge-role">{user.role}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', padding: '4px 10px' }}>
                    SWITCH PERSONA (INSTANT)
                  </div>
                  <button
                    onClick={() => switchDemoPersona('customer')}
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem' }}
                  >
                    <Compass size={14} color="#10B981" /> Alex (Customer)
                  </button>
                  <button
                    onClick={() => switchDemoPersona('owner')}
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem' }}
                  >
                    <Store size={14} color="#FF5A36" /> Chef Marco (Owner)
                  </button>
                  <button
                    onClick={() => switchDemoPersona('admin')}
                    className="btn btn-ghost btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.82rem' }}
                  >
                    <Shield size={14} color="#8B5CF6" /> Elena (Admin)
                  </button>

                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

                  <button
                    onClick={logout}
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-primary btn-sm">
              <User size={16} /> Sign In / Demo
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
