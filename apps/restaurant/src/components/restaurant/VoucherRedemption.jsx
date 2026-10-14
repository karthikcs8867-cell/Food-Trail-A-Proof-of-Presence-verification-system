import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  QrCode, CheckCircle2, AlertCircle, Search, ShieldCheck,
  Receipt, ArrowRight, Sparkles, Camera, X, RefreshCw
} from 'lucide-react';

export default function VoucherRedemption() {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [inputCode, setInputCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Initialize html5-qrcode scanner when scannerOpen is true
  useEffect(() => {
    let scanner = null;
    if (scannerOpen) {
      scanner = new Html5QrcodeScanner('qr-reader-container', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      });

      scanner.render(
        (decodedText) => {
          handleLookup(decodedText);
          setScannerOpen(false);
          scanner.clear();
        },
        (error) => {
          // ignore frame errors
        }
      );
    }

    return () => {
      if (scanner) {
        try { scanner.clear(); } catch (e) {}
      }
    };
  }, [scannerOpen]);

  const handleLookup = async (codeToLookup = null) => {
    const code = (codeToLookup || inputCode).trim();
    if (!code) {
      showToast('Please enter a voucher code or scan a QR code.', 'error');
      return;
    }

    setLookingUp(true);
    setLookupResult(null);
    setRedeemSuccess(null);

    try {
      const res = await fetch(`/api/vouchers/lookup/${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voucher not found');

      setLookupResult(data);
      showToast('Voucher details retrieved!', 'info');
    } catch (err) {
      showToast(err.message || 'Lookup failed', 'error');
    } finally {
      setLookingUp(false);
    }
  };

  const handleRedeem = async () => {
    if (!lookupResult?.voucher?.voucherCode) return;

    setRedeeming(true);
    try {
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voucherCode: lookupResult.voucher.voucherCode,
          restaurantId: lookupResult.voucher.restaurantId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Redemption failed');

      setRedeemSuccess(data);
      setLookupResult(null);
      setInputCode('');
      showToast(`🎉 ${data.message}`, 'success');
    } catch (err) {
      showToast(err.message || 'Redemption failed', 'error');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <QrCode size={24} color="#10B981" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Voucher Redemption Terminal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Scan customer QR codes or enter alphanumeric voucher codes to apply customer discounts
            </p>
          </div>
        </div>

        {/* Input & Scan Row */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. FT-BELL-9821 or paste QR payload"
              className="form-input"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              style={{ height: '48px', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem' }}
            />
          </div>

          <button
            onClick={() => handleLookup()}
            disabled={lookingUp}
            className="btn btn-primary"
            style={{ height: '48px', padding: '0 20px' }}
          >
            {lookingUp ? <RefreshCw className="pulse-radar" size={16} /> : <Search size={16} />}
            Verify Code
          </button>

          <button
            onClick={() => setScannerOpen(!scannerOpen)}
            className="btn btn-secondary"
            style={{ height: '48px', padding: '0 16px' }}
            title="Scan with Camera"
          >
            <Camera size={18} color="#10B981" />
            <span>{scannerOpen ? 'Close Camera' : 'Scan QR'}</span>
          </button>
        </div>

        {/* Live Camera Scanner Box */}
        {scannerOpen && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-medium)',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Align Customer QR Code in Camera Viewfinder</span>
              <button onClick={() => setScannerOpen(false)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div id="qr-reader-container" style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }} />
          </div>
        )}
      </div>

      {/* Lookup Result Card */}
      {lookupResult?.voucher && (
        <div
          className="glass-panel"
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: lookupResult.voucher.status === 'active'
              ? '2px solid #10B981'
              : '2px solid #EF4444',
            animation: 'slideUp 0.25s ease-out',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 700 }}>VOUCHER DETAILS</span>
            {lookupResult.voucher.status === 'active' && (
              <span className="badge badge-live">✓ Valid & Ready to Redeem</span>
            )}
            {lookupResult.voucher.status === 'redeemed' && (
              <span className="badge badge-danger">Already Redeemed</span>
            )}
            {lookupResult.voucher.status === 'expired' && (
              <span className="badge badge-danger">Expired</span>
            )}
          </div>

          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFB300', marginBottom: '4px' }}>
            {lookupResult.voucher.discountTitle}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#FFF', fontWeight: 700 }}>
            Valid at: {lookupResult.voucher.restaurantName}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            background: 'var(--bg-surface)',
            padding: '14px',
            borderRadius: '10px',
            margin: '16px 0',
            fontSize: '0.85rem',
          }}>
            <div>
              <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>VOUCHER CODE</span>
              <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#FCD34D' }}>
                {lookupResult.voucher.voucherCode}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>CUSTOMER NAME</span>
              <span style={{ fontWeight: 600 }}>
                {lookupResult.customer?.name || 'Verified Diner'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>ISSUED DATE</span>
              <span>{new Date(lookupResult.voucher.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>EXPIRES ON</span>
              <span>{new Date(lookupResult.voucher.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>

          {lookupResult.voucher.status === 'active' ? (
            <button
              onClick={handleRedeem}
              disabled={redeeming}
              className="btn btn-success btn-lg"
              style={{ width: '100%', fontWeight: 800 }}
            >
              {redeeming ? 'Processing Redemption...' : '✓ Confirm & Mark as Redeemed'}
            </button>
          ) : (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              padding: '10px',
              color: '#FCA5A5',
              fontSize: '0.85rem',
              textAlign: 'center',
            }}>
              This voucher cannot be redeemed (Status: {lookupResult.voucher.status.toUpperCase()}).
            </div>
          )}
        </div>
      )}

      {/* Redemption Success Receipt Box */}
      {redeemSuccess && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(19, 27, 42, 0.95) 100%)',
          border: '2px solid #10B981',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          textAlign: 'center',
          animation: 'slideUp 0.3s ease-out',
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <CheckCircle2 size={30} color="#FFF" />
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FFF' }}>Redemption Confirmed!</h3>
          <p style={{ color: '#A7F3D0', fontSize: '0.9rem', margin: '4px 0 16px' }}>
            {redeemSuccess.message}
          </p>

          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: '10px',
            padding: '12px 16px',
            textAlign: 'left',
            fontSize: '0.85rem',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Voucher Code:</span>
              <strong style={{ fontFamily: 'monospace' }}>{redeemSuccess.voucher?.voucherCode}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-dim)' }}>Discount Applied:</span>
              <span style={{ color: '#FFB300', fontWeight: 700 }}>{redeemSuccess.voucher?.discountTitle}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Redeemed At:</span>
              <span>{new Date(redeemSuccess.voucher?.redeemedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          <button
            onClick={() => setRedeemSuccess(null)}
            className="btn btn-secondary btn-sm"
          >
            Redeem Another Voucher
          </button>
        </div>
      )}
    </div>
  );
}
