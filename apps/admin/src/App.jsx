import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useToast } from './context/ToastContext';
import {
  CheckCircle, XCircle, Clock, Users, Star, Store,
  FileText, RefreshCw, LogOut, Shield, BarChart2, Eye,
  UserPlus, Trash2, MapPin, AlertTriangle, Building2,
  ChevronRight, Filter, MessageSquare, Check, X, ShieldAlert, Award, Key
} from 'lucide-react';
import LoginPage from './LoginPage';

const STANDARD_REGIONS = [
  'Bagalkote',
  'Ballari',
  'Belagavi',
  'Bengaluru Rural',
  'Bengaluru Urban',
  'Bidar',
  'Chamarajanagar',
  'Chikkaballapur',
  'Chikkamagaluru',
  'Chitradurga',
  'Dakshina Kannada',
  'Davanagere',
  'Dharwad',
  'Gadag',
  'Hassan',
  'Haveri',
  'Kalaburagi',
  'Kodagu',
  'Kolar',
  'Koppal',
  'Mandya',
  'Mysuru',
  'Raichur',
  'Ramanagara',
  'Shivamogga',
  'Tumakuru',
  'Udupi',
  'Uttara Kannada',
  'Vijayanagara',
  'Vijayapura',
  'Yadgir',
];

// ────────────────────────────────────────────────────
// Stat Card Component
// ────────────────────────────────────────────────────
function StatCard({ label, value, icon, color = '#FF5A36', subtitle }) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: '8px' }}>
            {label.toUpperCase()}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{value ?? '—'}</div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {React.cloneElement(icon, { color, size: 22 })}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Admin Dashboard Component
