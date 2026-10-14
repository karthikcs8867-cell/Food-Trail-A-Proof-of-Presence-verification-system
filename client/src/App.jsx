import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import Navbar from './components/common/Navbar';
import CustomerHome from './components/customer/CustomerHome';
import RestaurantDetailModal from './components/customer/RestaurantDetailModal';
import SubmitReviewModal from './components/customer/SubmitReviewModal';
import VoucherWallet from './components/customer/VoucherWallet';
import OwnerDashboard from './components/restaurant/OwnerDashboard';
import LoginModal from './components/auth/LoginModal';
import LandingLogin from './components/auth/LandingLogin';

export default function App() {
  const { user, token, loading, isOwner, switchDemoPersona } = useAuth();
  const { showToast } = useToast();

  const [activePortal, setActivePortal] = useState('customer');
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [reviewRestaurant, setReviewRestaurant] = useState(null);
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeVoucherCount, setActiveVoucherCount] = useState(0);

  // Fetch active voucher count — always defined (hooks must be called unconditionally)
  useEffect(() => {
    if (!token || !user || user.role !== 'customer') return;
    async function fetchCount() {
      try {
        const res = await fetch('/api/vouchers/my-wallet', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setActiveVoucherCount(data.active?.length || 0);
        }
      } catch (e) { /* ignore */ }
    }
    fetchCount();
  }, [token, user]);

  // Sync portal view with user role after login
  useEffect(() => {
    if (!user) return;
    if (user.role === 'restaurant_owner' || user.role === 'admin') {
      setActivePortal('restaurant');
    } else {
      setActivePortal('customer');
    }
  }, [user]);

  const fetchVoucherCount = async () => {
    if (!token || !user || user.role !== 'customer') return;
    try {
      const res = await fetch('/api/vouchers/my-wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveVoucherCount(data.active?.length || 0);
      }
    } catch (e) { /* ignore */ }
  };

  const handleOpenSubmitReview = (rest = null) => {
    setReviewRestaurant(rest);
    setSubmitReviewOpen(true);
  };

  const handleVoucherEarned = (voucher, openWalletNow = false) => {
    fetchVoucherCount();
    if (openWalletNow) setWalletOpen(true);
  };

  // ─── Loading Splash ───
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-main)', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{ fontSize: '3rem' }}>🍽️</div>
        <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '1rem' }}>
          Loading FoodTrail...
        </div>
      </div>
    );
  }

  // ─── Not Authenticated → Show Landing / Login Page ───
  if (!user) {
    return <LandingLogin onAuthenticated={() => {}} />;
  }

  // ─── Main App ───
  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Dynamic Background Ambient Blobs */}
      <div className="ambient-bg">
        <div className="ambient-blob-1" />
        <div className="ambient-blob-2" />
        <div className="ambient-blob-3" />
      </div>

      {/* Main Navbar */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={(portal) => {
          if (portal === 'restaurant' && user?.role === 'customer') {
            switchDemoPersona('owner');
            showToast('Switched to Restaurant Owner portal.', 'info');
          } else if (portal === 'customer' && (user?.role === 'restaurant_owner' || user?.role === 'admin')) {
            switchDemoPersona('customer');
            showToast('Switched to Customer Hub.', 'info');
          }
          setActivePortal(portal);
        }}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenWallet={() => setWalletOpen(true)}
        voucherCount={activeVoucherCount}
      />

      {/* Portal Panels */}
      <main>
        {activePortal === 'customer' ? (
          <CustomerHome
            onSelectRestaurant={(rest) => setSelectedRestaurant(rest)}
            onOpenSubmitReview={handleOpenSubmitReview}
            onOpenWallet={() => setWalletOpen(true)}
            voucherCount={activeVoucherCount}
          />
        ) : (
          <OwnerDashboard />
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(11, 15, 23, 0.95)',
        padding: '28px 0',
        textAlign: 'center',
        color: 'var(--text-dim)',
        fontSize: '0.84rem',
        marginTop: '60px',
      }}>
        <div className="container" style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', flexWrap: 'wrap', gap: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>🍽️</span>
            <strong style={{ color: 'var(--text-main)' }}>FoodTrail</strong> — Verified Reviews & Gift Rewards
          </div>
          <div>Express REST · React 18 · GPS Geofencing · OCR Bill Engine · OAuth 2.0 & RBAC</div>
        </div>
      </footer>

      {/* ─── Modals ─── */}
      {selectedRestaurant && (
        <RestaurantDetailModal
          restaurant={selectedRestaurant}
          onClose={() => setSelectedRestaurant(null)}
          onWriteReview={(rest) => handleOpenSubmitReview(rest)}
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
          onClose={() => {
            setWalletOpen(false);
            fetchVoucherCount();
          }}
        />
      )}

      {authModalOpen && (
        <LoginModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
