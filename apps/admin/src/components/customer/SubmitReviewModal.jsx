import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  X, MapPin, Receipt, Camera, CheckCircle2, AlertCircle, Sparkles,
  Gift, RefreshCw, UploadCloud, ChevronRight, Star, ShieldCheck
} from 'lucide-react';
import StarRating from '../common/StarRating';

export default function SubmitReviewModal({ isOpen, onClose, initialRestaurant = null, onVoucherEarned }) {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestId, setSelectedRestId] = useState(initialRestaurant?._id || '');
  const [selectedRest, setSelectedRest] = useState(initialRestaurant);
  
  // Verification Segment: 'live_location' | 'bill_proof'
  const [reviewMode, setReviewMode] = useState('live_location');

  // Form Fields
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  // Live Location States
  const [locating, setLocating] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [geoCheckResult, setGeoCheckResult] = useState(null);
  const [geoError, setGeoError] = useState(null);

  // Bill Proof States
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  // Submission / Reward States
  const [submitting, setSubmitting] = useState(false);
  const [issuedVoucher, setIssuedVoucher] = useState(null);

  useEffect(() => {
    async function loadRestaurants() {
      try {
        const res = await fetch('/api/restaurants');
        const data = await res.json();
        setRestaurants(data.restaurants || []);
        if (!selectedRestId && data.restaurants?.length > 0) {
          setSelectedRestId(data.restaurants[0]._id);
          setSelectedRest(data.restaurants[0]);
        }
      } catch (e) {
        console.error('Error fetching restaurants for review:', e);
      }
    }
    if (isOpen) {
      loadRestaurants();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialRestaurant) {
      setSelectedRestId(initialRestaurant._id);
      setSelectedRest(initialRestaurant);
    }
  }, [initialRestaurant]);

  const handleRestaurantSelect = (id) => {
    setSelectedRestId(id);
    const rest = restaurants.find(r => r._id === id);
    setSelectedRest(rest);
    // Reset checks
    setGeoCheckResult(null);
    setOcrResult(null);
  };

  // --- 1. Live Location Verification Logic ---
  const handleGetLocation = (simulate = false) => {
    if (!selectedRest) {
      showToast('Please select a restaurant first', 'error');
      return;
    }

    setLocating(true);
    setGeoError(null);

    if (simulate) {
      // Simulate sitting right at the table (with a tiny 5-meter realistic variation)
      const rLat = selectedRest.location.lat;
      const rLng = selectedRest.location.lng;
      const simCoords = {
        lat: rLat + (Math.random() - 0.5) * 0.0001,
        lng: rLng + (Math.random() - 0.5) * 0.0001,
      };
      setUserCoords(simCoords);
      verifyProximityWithBackend(simCoords.lat, simCoords.lng);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. You can use the "Simulate At Restaurant" option to test.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoords(coords);
        verifyProximityWithBackend(coords.lat, coords.lng);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoError(`Location access error: ${err.message}. Click "Simulate At Location" to test verification.`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const verifyProximityWithBackend = async (lat, lng) => {
    try {
      const res = await fetch('/api/reviews/verify-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          restaurantId: selectedRest._id,
          userLat: lat,
          userLng: lng,
        }),
      });
      const data = await res.json();
      setGeoCheckResult(data.verification);
      if (data.verification?.isWithinRadius) {
        showToast(`📍 Proximity verified! (${Math.round(data.verification.distanceMeters)}m from restaurant)`, 'success');
      } else {
        showToast(`Outside geofence radius (${Math.round(data.verification.distanceMeters)}m away). Use simulation to test.`, 'error');
      }
    } catch (e) {
      setGeoError('Failed to verify location with server.');
    } finally {
      setLocating(false);
    }
  };

  // --- 2. Bill Proof Receipt Verification Logic ---
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedRest) {
      showToast('Please select a restaurant first', 'error');
      return;
    }

    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setOcrScanning(true);
    setOcrResult(null);

    const formData = new FormData();
    formData.append('receiptImage', file);
    formData.append('restaurantId', selectedRest._id);

    try {
      const res = await fetch('/api/reviews/verify-bill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Receipt scan failed');

      setOcrResult(data);
      showToast('🧾 Bill receipt verified successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Receipt analysis failed', 'error');
    } finally {
      setOcrScanning(false);
    }
  };

  // --- 3. Final Submission & Voucher Issuance ---
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedRest) {
      showToast('Please select a restaurant', 'error');
      return;
    }

    if (reviewMode === 'live_location' && (!geoCheckResult || !geoCheckResult.isWithinRadius)) {
      showToast('Please complete live location proximity verification before submitting.', 'error');
      return;
    }

    if (reviewMode === 'bill_proof' && !ocrResult) {
      showToast('Please upload a bill receipt image for OCR verification first.', 'error');
      return;
    }

    if (!comment.trim()) {
      showToast('Please enter your review feedback comment.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        restaurantId: selectedRest._id,
        rating,
        comment: comment.trim(),
        photos: photoUrl ? [photoUrl] : [],
        verificationType: reviewMode,
        userLocation: userCoords,
        billData: ocrResult ? {
          billImageUrl: ocrResult.billImageUrl,
          extractedText: ocrResult.ocrResult?.extractedText,
          matchedRestaurantName: ocrResult.ocrResult?.hasNameMatch,
          detectedDate: ocrResult.ocrResult?.detectedDate,
        } : null,
      };

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      // Trigger Confetti Party!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF5A36', '#FFB300', '#10B981', '#8B5CF6'],
      });

      setIssuedVoucher(data.voucher);
      showToast('🎉 Review verified! Reward voucher added to your wallet!', 'reward');

      if (onVoucherEarned) {
        onVoucherEarned(data.voucher);
      }
    } catch (err) {
      showToast(err.message || 'Error submitting review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px', padding: '28px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success / Reward Voucher Celebration View */}
        {issuedVoucher ? (
          <div style={{ textAlign: 'center', padding: '16px 0', animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
              fontSize: '2rem',
            }}>
              🎁
            </div>

            <span className="badge badge-voucher" style={{ marginBottom: '10px' }}>
              VERIFIED REWARD UNLOCKED
            </span>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '8px' }}>
              Thank You for Your Verified Review!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '8px auto 20px' }}>
              Your review for <strong>{selectedRest?.name}</strong> has been verified. We have auto-issued a gift voucher to your wallet!
            </p>

            {/* Issued Voucher Showcase Card */}
            <div style={{
              background: 'linear-gradient(135deg, #1A2438 0%, #2A1F45 100%)',
              border: '2px dashed #FFB300',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '460px',
              margin: '0 auto 24px',
              textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#FFB300', fontWeight: 700, textTransform: 'uppercase' }}>
                  {issuedVoucher.restaurantName}
                </span>
                <span className="badge badge-live">Active in Wallet</span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFF', margin: '4px 0' }}>
                {issuedVoucher.discountTitle}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '0.85rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 700, color: '#FCD34D' }}>
                  CODE: {issuedVoucher.voucherCode}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Valid for 30 days
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={onClose} className="btn btn-secondary">
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onVoucherEarned) onVoucherEarned(issuedVoucher, true);
                }}
                className="btn btn-primary"
              >
                <Gift size={16} /> Open Voucher Wallet
              </button>
            </div>
          </div>
        ) : (
          /* Main Review Submission Form */
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>Submit Verified Review</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Choose a verification method to earn an instant restaurant gift voucher
                </p>
              </div>
              <button onClick={onClose} className="btn-ghost" style={{ padding: '6px', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Restaurant Picker */}
            <div className="form-group">
              <label className="form-label">1. Select Restaurant</label>
              <select
                className="form-select"
                value={selectedRestId}
                onChange={(e) => handleRestaurantSelect(e.target.value)}
              >
                {restaurants.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} — {r.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Choose Verification Segment (Live Location vs Bill Proof) */}
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                2. Choose Verification Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Segment A: Live Location */}
                <div
                  onClick={() => setReviewMode('live_location')}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: `2px solid ${reviewMode === 'live_location' ? '#10B981' : 'var(--border-medium)'}`,
                    background: reviewMode === 'live_location' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <MapPin size={18} color="#10B981" />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFF' }}>Live Location</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    GPS proximity check at the table (Geofence radar)
                  </p>
                </div>

                {/* Segment B: Bill Proof */}
                <div
                  onClick={() => setReviewMode('bill_proof')}
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    border: `2px solid ${reviewMode === 'bill_proof' ? '#3B82F6' : 'var(--border-medium)'}`,
                    background: reviewMode === 'bill_proof' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Receipt size={18} color="#60A5FA" />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFF' }}>Bill Proof</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Photo receipt upload with instant OCR text validation
                  </p>
                </div>
              </div>
            </div>

            {/* Segment A Verification Box: Live Location */}
            {reviewMode === 'live_location' && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>GPS Geofence Check</span>
                    <span className="badge badge-live">Radius: {selectedRest?.geofenceRadiusMeters || 200}m</span>
                  </div>
                </div>

                {geoCheckResult?.isWithinRadius ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10B981',
                    borderRadius: '10px',
                    padding: '12px',
                    color: '#6EE7B7',
                    fontSize: '0.88rem',
                  }}>
                    <CheckCircle2 size={22} color="#10B981" />
                    <div>
                      <div style={{ fontWeight: 700, color: '#FFF' }}>Location Proximity Verified!</div>
                      <div style={{ fontSize: '0.78rem' }}>
                        You are {Math.round(geoCheckResult.distanceMeters)}m from {selectedRest?.name}. Ready to submit!
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Verify you are physically dining at <strong>{selectedRest?.name}</strong> using your browser's GPS or click simulate.
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => handleGetLocation(false)}
                        disabled={locating}
                        className="btn btn-secondary btn-sm"
                      >
                        {locating ? <RefreshCw className="pulse-radar" size={14} /> : <MapPin size={14} />}
                        Detect My GPS Location
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGetLocation(true)}
                        disabled={locating}
                        className="btn btn-success btn-sm"
                        title="Simulate being at the restaurant coordinates for testing"
                      >
                        <Sparkles size={14} /> Simulate At Restaurant (Demo)
                      </button>
                    </div>

                    {geoError && (
                      <div style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: '8px', display: 'flex', gap: '6px' }}>
                        <AlertCircle size={14} />
                        <span>{geoError}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Segment B Verification Box: Bill Proof OCR */}
            {reviewMode === 'bill_proof' && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Upload Receipt / Bill Photo</span>
                  <span className="badge badge-bill">OCR Verification</span>
                </div>

                {!ocrResult ? (
                  <div>
                    <label style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px',
                      border: '2px dashed var(--border-medium)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.02)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {ocrScanning ? (
                        <>
                          <div className="laser-scanner" />
                          <RefreshCw className="pulse-radar" size={32} color="#3B82F6" style={{ marginBottom: '10px' }} />
                          <span style={{ fontWeight: 700, color: '#60A5FA' }}>Analyzing Receipt with OCR...</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Extracting restaurant name & transaction date
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={36} color="var(--primary)" style={{ marginBottom: '10px' }} />
                          <span style={{ fontWeight: 700 }}>Click or Drag Receipt Photo Here</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Supports PNG, JPG, WebP receipt images
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={ocrScanning}
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid #3B82F6',
                    borderRadius: '10px',
                    padding: '12px',
                  }}>
                    {receiptPreview && (
                      <img
                        src={receiptPreview}
                        alt="Receipt Preview"
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA', fontWeight: 700, fontSize: '0.88rem' }}>
                        <CheckCircle2 size={16} /> Bill Proof Verified
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Detected Date: <strong>{ocrResult.ocrResult?.detectedDate || 'Recent'}</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setOcrResult(null); setReceiptFile(null); }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Change Photo
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Review Content Form (Rating + Comment) */}
            <form onSubmit={handleSubmitReview}>
              <div className="form-group">
                <label className="form-label">3. Overall Dining Rating</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <StarRating
                    rating={rating}
                    onRatingChange={(newVal) => setRating(newVal)}
                    size={28}
                  />
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#FFB300' }}>
                    {rating} Star{rating > 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">4. Your Verified Review Comment</label>
                <textarea
                  required
                  rows={3}
                  className="form-textarea"
                  placeholder="Share details about the flavor, service, atmosphere, or standout dishes..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">5. Optional Food Photo URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || (reviewMode === 'live_location' && !geoCheckResult?.isWithinRadius) || (reviewMode === 'bill_proof' && !ocrResult)}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '10px' }}
              >
                {submitting ? 'Submitting & Issuing Voucher...' : '✨ Submit Review & Claim Gift Voucher'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
