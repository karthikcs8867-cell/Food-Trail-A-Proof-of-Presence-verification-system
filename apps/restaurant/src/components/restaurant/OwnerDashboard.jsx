import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  TrendingUp, QrCode, Store, PlusCircle, ShieldCheck,
  CheckCircle, XCircle, RefreshCw, Sparkles, ExternalLink,
  Star, Users, Gift, IndianRupee, MapPin, Receipt,
  MessageSquare, Clock, ArrowUpRight, ChevronDown, ChevronUp,
  Building2, ArrowRight, UploadCloud, FileText, AlertTriangle
} from 'lucide-react';
import StarRating from '../common/StarRating';
import VoucherRedemption from './VoucherRedemption';
import RestaurantRegistration from './RestaurantRegistration';

export default function OwnerDashboard() {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  // All owner restaurants (for switcher)
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);

  // Analytics for selected restaurant
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Pending restaurants for approvals
  const [pendingRestaurants, setPendingRestaurants] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // UI toggles
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showVoucherTerminal, setShowVoucherTerminal] = useState(false);

  // Bill upload for existing restaurant
  const [uploadingBillForRestId, setUploadingBillForRestId] = useState(null);
  const [activeUploadTargetId, setActiveUploadTargetId] = useState(null);
  const billUploadInputRef = useRef(null);

  // Fetch analytics — optionally scoped to a single restaurant
  const fetchAnalytics = useCallback(async (restaurantId) => {
    try {
      setAnalyticsLoading(true);
      const url = restaurantId
        ? `/api/analytics/owner-dashboard?restaurantId=${encodeURIComponent(restaurantId)}`
        : '/api/analytics/owner-dashboard';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setAnalyticsData(data);
        // Update the master restaurant list from the response
        if (data.restaurants && data.restaurants.length > 0) {
          setAllRestaurants(data.restaurants);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token]);

  // Fetch owner's restaurants for pending approvals
  const fetchRestaurantsList = useCallback(async () => {
    try {
      setLoadingPending(true);
      const res = await fetch('/api/restaurants/owner/my-restaurants', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const rests = data.restaurants || [];
      setAllRestaurants(rests);
      setPendingRestaurants(rests.filter(r => r.isApproved === false));

      // Auto-select first restaurant if none selected
      if (!selectedRestaurantId && rests.length > 0) {
        setSelectedRestaurantId(rests[0]._id);
      }
    } catch (err) {
      console.error('Error loading restaurants:', err);
    } finally {
      setLoadingPending(false);
    }
  }, [token, selectedRestaurantId]);

  // Initial load
  useEffect(() => {
    fetchRestaurantsList();
  }, []);

  // Load analytics whenever selected restaurant changes
  useEffect(() => {
    if (selectedRestaurantId) {
      fetchAnalytics(selectedRestaurantId);
    }
  }, [selectedRestaurantId, fetchAnalytics]);

  const handleRefreshAll = () => {
    fetchRestaurantsList();
    if (selectedRestaurantId) {
      fetchAnalytics(selectedRestaurantId);
    }
    showToast('Dashboard refreshed', 'info');
  };

  const handleSwitchRestaurant = (restId) => {
    setSelectedRestaurantId(restId);
    setShowVoucherTerminal(false);
    setShowAddBranch(false);
  };

  const handleToggleApproval = async (restId, isApproved) => {
    try {
      const res = await fetch(`/api/restaurants/${restId}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isApproved }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update approval');
      showToast(data.message || 'Status updated!', 'success');
      fetchRestaurantsList();
      fetchAnalytics(selectedRestaurantId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTriggerBillUpload = (restId) => {
    setActiveUploadTargetId(restId);
    if (billUploadInputRef.current) {
      billUploadInputRef.current.value = '';
      billUploadInputRef.current.click();
    }
  };

  const handleBillFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const restId = activeUploadTargetId || selectedRestaurantId;
    if (!file || !restId) return;

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png'].includes(ext) && !file.type.match(/^image\/(jpeg|png)$/)) {
      showToast('Please upload an image in JPG or PNG format only.', 'error');
      return;
    }

    setUploadingBillForRestId(restId);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const uploadRes = await fetch('/api/restaurants/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      let billUrl = '';
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        billUrl = data.url;
      } else {
        billUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      const updateRes = await fetch(`/api/restaurants/${restId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ billImage: billUrl }),
      });

      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        throw new Error(updateData.error || 'Failed to update restaurant bill image.');
      }

      showToast('🎉 Restaurant bill uploaded successfully! Sent for verification.', 'success');
      await fetchRestaurantsList();
      if (selectedRestaurantId) {
        await fetchAnalytics(selectedRestaurantId);
      }
    } catch (err) {
      console.error('Error uploading bill:', err);
      showToast(err.message || 'Failed to upload bill.', 'error');
    } finally {
      setUploadingBillForRestId(null);
      setActiveUploadTargetId(null);
      if (e.target) e.target.value = '';
    }
  };

  const handleBranchRegistered = (newRestaurant) => {
    showToast('New outlet registered! Switching to it now…', 'success');
    setShowAddBranch(false);
    fetchRestaurantsList().then(() => {
      if (newRestaurant?._id) {
        setSelectedRestaurantId(newRestaurant._id);
      }
    });
  };

  const kpis = analyticsData?.kpis || {};
  const breakdown = analyticsData?.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const totalRatingCount = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const recentReviews = analyticsData?.recentReviews || [];
  const recentRedemptions = analyticsData?.recentRedemptions || [];

  const selectedRestaurant = allRestaurants.find(r => r._id === selectedRestaurantId);

  return (
    <div className="container" style={{ padding: '36px 24px 80px' }}>
      {/* Hidden file input for uploading bills for existing restaurants */}
      <input
        type="file"
        ref={billUploadInputRef}
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={handleBillFileSelected}
      />
      {/* ═══════════════════════════════════════════════════════ */}
      {/* TOP WELCOME BANNER                                     */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(19, 27, 42, 0.9) 0%, rgba(38, 28, 54, 0.9) 100%)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-role">Restaurant Owner Portal</span>
            {allRestaurants.length > 0 && (
              <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.72rem' }}>
                {allRestaurants.length} {allRestaurants.length === 1 ? 'Outlet' : 'Outlets'}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>
            Welcome, {user?.name || 'Chef'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Review analytics, manage voucher redemptions, and register new outlets.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={handleRefreshAll} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowVoucherTerminal(!showVoucherTerminal)} className="btn btn-primary btn-sm">
            <QrCode size={16} /> {showVoucherTerminal ? 'Hide Terminal' : 'QR Redemption'}
          </button>
          <button onClick={() => setShowAddBranch(!showAddBranch)} className="btn btn-secondary btn-sm">
            <PlusCircle size={16} /> Register New Outlet
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* OUTLET SWITCHER                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {allRestaurants.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '24px',
        }}>
          {allRestaurants.map((rest) => {
            const isSelected = rest._id === selectedRestaurantId;
            return (
              <button
                key={rest._id}
                onClick={() => handleSwitchRestaurant(rest._id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-lg)',
                  border: isSelected
                    ? '2px solid #FF5A36'
                    : '1px solid var(--border-subtle)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(255,90,54,0.12) 0%, rgba(255,179,0,0.08) 100%)'
                    : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  minWidth: '180px',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: isSelected
                    ? 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)'
                    : 'var(--bg-surface-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', flexShrink: 0,
                }}>
                  <Building2 size={18} color={isSelected ? '#fff' : 'var(--text-muted)'} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{
                    fontWeight: 800, fontSize: '0.88rem',
                    color: isSelected ? '#FFF' : 'var(--text-muted)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: '160px',
                  }}>
                    {rest.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {rest.isApproved ? (
                      <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle size={10} /> Approved
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#FFB300', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> Pending
                      </span>
                    )}
                    {rest.billImage ? (
                      <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        • Bill ✓
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                        • Bill ⚠️
                      </span>
                    )}
                    {rest.cuisine && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        • {rest.cuisine.slice(0, 2).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {/* Quick add button inline */}
          <button
            onClick={() => setShowAddBranch(!showAddBranch)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '12px 20px', borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border-medium)',
              background: 'transparent', cursor: 'pointer',
              color: 'var(--text-dim)', fontSize: '0.85rem', fontWeight: 700,
              transition: 'all 0.2s ease', flexShrink: 0,
            }}
          >
            <PlusCircle size={16} /> Add Outlet
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* REGISTER NEW OUTLET (collapsible panel)               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showAddBranch && (
        <div id="register-outlet-section" style={{
          marginBottom: '28px',
          animation: 'slideUp 0.25s ease-out',
          background: 'linear-gradient(135deg, rgba(255,90,54,0.04) 0%, rgba(255,179,0,0.02) 100%)',
          border: '1px solid rgba(255,90,54,0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} color="#FF5A36" /> Register New Outlet
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Each outlet gets its own geofence, analytics, reviews, and admin approval.
              </p>
            </div>
            <button
              onClick={() => setShowAddBranch(false)}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--text-dim)' }}
            >
              ✕ Close
            </button>
          </div>
          <RestaurantRegistration onRestaurantSaved={handleBranchRegistered} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* VOUCHER REDEMPTION TERMINAL (collapsible)              */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showVoucherTerminal && (
        <div className="voucher-terminal-panel" style={{ marginBottom: '32px', animation: 'slideUp 0.25s ease-out' }}>
          <VoucherRedemption />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SELECTED OUTLET HEADER                                 */}
      {/* ═══════════════════════════════════════════════════════ */}
      {selectedRestaurant && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '16px 20px', marginBottom: selectedRestaurant.billImage ? '24px' : '14px',
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
        }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem', flexShrink: 0,
          }}>
            🏪
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0 }}>{selectedRestaurant.name}</h2>
              {selectedRestaurant.isApproved ? (
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}><CheckCircle size={10} /> Live</span>
              ) : (
                <span className="badge" style={{ background: 'rgba(255,179,0,0.15)', color: '#FFB300', fontSize: '0.7rem' }}><Clock size={10} /> Pending Approval</span>
              )}
              {selectedRestaurant.billImage ? (
                <a
                  href={selectedRestaurant.billImage}
                  target="_blank"
                  rel="noreferrer"
                  className="badge"
                  style={{
                    background: 'rgba(16,185,129,0.15)', color: '#10B981', fontSize: '0.7rem',
                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                  }}
                  title="View uploaded verification bill"
                >
                  <FileText size={10} /> Bill Uploaded
                </a>
              ) : (
                <span
                  className="badge"
                  style={{
                    background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.7rem',
                    display: 'inline-flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <AlertTriangle size={10} /> Bill Missing
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              📍 {selectedRestaurant.address} • {selectedRestaurant.cuisine?.join(', ')} • {selectedRestaurant.priceRange}
            </div>
          </div>
          {!selectedRestaurant.billImage && (
            <button
              id="btn-quick-upload-bill"
              onClick={() => handleTriggerBillUpload(selectedRestaurant._id)}
              disabled={uploadingBillForRestId === selectedRestaurant._id}
              className="btn btn-sm"
              style={{
                background: 'linear-gradient(135deg, #FF5A36, #FF8C00)',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(255, 90, 54, 0.35)',
                cursor: 'pointer',
              }}
            >
              <UploadCloud size={15} />
              {uploadingBillForRestId === selectedRestaurant._id ? 'Uploading Bill…' : 'Upload Bill for Verification'}
            </button>
          )}
        </div>
      )}

      {/* Bill missing warning banner if current restaurant has no bill */}
      {selectedRestaurant && !selectedRestaurant.billImage && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          padding: '16px 20px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(255, 90, 54, 0.12) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--radius-lg)',
          animation: 'fadeIn 0.3s ease-in-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '260px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#EF4444', flexShrink: 0,
            }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Official Restaurant Bill Required for Verification</span>
                <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>ACTION REQUIRED</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                This outlet was registered without an official bill image. Upload a clear printed restaurant bill / receipt so admin can verify and activate your restaurant on FoodTrail.
              </div>
            </div>
          </div>
          <button
            id="btn-upload-missing-bill-banner"
            onClick={() => handleTriggerBillUpload(selectedRestaurant._id)}
            disabled={uploadingBillForRestId === selectedRestaurant._id}
            className="btn btn-primary"
            style={{
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(255, 90, 54, 0.4)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <UploadCloud size={16} />
            {uploadingBillForRestId === selectedRestaurant._id ? 'Uploading Bill…' : 'Upload Bill for Verification'}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* KPI METRICS ROW (per selected outlet)                  */}
      {/* ═══════════════════════════════════════════════════════ */}
      {analyticsLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Loading analytics...
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}>
            {/* Average Rating */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVERAGE RATING</span>
                <div style={{ padding: '8px', background: 'rgba(255, 179, 0, 0.15)', borderRadius: '8px' }}>
                  <Star size={18} color="#FFB300" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF' }}>
                  {kpis.avgRating ? kpis.avgRating.toFixed(1) : '—'}
                </span>
                <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 700 }}>★ 100% Verified</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Across {kpis.totalReviews || 0} customer reviews
              </div>
            </div>

            {/* Verified Reviews */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>VERIFIED REVIEWS</span>
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px' }}>
                  <Users size={18} color="#10B981" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF' }}>
                {kpis.totalReviews || 0}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.75rem' }}>
                <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>📍 {kpis.liveLocationCount || 0} Live GPS</span>
                <span className="badge badge-bill" style={{ fontSize: '0.7rem' }}>🧾 {kpis.billProofCount || 0} Bills</span>
              </div>
            </div>

            {/* Reward Vouchers */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>VOUCHERS REDEEMED</span>
                <div style={{ padding: '8px', background: 'rgba(255, 90, 54, 0.15)', borderRadius: '8px' }}>
                  <Gift size={18} color="#FF5A36" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF' }}>
                  {kpis.totalVouchersRedeemed || 0} <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>/ {kpis.totalVouchersIssued || 0}</span>
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600, marginTop: '4px' }}>
                {kpis.redemptionRate || 0}% Redemption Rate
              </div>
            </div>

            {/* Estimated Revenue Impact */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>EST. REVENUE IMPACT</span>
                <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '8px' }}>
                  <IndianRupee size={18} color="#8B5CF6" />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF' }}>
                ₹{kpis.estimatedRevenueImpact || 0}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Attributed to repeat voucher dining
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* RATING DISTRIBUTION & RECENT REVIEWS                   */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1.4fr)',
            gap: '24px',
            marginBottom: '28px',
          }}>
            {/* Rating Breakdown */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={18} color="#FFB300" /> Rating Distribution
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = breakdown[star] || 0;
                  const pct = Math.round((count / totalRatingCount) * 100);
                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
                      <span style={{ width: '54px', fontWeight: 600 }}>{star} Stars</span>
                      <div style={{
                        flex: 1, height: '10px',
                        background: 'var(--bg-surface)', borderRadius: '5px', overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`, height: '100%',
                          background: star >= 4 ? 'linear-gradient(90deg, #FFB300, #FF5A36)' : star === 3 ? '#64748B' : '#EF4444',
                          borderRadius: '5px', transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ width: '40px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: '24px', padding: '14px',
                background: 'var(--bg-surface)', borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.82rem', color: 'var(--text-muted)',
              }}>
                💡 <strong>Anti-Spam Guarantee:</strong> 100% of reviews on FoodTrail are authenticated with geofence proximity or OCR receipt verification.
              </div>
            </div>

            {/* Recent Verified Reviews */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} color="#10B981" /> Recent Verified Reviews
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest stream</span>
              </div>

              {recentReviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p>No reviews recorded yet for this outlet.</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>Reviews will appear here once customers visit and review this restaurant.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto' }}>
                  {recentReviews.map((rev) => (
                    <div key={rev._id} style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px', padding: '14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{rev.userName}</span>
                          <StarRating rating={rev.rating} size={13} />
                        </div>
                        {rev.verificationType === 'live_location' ? (
                          <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>
                            <MapPin size={10} /> Live GPS
                          </span>
                        ) : (
                          <span className="badge badge-bill" style={{ fontSize: '0.65rem' }}>
                            <Receipt size={10} /> Bill Proof
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        "{rev.comment}"
                      </p>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                        {new Date(rev.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* REDEEMED VOUCHERS SECTION                               */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gift size={18} color="#FF5A36" /> Redeemed Vouchers
              </h3>
              <button onClick={() => setShowVoucherTerminal(!showVoucherTerminal)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
                <QrCode size={14} /> {showVoucherTerminal ? 'Hide Terminal' : 'Open Redemption Terminal'}
              </button>
            </div>

            {recentRedemptions.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: 'var(--bg-surface)', borderRadius: '12px',
              }}>
                <Gift size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} color="var(--text-dim)" />
                <h4 style={{ fontWeight: 700, marginBottom: '4px' }}>No vouchers redeemed yet</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  When customers redeem their reward vouchers at this outlet, they'll appear here.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                  <thead>
                    <tr style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>VOUCHER CODE</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>DISCOUNT</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>CUSTOMER</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>REDEEMED AT</th>
                      <th style={{ padding: '8px 12px', fontWeight: 700 }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRedemptions.map((v) => (
                      <tr key={v._id} style={{ background: 'var(--bg-surface)', borderRadius: '10px' }}>
                        <td style={{
                          padding: '12px', fontFamily: 'monospace', fontWeight: 800,
                          color: '#FCD34D', borderRadius: '10px 0 0 10px',
                        }}>
                          {v.voucherCode}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 600 }}>{v.discountTitle || '—'}</td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{v.customerName || 'Verified Diner'}</td>
                        <td style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                          {v.redeemedAt ? new Date(v.redeemedAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '12px', borderRadius: '0 10px 10px 0' }}>
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                            <CheckCircle size={10} /> Redeemed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ADMIN APPROVALS — ALL OUTLETS                          */}
          {/* ═══════════════════════════════════════════════════════ */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#8B5CF6" /> All Outlets — Approval Status
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>
                  Track the approval status of all your outlets
                </p>
              </div>
              <button onClick={() => { fetchRestaurantsList(); }} className="btn btn-ghost btn-sm" disabled={loadingPending}>
                <RefreshCw size={15} className={loadingPending ? 'pulse-radar' : ''} /> Refresh
              </button>
            </div>

            {allRestaurants.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: 'var(--bg-surface)', borderRadius: '12px',
              }}>
                <Store size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} color="var(--text-dim)" />
                <h4 style={{ fontWeight: 700 }}>No outlets registered</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Register your first outlet to see its approval status here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {allRestaurants.map((rest) => {
                  const isCurrent = rest._id === selectedRestaurantId;
                  return (
                    <div
                      key={rest._id}
                      onClick={() => handleSwitchRestaurant(rest._id)}
                      style={{
                        background: isCurrent ? 'rgba(255,90,54,0.05)' : 'var(--bg-surface)',
                        border: `1px solid ${isCurrent ? 'rgba(255,90,54,0.3)' : rest.isApproved ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FFF' }}>{rest.name}</span>
                          {isCurrent && (
                            <span className="badge" style={{ background: 'rgba(255,90,54,0.15)', color: '#FF5A36', fontSize: '0.65rem' }}>
                              Currently Viewing
                            </span>
                          )}
                          {rest.isApproved ? (
                            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                              <CheckCircle size={10} /> Approved
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontSize: '0.7rem' }}>
                              <Clock size={10} /> Pending Review
                            </span>
                          )}
                          {rest.billImage ? (
                            <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10B981', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle size={9} /> Bill Attached
                            </span>
                          ) : (
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AlertTriangle size={9} /> Bill Missing
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          📍 {rest.address}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {rest.cuisine?.join(', ')} • {rest.priceRange} • Geofence: {rest.geofenceRadiusMeters || 200}m • Menu: {rest.menuItems?.length || 0} items
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {!rest.billImage ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: 'linear-gradient(135deg, #FF5A36, #FF8C00)',
                              color: '#FFF',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              padding: '7px 13px',
                              border: 'none',
                              borderRadius: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(255,90,54,0.3)',
                              cursor: 'pointer',
                            }}
                            disabled={uploadingBillForRestId === rest._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerBillUpload(rest._id);
                            }}
                          >
                            <UploadCloud size={13} />
                            {uploadingBillForRestId === rest._id ? 'Uploading…' : 'Upload Bill for Verification'}
                          </button>
                        ) : (
                          <a
                            href={rest.billImage}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.78rem', color: '#10B981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileText size={12} /> View Bill
                          </a>
                        )}

                        {rest.isApproved ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', background: 'rgba(16,185,129,0.1)',
                            borderRadius: 'var(--radius-full)', fontSize: '0.82rem',
                            fontWeight: 700, color: '#10B981',
                          }}>
                            <CheckCircle size={14} /> Live on FoodTrail
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', background: 'rgba(255,179,0,0.1)',
                            borderRadius: 'var(--radius-full)', fontSize: '0.82rem',
                            fontWeight: 700, color: '#FFB300',
                          }}>
                            <Clock size={14} /> Awaiting Admin Approval
                          </div>
                        )}
                        {!isCurrent && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleSwitchRestaurant(rest._id); }}
                            style={{ fontSize: '0.78rem' }}
                          >
                            View Dashboard <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
