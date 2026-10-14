import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import LoginPage from './LoginPage';
import CustomerHome from './components/customer/CustomerHome';
import RestaurantDetailModal from './components/customer/RestaurantDetailModal';
import SubmitReviewModal from './components/customer/SubmitReviewModal';
import VoucherWallet from './components/customer/VoucherWallet';
import { LogOut, Gift, Compass } from 'lucide-react';

const FEATURES = [
  { icon: '📍', title: 'GPS-Verified Reviews',      desc: 'Only diners physically at the restaurant can review' },
  { icon: '🧾', title: 'Bill Proof OCR',             desc: 'Upload your receipt for instant verification' },
  { icon: '🎁', title: 'Earn Gift Vouchers',          desc: 'Get rewarded for every verified review you submit' },
  { icon: '⭐', title: 'Trusted Ratings',             desc: 'Browse authentic ratings with verification badges' },
];

export default function App() {
  const { user, token, loading, logout } = useAuth();
  const { showToast } = useToast();

  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [submitReviewOpen, setSubmitReviewOpen]     = useState(false);
  const [reviewRestaurant, setReviewRestaurant]     = useState(null);
  const [walletOpen, setWalletOpen]                 = useState(false);
  const [voucherCount, setVoucherCount]             = useState(0);

  useEffect(() => {
    if (!token || !user) return;
    // wrong portal
    if (user.role !== 'customer') {
      showToast('This portal is for customers only. Please use the correct portal.', 'error');
      logout();
      return;
    }
    fetch('/api/vouchers/my-wallet', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setVoucherCount(d.active?.length || 0))
      .catch(() => {});
  }, [token, user]);

  const handleVoucherEarned = (_, open) => {
    fetch('/api/vouchers/my-wallet', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setVoucherCount(d.active?.length || 0));
    if (open) setWalletOpen(true);
  };

  // ── Loading splash ──
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-main)' }}>
        <div style={{ fontSize: '3rem' }}>🍽️</div>
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading FoodTrail…</div>
      </div>
    );
  }

  // ── Not logged in ──
  if (!user) {
    return (
      <LoginPage
        portalName="Customer Hub"
        portalIcon="🍽️"
        accentColor="#10B981"
        allowRegister={true}
        registerRole="customer"
        features={FEATURES}
        onSuccess={() => {}}
      />
    );
  }

  // ── Wrong role ──
  if (user.role !== 'customer') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-main)', textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2>Wrong Portal</h2>
        <p style={{ color: 'var(--text-muted)' }}>This portal is for customers only.<br/>Your account role is <strong>{user.role}</strong>.</p>
        <button className="btn btn-primary" onClick={logout}>Sign out and try again</button>
      </div>
    );
  }

  // ── Customer Dashboard ──
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="ambient-bg">
        <div className="ambient-blob-1" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
        <div className="ambient-blob-2" />
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
              background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
            }}>🍽️</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>FoodTrail</div>
              <div style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 700, letterSpacing: '0.06em', marginTop: '-2px' }}>CUSTOMER HUB</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-secondary btn-sm" style={{ gap: '6px' }} onClick={() => setWalletOpen(true)}>
              <Gift size={15} color="#FFB300" />
              <span style={{ color: '#FFB300', fontWeight: 700 }}>{voucherCount}</span>
              Vouchers
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
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
        <CustomerHome
          onSelectRestaurant={setSelectedRestaurant}
          onOpenSubmitReview={(rest) => { setReviewRestaurant(rest); setSubmitReviewOpen(true); }}
          onOpenWallet={() => setWalletOpen(true)}
          voucherCount={voucherCount}
        />
      </main>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(11,15,23,0.95)', padding: '24px 0', marginTop: '60px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          <span>🍽️ <strong style={{ color: 'var(--text-muted)' }}>FoodTrail Customer Hub</strong> — Browse, Review & Earn</span>
          <span>GPS Geofencing · OCR Verification · Instant Vouchers</span>
        </div>
      </footer>

      {selectedRestaurant && (
        <RestaurantDetailModal
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          onWriteReview={(rest) => { setReviewRestaurant(rest); setSubmitReviewOpen(true); }}
        />
      )}
      {submitReviewOpen && (
        <SubmitReviewModal
          isOpen={submitReviewOpen}
          onClose={() => setSubmitReviewOpen(false)}
          initialRestaurant={reviewRestaurant}
          onVoucherEarned={handleVoucherEarned}
        />
      )}
      {walletOpen && (
        <VoucherWallet
          isOpen={walletOpen}
          onClose={() => { setWalletOpen(false); }}
        />
      )}
    </div>
  );
}
