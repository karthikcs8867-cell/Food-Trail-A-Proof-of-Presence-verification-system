import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Gift, QrCode, CheckCircle, Clock, X, Copy, ExternalLink,
  Sparkles, Store, MapPin, Tag, RefreshCw
} from 'lucide-react';

export default function VoucherWallet({ isOpen, onClose }) {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [vouchersData, setVouchersData] = useState({ active: [], redeemed: [], expired: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'redeemed' | 'expired'
  const [selectedVoucherForQr, setSelectedVoucherForQr] = useState(null);

  const fetchWallet = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/vouchers/my-wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setVouchersData(data);
      }
    } catch (err) {
      console.error('Failed to load voucher wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
    }
  }, [isOpen, token]);

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    showToast(`Copied voucher code ${code} to clipboard!`, 'info');
  };

  if (!isOpen) return null;

  const currentList = vouchersData[activeTab] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '720px', padding: '28px', minHeight: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #FFB300 0%, #FF5A36 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(255, 179, 0, 0.3)',
            }}>
              <Gift size={22} color="#FFF" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Gift Voucher Wallet</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Auto-issued rewards earned from verified restaurant reviews
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchWallet}
              className="btn btn-ghost btn-sm"
              title="Refresh Wallet"
            >
              <RefreshCw size={16} />
            </button>
            <button onClick={onClose} className="btn-ghost" style={{ padding: '6px', borderRadius: '50%' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Wallet Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          background: 'var(--bg-surface)',
          padding: '6px',
          borderRadius: '12px',
          marginBottom: '20px',
        }}>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'active' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'active' ? '#FFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Sparkles size={15} />
            Active ({vouchersData.active.length})
          </button>

          <button
            onClick={() => setActiveTab('redeemed')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'redeemed' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'redeemed' ? '#FFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <CheckCircle size={15} />
            Redeemed ({vouchersData.redeemed.length})
          </button>

          <button
            onClick={() => setActiveTab('expired')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'expired' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'expired' ? '#FFF' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <Clock size={15} />
            Expired ({vouchersData.expired.length})
          </button>
        </div>

        {/* Voucher List Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
            Loading your gift certificates...
          </div>
        ) : currentList.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '50px 20px',
            background: 'var(--bg-surface)',
            borderRadius: '16px',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🎟️</div>
            <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>No {activeTab} vouchers in wallet</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '6px' }}>
              {activeTab === 'active'
                ? 'Submit a live-location or bill-proof review on any restaurant to instantly earn your next voucher!'
                : `You don't have any vouchers marked as ${activeTab}.`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
            {currentList.map((vch) => {
              const isActive = vch.status === 'active';
              const isRedeemed = vch.status === 'redeemed';

              return (
                <div
                  key={vch._id}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(26, 36, 56, 0.9) 0%, rgba(38, 28, 54, 0.9) 100%)'
                      : 'var(--bg-surface)',
                    border: `1px solid ${isActive ? 'rgba(255, 179, 0, 0.4)' : 'var(--border-subtle)'}`,
                    borderRadius: '14px',
                    padding: '18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                    boxShadow: isActive ? '0 8px 20px rgba(0,0,0,0.3)' : 'none',
                    opacity: isActive ? 1 : 0.75,
                  }}
                >
                  <div style={{ flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Store size={15} color="var(--primary)" />
                      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFF' }}>
                        {vch.restaurantName}
                      </span>
                      {isActive && <span className="badge badge-live">Ready to Claim</span>}
                      {isRedeemed && <span className="badge badge-role">Redeemed</span>}
                      {vch.status === 'expired' && <span className="badge badge-danger">Expired</span>}
                    </div>

                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFB300', margin: '4px 0' }}>
                      {vch.discountTitle}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Code: <strong style={{ color: '#FFF', fontFamily: 'monospace' }}>{vch.voucherCode}</strong></span>
                      <span>•</span>
                      <span>Expires: {new Date(vch.expiresAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => copyCode(vch.voucherCode)}
                      className="btn btn-secondary btn-sm"
                      title="Copy Voucher Code"
                    >
                      <Copy size={14} /> Copy
                    </button>

                    {isActive && (
                      <button
                        onClick={() => setSelectedVoucherForQr(vch)}
                        className="btn btn-primary btn-sm"
                      >
                        <QrCode size={16} /> Show QR Code
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detailed QR Code Popup Modal */}
        {selectedVoucherForQr && (
          <div className="modal-overlay" onClick={() => setSelectedVoucherForQr(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: '440px', padding: '28px', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                <button onClick={() => setSelectedVoucherForQr(null)} className="btn-ghost" style={{ padding: '4px' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(255, 179, 0, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <QrCode size={26} color="#FFB300" />
              </div>

              <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Present QR at Restaurant</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Show this barcode to staff at <strong>{selectedVoucherForQr.restaurantName}</strong>
              </p>

              {/* QR Code Container */}
              <div style={{
                background: '#FFFFFF',
                padding: '16px',
                borderRadius: '16px',
                display: 'inline-block',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                margin: '0 auto 16px',
              }}>
                <QRCodeSVG
                  value={selectedVoucherForQr.qrCodeData || selectedVoucherForQr.voucherCode}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
              </div>

              {/* Alphanumeric Code */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-medium)',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>VOUCHER CODE</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', color: '#FFB300' }}>
                    {selectedVoucherForQr.voucherCode}
                  </div>
                </div>
                <button
                  onClick={() => copyCode(selectedVoucherForQr.voucherCode)}
                  className="btn btn-ghost btn-sm"
                >
                  <Copy size={16} />
                </button>
              </div>

              <div style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '10px',
                padding: '10px',
                fontSize: '0.82rem',
                color: '#6EE7B7',
              }}>
                Reward: <strong>{selectedVoucherForQr.discountTitle}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
