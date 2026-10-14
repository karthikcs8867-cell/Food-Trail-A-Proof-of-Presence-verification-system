import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import LoginPage from './LoginPage';
import OwnerDashboard from './components/restaurant/OwnerDashboard';
import RestaurantRegistration from './components/restaurant/RestaurantRegistration';
import { LogOut, Store, ArrowRight, Sparkles } from 'lucide-react';

const FEATURES = [
  { icon: '📊', title: 'Live Analytics',       desc: 'Real-time review stats, ratings, and foot traffic' },
  { icon: '🎟️', title: 'Voucher Redemption',   desc: 'Scan & redeem customer QR vouchers at the counter' },
  { icon: '🏪', title: 'Listing Management',   desc: 'Register and update your restaurant profile' },
  { icon: '✅', title: 'Verification Status',  desc: 'Track admin approval of your restaurant listing' },
];

export default function App() {
  const { user, token, loading, logout } = useAuth();
  const { showToast } = useToast();

  // Track whether the owner has any restaurants
  const [hasRestaurants, setHasRestaurants] = useState(null); // null = loading, true/false = resolved
  const [checkingRestaurants, setCheckingRestaurants] = useState(false);

  // Fetch the owner's restaurants to determine onboarding state
  const checkOwnerRestaurants = useCallback(async () => {
    if (!token || !user || user.role !== 'restaurant_owner') return;
    setCheckingRestaurants(true);
    try {
      const res = await fetch('/api/restaurants/owner/my-restaurants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHasRestaurants(data.restaurants && data.restaurants.length > 0);
      } else {
        setHasRestaurants(false);
      }
    } catch (err) {
      console.error('[App] Error checking restaurants:', err);
      setHasRestaurants(false);
    } finally {
      setCheckingRestaurants(false);
    }
  }, [token, user]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'restaurant_owner') {
      showToast('This portal is for restaurant owners only.', 'error');
      logout();
      return;
    }
    checkOwnerRestaurants();
  }, [user]);

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-main)' }}>
        <div style={{ fontSize: '3rem' }}>🏪</div>
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading Restaurant Portal…</div>
      </div>
    );
  }

  // ── Not logged in → Login/Register page ──
  if (!user) {
    return (
      <LoginPage
        portalName="Restaurant Portal"
        portalIcon="🏪"
        accentColor="#FF5A36"
        allowRegister={true}
        registerRole="restaurant_owner"
        features={FEATURES}
        onSuccess={() => {}}
      />
    );
  }

  // ── Wrong role ──
  if (user.role !== 'restaurant_owner') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-main)', textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2>Wrong Portal</h2>
        <p style={{ color: 'var(--text-muted)' }}>This portal is for restaurant owners only.<br />Your role: <strong>{user.role}</strong></p>
        <button className="btn btn-primary" onClick={logout}>Sign out</button>
      </div>
    );
  }

  // ── Still checking restaurant ownership ──
  if (hasRestaurants === null || checkingRestaurants) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-main)' }}>
        <div style={{ fontSize: '3rem' }}>🏪</div>
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Setting up your dashboard…</div>
      </div>
    );
  }

  // ── No restaurants yet → Show onboarding registration page ──
  if (!hasRestaurants) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <div className="ambient-bg">
          <div className="ambient-blob-1" />
          <div className="ambient-blob-2" style={{ background: 'radial-gradient(circle, rgba(255,179,0,0.07) 0%, transparent 70%)' }} />
          <div className="ambient-blob-3" />
        </div>

        {/* Minimal Navbar */}
        <nav style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(11,15,23,0.92)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
              }}>🏪</div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>FoodTrail</div>
                <div style={{ fontSize: '0.68rem', color: '#FF5A36', fontWeight: 700, letterSpacing: '0.06em', marginTop: '-2px' }}>RESTAURANT PORTAL</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { logout(); showToast('Signed out', 'info'); }} title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </nav>

        {/* Onboarding Welcome + Registration */}
        <main style={{ position: 'relative', zIndex: 1 }}>
          <div className="container" style={{ padding: '48px 24px 80px', maxWidth: '800px', margin: '0 auto' }}>
            {/* Welcome Banner */}
            <div style={{
              textAlign: 'center',
              padding: '40px 32px',
              marginBottom: '32px',
              background: 'linear-gradient(135deg, rgba(255,90,54,0.08) 0%, rgba(255,179,0,0.06) 100%)',
              border: '1px solid rgba(255,90,54,0.2)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', margin: '0 auto 16px',
                boxShadow: '0 8px 32px rgba(255,90,54,0.3)',
              }}>
                <Sparkles size={28} color="#fff" />
              </div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '8px' }}>
                Welcome to FoodTrail, {user.name}! 🎉
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1.7, maxWidth: '520px', margin: '0 auto 8px' }}>
                Let's get your restaurant listed on FoodTrail. Fill out the registration form below to create your first restaurant listing.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(255,90,54,0.15)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', fontWeight: 700, color: '#FF5A36' }}>
                  <Store size={14} /> Step 1: Register Your Restaurant
                </div>
                <ArrowRight size={16} color="var(--text-dim)" />
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)' }}>
                  Step 2: Access Full Dashboard
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <RestaurantRegistration
              onRestaurantSaved={() => {
                showToast('Restaurant registered! Welcome to your dashboard 🎉', 'success');
                setHasRestaurants(true);
              }}
            />
          </div>
        </main>

        <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(11,15,23,0.95)', padding: '24px 0', marginTop: '60px' }}>
          <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
            <span>🏪 <strong style={{ color: 'var(--text-muted)' }}>FoodTrail Restaurant Portal</strong> — Getting Started</span>
            <span>Register your restaurant to unlock analytics, voucher redemption & more</span>
          </div>
        </footer>
      </div>
    );
  }

  // ── Has restaurants → Full Dashboard ──
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="ambient-bg">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" style={{ background: 'radial-gradient(circle, rgba(255,179,0,0.07) 0%, transparent 70%)' }} />
        <div className="ambient-blob-3" />
      </div>

      {/* Navbar */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(11,15,23,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
            }}>🏪</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>FoodTrail</div>
              <div style={{ fontSize: '0.68rem', color: '#FF5A36', fontWeight: 700, letterSpacing: '0.06em', marginTop: '-2px' }}>RESTAURANT PORTAL</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { logout(); showToast('Signed out', 'info'); }} title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </nav>

      <main style={{ position: 'relative', zIndex: 1 }}>
        <OwnerDashboard />
      </main>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(11,15,23,0.95)', padding: '24px 0', marginTop: '60px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          <span>🏪 <strong style={{ color: 'var(--text-muted)' }}>FoodTrail Restaurant Portal</strong> — Manage, Analyse & Redeem</span>
          <span>Analytics · Voucher Redemption · Listing Management</span>
        </div>
      </footer>
    </div>
  );
}