// ────────────────────────────────────────────────────
function AdminDashboard({ user, token }) {
  const { showToast } = useToast();
  const isSuperAdmin = user.role === 'admin';
  const assignedRegion = user.assignedRegion || user.region || 'Bengaluru Urban';

  // Filters & Tabs
  const [tab, setTab]                       = useState('restaurants');
  const [selectedRegion, setSelectedRegion] = useState(isSuperAdmin ? 'All' : assignedRegion);
  const [restaurants, setRests]             = useState([]);
  const [regionalAdmins, setRegionalAdmins] = useState([]);
  const [users, setUsers]                   = useState([]);
  const [reviews, setReviews]               = useState([]);
  const [loading, setLoading] = useState(false);
  // Voucher discount config modal state
  const [showDiscountConfigModal, setShowDiscountConfigModal] = useState(false);
  const [configPercent, setConfigPercent] = useState('10'); // default
  const [configAmount, setConfigAmount] = useState('100'); // default
  const [configSaving, setConfigSaving] = useState(false);

  // Create Regional Admin Modal State
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [adminName, setAdminName]         = useState('');
  const [adminEmail, setAdminEmail]       = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminRegion, setAdminRegion]     = useState('Bengaluru Urban');
  const [customRegion, setCustomRegion]   = useState('');
  const [adminReason, setAdminReason]     = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  // Action Modals State (Approve / Reject / Delete with Reason)
  const [activeActionModal, setActiveActionModal] = useState(null); // { type: 'approve'|'reject'|'delete', restaurant }
  const [actionReason, setActionReason]           = useState('');
  const [actionSubmitting, setActionSubmitting]   = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const restUrl = isSuperAdmin && selectedRegion !== 'All'
        ? `/api/admin/restaurants?region=${encodeURIComponent(selectedRegion)}`
        : '/api/admin/restaurants';

      const promises = [
        fetch(restUrl, { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/reviews', { headers }),
      ];

      if (isSuperAdmin) {
        promises.push(fetch('/api/admin/regional-admins', { headers }));
        promises.push(fetch('/api/admin/voucher-config', { headers }));
      }

      const [rRes, uRes, revRes, regAdminRes, voucherConfigRes] = await Promise.all(promises);

      if (rRes.ok) {
        const rData = await rRes.json();
        setRests(rData.restaurants || []);
      }
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }
      if (revRes.ok) {
        const revData = await revRes.json();
        setReviews(revData.reviews || []);
      }
      if (regAdminRes && regAdminRes.ok) {
        const regData = await regAdminRes.json();
        setRegionalAdmins(regData.regionalAdmins || []);
      }
      if (voucherConfigRes && voucherConfigRes.ok) {
        const vData = await voucherConfigRes.json();
        if (vData?.config) {
          if (vData.config.percent !== undefined) setConfigPercent(String(vData.config.percent));
          if (vData.config.amount !== undefined) setConfigAmount(String(vData.config.amount));
        }
      }
    } catch (e) {
      showToast('Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, isSuperAdmin, selectedRegion]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create Regional Admin Handler
  const handleCreateRegionalAdmin = async (e) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      showToast('Please fill in all required credentials.', 'error');
      return;
    }

    const finalRegion = adminRegion === 'Custom' ? customRegion.trim() : adminRegion;
    if (!finalRegion) {
      showToast('Please specify an assigned region territory.', 'error');
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await fetch('/api/admin/regional-admins', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPassword.trim(),
          region: finalRegion,
          assignmentReason: adminReason.trim() || 'Territory supervision & quality compliance',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create regional admin');

      showToast(`🎉 Regional Admin created for ${finalRegion}! Credentials saved.`, 'success');
      setShowCreateAdminModal(false);
      setAdminName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminReason('');
      setCustomRegion('');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  // Execute Approve / Reject / Delete Action with reason
  const handleExecuteAction = async () => {
    if (!activeActionModal) return;
    const { type, restaurant } = activeActionModal;

    setActionSubmitting(true);
    try {
      let res;
      if (type === 'approve') {
        res = await fetch(`/api/admin/restaurants/${restaurant.id || restaurant._id}/approve`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: actionReason }),
        });
      } else if (type === 'reject') {
        res = await fetch(`/api/admin/restaurants/${restaurant.id || restaurant._id}/reject`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ reason: actionReason }),
        });
      } else if (type === 'delete') {
        res = await fetch(`/api/admin/restaurants/${restaurant.id || restaurant._id}`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ reason: actionReason }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Action '${type}' failed.`);

      showToast(data.message || `Restaurant ${type}d successfully`, 'success');
      setActiveActionModal(null);
      setActionReason('');
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Filter reviews by current region if regional admin
  const filteredReviews = isSuperAdmin && selectedRegion === 'All'
    ? reviews
    : reviews.filter(rev => {
        const targetRest = restaurants.find(r => r.id === rev.restaurantId || r._id === rev.restaurantId);
        return targetRest && (targetRest.region || 'Bengaluru Urban').toLowerCase() === (isSuperAdmin ? selectedRegion : assignedRegion).toLowerCase();
      });

  const pendingCount = restaurants.filter(r => r.status === 'pending' || r.isApproved === false).length;
  const approvedCount = restaurants.filter(r => r.status === 'approved' || r.isApproved === true).length;
  const underperformingCount = restaurants.filter(r => r.averageRating > 0 && r.averageRating < 3.0).length;

  const TAB_BTN = (key, label, Icon, count) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 18px', borderRadius: 'var(--radius-md)',
        border: 'none', cursor: 'pointer', transition: 'var(--transition)',
        fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.88rem',
        background: tab === key ? 'var(--primary)' : 'var(--bg-surface)',
        color: tab === key ? '#fff' : 'var(--text-muted)',
      }}
    >
      <Icon size={15} /> {label}
      {count !== undefined && count > 0 && (
        <span style={{
          background: key === 'approvals' ? '#EF4444' : 'rgba(255,255,255,0.2)',
          color: '#fff', fontSize: '0.72rem', fontWeight: 800,
          padding: '2px 7px', borderRadius: '10px', marginLeft: '4px',
        }}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div style={{ padding: '32px 0 80px', position: 'relative', zIndex: 1 }}>
      <div className="container">
        {/* ═══════════════════════════════════════════════════════ */}
        {/* BANNER & REGION SELECTOR HEADER                         */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: isSuperAdmin
            ? 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(19,27,42,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(19,27,42,0.95) 100%)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              {isSuperAdmin ? (
                <span className="badge badge-primary"><Shield size={12} /> Main Super Admin</span>
              ) : (
                <span className="badge badge-success"><MapPin size={12} /> Regional Admin: {assignedRegion}</span>
              )}
              <span className="badge badge-info">
                {isSuperAdmin ? (selectedRegion === 'All' ? 'Global View (All Regions)' : `Region: ${selectedRegion}`) : `Jurisdiction: ${assignedRegion}`}
              </span>
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>
              {isSuperAdmin ? 'Central Operations & Regional Command' : `${assignedRegion} Regional Administration`}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {isSuperAdmin
                ? 'Oversee platform-wide approvals, create regional admin IDs, monitor restaurant health, and manage underperforming listings.'
                : `Review registrations, track dining quality, and moderate restaurants in ${assignedRegion}.`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Main Admin Region Filter */}
            {isSuperAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <Filter size={14} color="var(--text-muted)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700 }}>REGION:</span>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  style={{
                    background: 'transparent', color: '#fff', border: 'none',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
                  }}
                >
                  <option value="All" style={{ background: '#1e293b' }}>All Regions (Global)</option>
                  {STANDARD_REGIONS.map(reg => (
                    <option key={reg} value={reg} style={{ background: '#1e293b' }}>{reg}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Create Regional Admin Button (Main Admin Only) */}
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => setShowCreateAdminModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', gap: '6px' }}
                >
                  <UserPlus size={15} /> Create Regional Admin
                </button>
                <button
                  onClick={() => setShowDiscountConfigModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)', gap: '6px', marginLeft: '8px' }}
                >
                  <Award size={15} /> Configure Voucher Discounts
                </button>
              </>
            )}

            <button className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STATS OVERVIEW CARDS                                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <StatCard
            label="Total Restaurants"
            value={restaurants.length}
            color="#FF5A36"
            icon={<Store />}
            subtitle={`${approvedCount} approved active`}
          />
          <StatCard
            label="Pending Approvals"
            value={pendingCount}
            color="#FFB300"
            icon={<Clock />}
            subtitle="Awaiting regional review"
          />
          <StatCard
            label={isSuperAdmin ? "Regional Admins" : "Verified Reviews"}
            value={isSuperAdmin ? regionalAdmins.length : filteredReviews.length}
            color="#8B5CF6"
            icon={isSuperAdmin ? <Users /> : <Star />}
            subtitle={isSuperAdmin ? "Territory managers" : "In your jurisdiction"}
          />
          <StatCard
            label="Underperforming"
            value={underperformingCount}
            color="#EF4444"
            icon={<AlertTriangle />}
            subtitle="Rating < 3.0 (At Risk)"
          />
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB BAR NAVIGATION                                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {TAB_BTN('restaurants', 'All Outlets & Performance', Store)}
          {TAB_BTN('approvals', 'Pending Approvals', Clock, pendingCount)}
          {isSuperAdmin && TAB_BTN('regional_admins', 'Regional Admins', Users, regionalAdmins.length)}
          {isSuperAdmin && TAB_BTN('users', 'Platform Users', Users)}
          {TAB_BTN('reviews', 'Reviews Stream', FileText)}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 1: RESTAURANTS LIST & PERFORMANCE MONITOR          */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'restaurants' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Restaurant Listings & Health Monitor</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Monitor restaurant quality ratings, foot traffic, and delist restaurants not meeting standards.
                </p>
              </div>
              <span className="badge badge-info">{restaurants.length} Listed Outlets</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Restaurant</th>
                    <th>Region</th>
                    <th>Cuisine & Pricing</th>
                    <th>Status</th>
                    <th>Rating & Reviews</th>
                    <th>Health Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '40px' }}>
                        No restaurants registered in this region yet.
                      </td>
                    </tr>
                  ) : (
                    restaurants.map(r => {
                      const isLowRating = r.averageRating > 0 && r.averageRating < 3.0;
                      return (
                        <tr key={r.id || r._id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>{r.name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📍 {r.address}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Owner: {r.ownerName || '—'}</div>
                          </td>
                          <td>
                            <span className="badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#C084FC', fontSize: '0.72rem' }}>
                              📍 {r.region || 'Bengaluru Urban'}
                            </span>
                          </td>
                          <td>
                            <div><span className="badge badge-info">{r.cuisine ? (Array.isArray(r.cuisine) ? r.cuisine.join(', ') : r.cuisine) : 'Dining'}</span></div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>{r.priceRange}</div>
                          </td>
                          <td>
                            <span className={`badge ${r.status === 'approved' || r.isApproved ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                              {r.status || (r.isApproved ? 'approved' : 'pending')}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: '#FFB300' }}>★</span>
                              <span style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                                {r.averageRating ? r.averageRating.toFixed(1) : '—'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {r.reviewCount || 0} reviews
                            </div>
                          </td>
                          <td>
                            {isLowRating ? (
                              <span className="badge" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', fontSize: '0.7rem' }}>
                                ⚠️ At Risk (Underperforming)
                              </span>
                            ) : r.averageRating >= 4.5 ? (
                              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                                🏆 Top Rated
                              </span>
                            ) : (
                              <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: '0.7rem' }}>
                                ✓ Normal Performance
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {(!r.isApproved || r.status !== 'approved') && (
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => setActiveActionModal({ type: 'approve', restaurant: r })}
                                  style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                                  title="Approve Listing"
                                >
                                  <Check size={12} /> Approve
                                </button>
                              )}
                              <button
                                className="btn btn-sm"
                                onClick={() => setActiveActionModal({ type: 'delete', restaurant: r })}
                                style={{
                                  background: 'rgba(239,68,68,0.15)',
                                  color: '#EF4444',
                                  border: '1px solid rgba(239,68,68,0.3)',
                                  padding: '5px 10px',
                                  fontSize: '0.75rem',
                                  gap: '4px',
                                }}
                                title="Delete / Delist if not doing well"
                              >
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 2: PENDING APPROVALS                                */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'approvals' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                {isSuperAdmin ? 'Platform-Wide Pending Listing Applications' : `${assignedRegion} Listing Applications`}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Inspect restaurant address, geofence radius, menu items, and confirm approval or rejection with reason notes.
              </p>
            </div>

            {restaurants.filter(r => !r.isApproved || r.status === 'pending').length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <CheckCircle size={40} color="#10B981" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontWeight: 800, fontSize: '1.1rem' }}>All Caught Up!</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  No pending restaurant registrations require approval in this region.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                {restaurants.filter(r => !r.isApproved || r.status === 'pending').map(r => (
                  <div
                    key={r.id || r._id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{r.name}</span>
                        <span className="badge" style={{ background: 'rgba(255,179,0,0.15)', color: '#FFB300' }}>
                          <Clock size={10} /> Pending Regional Review
                        </span>
                        <span className="badge badge-primary">📍 {r.region || 'Bengaluru Urban'}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        📍 {r.address} (GPS: {r.location?.lat}, {r.location?.lng})
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Owner: {r.ownerName || '—'} ({r.ownerEmail || '—'}) • Geofence: {r.geofenceRadiusMeters || 200}m • Menu Items: {r.menuItems?.length || 0}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => setActiveActionModal({ type: 'approve', restaurant: r })}
                        style={{ gap: '6px' }}
                      >
                        <CheckCircle size={14} /> Approve Listing
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => setActiveActionModal({ type: 'reject', restaurant: r })}
                        style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)', gap: '6px' }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 3: REGIONAL ADMINS MANAGEMENT (MAIN ADMIN ONLY)     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {isSuperAdmin && tab === 'regional_admins' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Regional Admin Leads</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Manage authorized regional administrators, credentials created for them, and their appointment mandate.
                </p>
              </div>
              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', gap: '6px' }}
              >
                <UserPlus size={14} /> New Regional Admin
              </button>
              <button
                onClick={() => setShowDiscountConfigModal(true)}
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', gap: '6px', marginLeft: '8px' }}
              >
                <Key size={14} /> Configure Voucher Discounts
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Admin Name</th>
                    <th>Login ID / Email</th>
                    <th>Assigned Jurisdiction</th>
                    <th>Appointment Mandate / Reason</th>
                    <th>Created Date</th>
                    <th>Active Outlets</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '36px' }}>
                        No regional admins created yet. Click "New Regional Admin" to assign region leads.
                      </td>
                    </tr>
                  ) : (
                    regionalAdmins.map(admin => {
                      const regionRestCount = restaurants.filter(r => (r.region || '').toLowerCase() === (admin.assignedRegion || '').toLowerCase()).length;
                      return (
                        <tr key={admin.id || admin._id}>
                          <td style={{ fontWeight: 700, color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                                {admin.name?.charAt(0).toUpperCase()}
                              </div>
                              {admin.name}
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{admin.email}</td>
                          <td>
                            <span className="badge badge-primary">
                              📍 {admin.assignedRegion}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '240px' }}>
                            {admin.assignmentReason || 'Territory supervision & quality compliance'}
                          </td>
                          <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                            {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <span className="badge badge-info">{regionRestCount} Outlets</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 4: USERS LIST (MAIN ADMIN ONLY)                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {isSuperAdmin && tab === 'users' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>All Platform Users</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Registered diners, restaurant owners, and administrative staff.</p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Jurisdiction</th><th>Joined</th><th>Reviews</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-primary' : u.role === 'regional_admin' ? 'badge-info' : u.role === 'customer' ? 'badge-success' : 'badge-role'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>{u.assignedRegion || 'Global / N/A'}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{u.reviewCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TAB 5: REVIEWS STREAM                                   */}
        {/* ═══════════════════════════════════════════════════════ */}
        {tab === 'reviews' && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Verified Customer Reviews</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {isSuperAdmin ? 'All platform reviews authenticated via GPS / OCR bill receipt proof.' : `Verified reviews for outlets in ${assignedRegion}.`}
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Restaurant</th><th>Reviewer</th><th>Rating</th><th>Verification</th><th>Comment</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {filteredReviews.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '36px' }}>No reviews recorded yet.</td></tr>
                  ) : (
                    filteredReviews.map(r => (
                      <tr key={r.id || r._id}>
                        <td style={{ fontWeight: 600 }}>{r.restaurantName || r.restaurantId}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{r.userName || r.userId}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#FFB300' }}>★</span>
                            <span style={{ fontWeight: 700 }}>{r.rating}/5</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${r.verificationType === 'live_location' ? 'badge-success' : 'badge-info'}`}>
                            {r.verificationType === 'live_location' ? '📍 Live GPS' : '🧾 Bill Proof'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          "{r.comment || '—'}"
                        </td>
                        <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: CREATE REGIONAL ADMIN                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showCreateAdminModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '500px',
            padding: '32px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease-out',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserPlus size={20} color="#8B5CF6" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Create Regional Admin</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Generate territory credentials and mandate for regional lead</p>
                </div>
              </div>
              <button onClick={() => setShowCreateAdminModal(false)} className="btn-ghost" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRegionalAdmin}>
              <div className="form-group">
                <label className="form-label">Regional Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  className="form-input"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Admin Login Email / ID *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. north_lead@foodtrail.com"
                  className="form-input"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password Created for Him *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Assigned Region Territory *</label>
                <select
                  className="form-select"
                  value={adminRegion}
                  onChange={(e) => setAdminRegion(e.target.value)}
                >
                  {STANDARD_REGIONS.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                  <option value="Custom">+ Enter Custom Territory Name...</option>
                </select>
              </div>

              {adminRegion === 'Custom' && (
                <div className="form-group">
                  <label className="form-label">Custom Territory Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pacific Northwest Harbor"
                    className="form-input"
                    value={customRegion}
                    onChange={(e) => setCustomRegion(e.target.value)}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Reason / Appointment Mandate</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Managing North District restaurant approvals, health compliance, and local quality inspections."
                  className="form-textarea"
                  value={adminReason}
                  onChange={(e) => setAdminReason(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAdmin}
                  className="btn btn-primary"
                  style={{ flex: 1, background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' }}
                >
                  {creatingAdmin ? 'Creating...' : 'Create Admin ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: ACTION REASON (APPROVE / REJECT / DELETE)        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {activeActionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: activeActionModal.type === 'delete'
              ? '2px solid #EF4444'
              : activeActionModal.type === 'approve'
              ? '2px solid #10B981'
              : '2px solid #F59E0B',
            borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeActionModal.type === 'delete' ? (
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={20} color="#EF4444" />
                  </div>
                ) : activeActionModal.type === 'approve' ? (
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={20} color="#10B981" />
                  </div>
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={20} color="#F59E0B" />
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    {activeActionModal.type === 'delete' ? 'Delete / Delist Restaurant' : activeActionModal.type === 'approve' ? 'Approve Restaurant' : 'Reject Restaurant'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Target: <strong>{activeActionModal.restaurant?.name}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveActionModal(null)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>

            {activeActionModal.type === 'delete' && (
              <div style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                fontSize: '0.82rem',
                color: '#FCA5A5',
              }}>
                ⚠️ <strong>Warning:</strong> Deleting this restaurant will permanently remove its listings, review records, and vouchers from the FoodTrail platform.
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                {activeActionModal.type === 'delete' ? 'Reason for Deletion (Required) *' : 'Reason / Review Notes (Optional)'}
              </label>
              <textarea
                rows={3}
                required={activeActionModal.type === 'delete'}
                placeholder={
                  activeActionModal.type === 'delete'
                    ? 'e.g. Sustained low ratings (< 2.0 stars), frequent customer complaints, or restaurant closed down.'
                    : activeActionModal.type === 'approve'
                    ? 'e.g. Physical license verified, geofence radius confirmed, health checklist approved.'
                    : 'e.g. Incomplete menu data or unverified physical address.'
                }
                className="form-textarea"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setActiveActionModal(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionSubmitting || (activeActionModal.type === 'delete' && !actionReason.trim())}
                className={activeActionModal.type === 'delete' ? 'btn btn-danger' : activeActionModal.type === 'approve' ? 'btn btn-success' : 'btn btn-warning'}
                style={{ flex: 1, fontWeight: 700 }}
              >
                {actionSubmitting ? 'Processing...' : activeActionModal.type === 'delete' ? 'Confirm Deletion' : activeActionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL: CONFIGURE VOUCHER DISCOUNTS (SUPER ADMIN ONLY)   */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showDiscountConfigModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '2px solid #10B981',
            borderRadius: 'var(--radius-lg)',
            width: '100%', maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Configure Voucher Discounts</h3>
              <button onClick={() => setShowDiscountConfigModal(false)} className="btn-ghost" style={{ padding: '4px' }}>
                <X size={18} />
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Maximum Discount Percentage (1‑50%)</label>
              <input type="number" min={1} max={50} value={configPercent}
                     onChange={e => setConfigPercent(e.target.value)}
                     className="form-input" />
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Maximum Discount Amount (₹)</label>
              <input type="number" min={0} value={configAmount}
                     onChange={e => setConfigAmount(e.target.value)}
                     className="form-input" />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowDiscountConfigModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' }}
                      disabled={configSaving}
                      onClick={async () => {
                        setConfigSaving(true);
                        try {
                          const res = await fetch('/api/admin/voucher-config', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({ percent: Number(configPercent), amount: Number(configAmount) })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to save config');
                          showToast('Voucher configuration saved', 'success');
                          setShowDiscountConfigModal(false);
                        } catch (e) {
                          showToast(e.message, 'error');
                        } finally {
                          setConfigSaving(false);
                        }
                      }}>
                {configSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// App Root Component
// ────────────────────────────────────────────────────
const FEATURES = [
  { icon: '👑', title: 'Central & Regional Command', desc: 'Secure sign-in for Super Admin and territory leads' },
  { icon: '✅', title: 'Listing Approvals',           desc: 'Review and approve restaurant listing applications with reason audit' },
  { icon: '📊', title: 'Quality & Delisting',        desc: 'Track restaurant health scores & delist underperforming listings' },
  { icon: '🛡️', title: 'Anti-Spam Verification',     desc: 'Audit verified GPS proximity & OCR bill reviews across regions' },
];

export default function App() {
  const { user, token, loading, logout } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin' && user.role !== 'regional_admin') {
      showToast('Access restricted to administrators.', 'error');
      logout();
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-main)' }}>
        <div style={{ fontSize: '3rem' }}>🛡️</div>
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading Administration Console…</div>
      </div>
    );
  }

  // Strictly allow ONLY Sign In (no public registration from login screen)
  if (!user) {
    return (
      <LoginPage
        portalName="Admin Console"
        portalIcon="🛡️"
        accentColor="#8B5CF6"
        allowRegister={false}
        features={FEATURES}
        onSuccess={() => {}}
      />
    );
  }

  if (user.role !== 'admin' && user.role !== 'regional_admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: 'var(--bg-main)', textAlign: 'center', padding: '24px' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--text-muted)' }}>Admin accounts only. Your role: <strong>{user.role}</strong></p>
        <button className="btn btn-primary" onClick={logout}>Sign out</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="ambient-bg">
        <div className="ambient-blob-1" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)' }} />
        <div className="ambient-blob-2" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)' }} />
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
              background: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
            }}>🛡️</div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>FoodTrail</div>
              <div style={{ fontSize: '0.68rem', color: '#8B5CF6', fontWeight: 700, letterSpacing: '0.06em', marginTop: '-2px' }}>
                {user.role === 'admin' ? 'MAIN ADMIN CONSOLE' : `REGIONAL ADMIN CONSOLE (${user.assignedRegion || user.region || 'TERRITORY'})`}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user.role === 'admin' ? (
              <span className="badge badge-primary"><Shield size={12} /> Super Admin</span>
            ) : (
              <span className="badge badge-success"><MapPin size={12} /> {user.assignedRegion || user.region} Lead</span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user.name}</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => { logout(); showToast('Signed out', 'info'); }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </nav>

      <main>
        <AdminDashboard user={user} token={token} />
      </main>

      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(11,15,23,0.95)', padding: '24px 0', marginTop: '60px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
          <span>🛡️ <strong style={{ color: 'var(--text-muted)' }}>FoodTrail Multi-Region Admin Platform</strong></span>
          <span>Regional Administration · Quality Moderation · Listing Lifecycle</span>
        </div>
      </footer>
    </div>
  );
}
