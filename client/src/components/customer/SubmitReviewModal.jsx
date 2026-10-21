import React, { useState, useEffect, useRef } from 'react';
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
  const [foodPhoto, setFoodPhoto] = useState('');
  const [foodPhotoPreview, setFoodPhotoPreview] = useState('');
  const [uploadingFoodPhoto, setUploadingFoodPhoto] = useState(false);
  const [foodPhotoFileName, setFoodPhotoFileName] = useState('');
  const [foodPhotoError, setFoodPhotoError] = useState('');

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
  const [billError, setBillError] = useState(null);

  // Submission / Reward States
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [issuedVoucher, setIssuedVoucher] = useState(null);
  const modalContentRef = useRef(null);

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
      if (modalContentRef.current) {
        modalContentRef.current.scrollTop = 0;
      }
    } else {
      setFoodPhoto('');
      setFoodPhotoPreview('');
      setFoodPhotoFileName('');
      setFoodPhotoError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialRestaurant) {
      setSelectedRestId(initialRestaurant._id);
      setSelectedRest(initialRestaurant);
    }
  }, [initialRestaurant]);

  useEffect(() => {
    setSubmitError(null);
  }, [reviewMode]);

  const handleRestaurantSelect = (id) => {
    setSelectedRestId(id);
    const rest = restaurants.find(r => r._id === id);
    setSelectedRest(rest);
    // Reset checks
    setGeoCheckResult(null);
    setUserCoords(null);
    setGeoError(null);
    setReceiptFile(null);
    setReceiptPreview('');
    setOcrResult(null);
    setBillError(null);
    setSubmitError(null);
  };

  // --- 1. Live Location Verification Logic ---
  const handleGetLocation = () => {
    if (!selectedRest) {
      showToast('Please select a restaurant first', 'error');
      return;
    }

    if (!selectedRest.location?.lat || !selectedRest.location?.lng) {
      setGeoError('This restaurant does not have registered GPS coordinates.');
      return;
    }

    setLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please enable device location services.');
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
        let errorMsg = 'Unable to access your live location.';
        if (err.code === 1) {
          errorMsg = 'Location access denied. Please allow location permissions in your browser to verify physical presence at the restaurant.';
        } else if (err.code === 2) {
          errorMsg = 'Location unavailable. Please check that device GPS/location is turned on.';
        } else if (err.code === 3) {
          errorMsg = 'Location request timed out. Please try again.';
        } else if (err.message) {
          errorMsg = `Location access error: ${err.message}`;
        }
        setGeoError(errorMsg);
        showToast(errorMsg, 'error');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify location with server.');
      }
      setGeoCheckResult(data.verification);
      const effectiveRadius = data.restaurant?.geofenceRadiusMeters || selectedRest.geofenceRadiusMeters || 200;
      if (data.verification?.isWithinRadius) {
        showToast(`📍 Location verified! You are at ${selectedRest.name} (${Math.round(data.verification.distanceMeters)}m from registered location).`, 'success');
      } else {
        const dist = Math.round(data.verification?.distanceMeters || 0);
        showToast(`Proximity check failed: You are ${dist}m away from ${selectedRest.name}. You must be physically at the registered restaurant location (within ${effectiveRadius}m) to submit.`, 'error');
      }
    } catch (e) {
      setGeoError(e.message || 'Failed to verify location with server.');
      setGeoCheckResult(null);
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
    setBillError(null);
    setSubmitError(null);

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
      if (!res.ok) throw new Error(data.error || 'The bill is invalid.');

      if (data.ocrResult && data.ocrResult.isBillVerified === false) {
        const invalidMsg = `The bill is invalid. The uploaded receipt could not be verified for ${selectedRest.name}.`;
        setBillError(invalidMsg);
        showToast('⚠️ The bill is invalid. Please upload a valid dining receipt.', 'error');
        setOcrResult(null);
        return;
      }

      setOcrResult(data);
      setBillError(null);
      showToast('🧾 Bill receipt verified successfully!', 'success');
    } catch (err) {
      const errText = err.message?.includes('bill is invalid')
        ? 'The bill is invalid. Please upload a valid dining receipt.'
        : (err.message || 'The bill is invalid.');
      setBillError(errText);
      showToast(`⚠️ ${errText}`, 'error');
      setOcrResult(null);
    } finally {
      setOcrScanning(false);
    }
  };

  // --- Food Photo Upload Handler ---
  const handleFoodPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext) && !file.type.match(/^image\/(jpeg|png)$/)) {
      setFoodPhotoError('Please upload a JPG or PNG image only.');
      showToast('⚠️ Please upload a JPG or PNG image only.', 'error');
      return;
    }

    setFoodPhotoError('');
    const previewUrl = URL.createObjectURL(file);
    setFoodPhotoPreview(previewUrl);
    setFoodPhotoFileName(file.name);
    setUploadingFoodPhoto(true);

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await fetch('/api/reviews/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        setFoodPhoto(data.url);
        showToast('📸 Food photo uploaded successfully!', 'success');
      } else {
        throw new Error('Upload failed');
      }
    } catch {
      // Fallback: convert file to data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoodPhoto(reader.result);
        showToast('📸 Food photo attached!', 'success');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingFoodPhoto(false);
    }
  };

  const handleRemoveFoodPhoto = () => {
    setFoodPhoto('');
    setFoodPhotoPreview('');
    setFoodPhotoFileName('');
    setFoodPhotoError('');
  };

  // --- 3. Final Submission & Voucher Issuance ---
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedRest) {
      const msg = 'Please select a restaurant first.';
      setSubmitError(msg);
      showToast(msg, 'error');
      return;
    }

    // 1. Live location mode validation
    if (reviewMode === 'live_location') {
      if (!userCoords || !geoCheckResult) {
        const msg = 'You are not in the restaurant location. Please click "Access Live Location" to verify your dining location.';
        setSubmitError(msg);
        showToast(`⚠️ ${msg}`, 'error');
        return;
      }
      if (!geoCheckResult.isWithinRadius) {
        const distance = Math.round(geoCheckResult.distanceMeters || 0);
        const msg = `You are not in the restaurant location. You are currently ${distance}m away from ${selectedRest.name}. Reviews by live location can only be submitted when physically at the restaurant.`;
        setSubmitError(msg);
        showToast(`⚠️ ${msg}`, 'error');
        return;
      }
    }

    // 2. Bill proof mode validation
    if (reviewMode === 'bill_proof') {
      if (!receiptFile || !ocrResult) {
        const msg = 'The bill is invalid. Please upload a valid restaurant dining receipt before submitting.';
        setSubmitError(msg);
        showToast(`⚠️ ${msg}`, 'error');
        return;
      }
      if (ocrResult.ocrResult && ocrResult.ocrResult.isBillVerified === false) {
        const msg = `The bill is invalid. The uploaded receipt could not be verified for ${selectedRest.name}.`;
        setSubmitError(msg);
        showToast(`⚠️ ${msg}`, 'error');
        return;
      }
    }

    // 3. Review comment validation
    if (!comment.trim()) {
      const msg = 'Please enter your review feedback comment.';
      setSubmitError(msg);
      showToast(msg, 'error');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        restaurantId: selectedRest._id,
        rating,
        comment: comment.trim(),
        photos: foodPhoto ? [foodPhoto] : [],
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
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <div
        ref={modalContentRef}
        className="modal-card"
        style={{
          maxWidth: '660px',
          width: '100%',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '28px',
          margin: 'auto',
          position: 'relative',
        }}
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
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10B981',
                    borderRadius: '10px',
                    padding: '14px',
                    color: '#6EE7B7',
                    fontSize: '0.88rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={24} color="#10B981" style={{ flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#FFF' }}>At Restaurant Location – Verified!</div>
                        <div style={{ fontSize: '0.78rem', color: '#A7F3D0', marginTop: '2px' }}>
                          You are {Math.round(geoCheckResult.distanceMeters)}m from {selectedRest?.name} (within registered {selectedRest?.geofenceRadiusMeters || 200}m radius). Ready to submit!
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', gap: '4px' }}
                      title="Re-verify your live location"
                    >
                      <RefreshCw size={12} className={locating ? 'pulse-radar' : ''} />
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                      Verify you are physically dining at <strong>{selectedRest?.name}</strong> at its registered location. Click below to access your live GPS coordinates.
                    </p>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={locating}
                        className="btn btn-primary btn-sm"
                        style={{ gap: '8px', padding: '10px 18px', fontWeight: 700 }}
                      >
                        {locating ? <RefreshCw className="pulse-radar" size={15} /> : <MapPin size={15} />}
                        {locating ? 'Accessing Live Location...' : 'Access Live Location'}
                      </button>
                    </div>

                    {geoCheckResult && !geoCheckResult.isWithinRadius && (
                      <div style={{
                        marginTop: '14px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid #EF4444',
                        borderRadius: '10px',
                        padding: '12px',
                        color: '#FCA5A5',
                        fontSize: '0.84rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}>
                        <AlertCircle size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: 700, color: '#FFF' }}>Outside Restaurant Location</div>
                          <div style={{ fontSize: '0.78rem', marginTop: '3px', lineHeight: 1.4 }}>
                            You are <strong>{Math.round(geoCheckResult.distanceMeters)}m</strong> away from {selectedRest?.name}. Reviews by live location can only be submitted when you are physically at the registered restaurant location (within {selectedRest?.geofenceRadiusMeters || 200}m radius).
                          </div>
                        </div>
                      </div>
                    )}

                    {geoError && (
                      <div style={{
                        marginTop: '12px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        color: '#EF4444',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
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
                      onClick={() => { setOcrResult(null); setReceiptFile(null); setBillError(null); }}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Change Photo
                    </button>
                  </div>
                )}

                {billError && (
                  <div style={{
                    marginTop: '12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    color: '#EF4444',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{billError}</span>
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
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>5. Upload Food Photo (JPG or PNG)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>Optional</span>
                </label>

                {!foodPhoto && !foodPhotoPreview ? (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '20px 16px',
                      border: '2px dashed var(--border-medium)',
                      borderRadius: '12px',
                      cursor: uploadingFoodPhoto ? 'wait' : 'pointer',
                      background: 'rgba(255, 255, 255, 0.02)',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-medium)'; }}
                  >
                    {uploadingFoodPhoto ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <RefreshCw className="pulse-radar" size={26} color="var(--primary)" />
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--primary)' }}>Uploading food photo...</span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={28} color="var(--primary)" style={{ marginBottom: '6px' }} />
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Click to Upload Food Photo</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Supports JPG, JPEG, or PNG format
                        </span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      disabled={uploadingFoodPhoto}
                      onChange={handleFoodPhotoChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <img
                        src={foodPhotoPreview || foodPhoto}
                        alt="Food Preview"
                        style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontWeight: 700, fontSize: '0.85rem' }}>
                          <CheckCircle2 size={16} /> Food Photo Attached
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {foodPhotoFileName || 'food-photo.jpg'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <label
                        className="btn btn-ghost btn-sm"
                        style={{ cursor: 'pointer', fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Change
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          disabled={uploadingFoodPhoto}
                          onChange={handleFoodPhotoChange}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveFoodPhoto}
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#EF4444' }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                {foodPhotoError && (
                  <div style={{
                    marginTop: '8px',
                    color: '#EF4444',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <AlertCircle size={14} />
                    <span>{foodPhotoError}</span>
                  </div>
                )}
              </div>

              {/* Submission Warning Display */}
              {submitError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid #EF4444',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginTop: '16px',
                  color: '#FCA5A5',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  animation: 'fadeIn 0.2s ease-in-out',
                }}>
                  <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#FFF' }}>Submission Warning</div>
                    <div style={{ fontSize: '0.82rem', marginTop: '2px', lineHeight: 1.4 }}>{submitError}</div>
                  </div>
                </div>
              )}

              {/* Form Action Buttons: Cancellation & Submit */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: '12px',
                marginTop: '18px',
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary btn-lg"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 700,
                  }}
                >
                  <X size={18} /> Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: 700,
                  }}
                >
                  {submitting ? 'Submitting & Issuing Voucher...' : '✨ Submit Review & Claim Gift Voucher'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
