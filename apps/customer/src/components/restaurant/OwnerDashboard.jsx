import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  TrendingUp, QrCode, Store, PlusCircle, ShieldCheck,
  CheckCircle, XCircle, RefreshCw, Sparkles, ExternalLink
} from 'lucide-react';
import AnalyticsOverview from './AnalyticsOverview';
import VoucherRedemption from './VoucherRedemption';
import RestaurantRegistration from './RestaurantRegistration';

export default function OwnerDashboard() {
  const { user, token, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'redemption' | 'register' | 'approvals'
  const [pendingRestaurants, setPendingRestaurants] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const fetchPending = async () => {
    try {
      setLoadingPending(true);
      const res = await fetch('/api/restaurants?includePending=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const pending = (data.restaurants || []).filter((r) => r.isApproved === false);
      setPendingRestaurants(pending);
    } catch (err) {
      console.error('Error loading pending listings:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchPending();
    }
  }, [activeTab]);

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
      fetchPending();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="container" style={{ padding: '36px 24px 80px' }}>
      {/* Top Welcome Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, rgba(19, 27, 42, 0.9) 0%, rgba(38, 28, 54, 0.9) 100%)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-role">Restaurant Owner Portal</span>
            {isAdmin && <span className="badge badge-voucher">Admin Superuser</span>}
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>
            Welcome, {user?.name || 'Chef'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Manage your verified listings, inspect diner analytics, and redeem customer gift certificates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('redemption')}
            className="btn btn-primary btn-sm"
          >
            <QrCode size={16} /> QR Redemption Terminal
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className="btn btn-secondary btn-sm"
          >
            <PlusCircle size={16} /> Add Restaurant
          </button>
        </div>
      </div>

      {/* Owner Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '12px',
        marginBottom: '28px',
        overflowX: 'auto',
      }}>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`btn btn-sm ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <TrendingUp size={16} /> Analytics & Reviews
        </button>

        <button
          onClick={() => setActiveTab('redemption')}
          className={`btn btn-sm ${activeTab === 'redemption' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <QrCode size={16} /> Voucher Redemption
        </button>

        <button
          onClick={() => setActiveTab('register')}
          className={`btn btn-sm ${activeTab === 'register' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <Store size={16} /> Register New Restaurant
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`btn btn-sm ${activeTab === 'approvals' ? 'btn-primary' : 'btn-ghost'}`}
        >
          <ShieldCheck size={16} /> Admin Approvals
          {pendingRestaurants.length > 0 && (
            <span style={{
              background: '#EF4444',
              color: '#FFF',
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '8px',
              marginLeft: '4px',
            }}>
              {pendingRestaurants.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'analytics' && <AnalyticsOverview onNavigateTab={setActiveTab} />}

      {activeTab === 'redemption' && <VoucherRedemption />}

      {activeTab === 'register' && (
        <RestaurantRegistration
          onRestaurantSaved={() => {
            setActiveTab('analytics');
          }}
        />
      )}

      {activeTab === 'approvals' && (
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Restaurant Listing Approvals</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Review newly registered restaurants before making them publicly searchable
                </p>
              </div>
              <button onClick={fetchPending} className="btn btn-ghost btn-sm">
                <RefreshCw size={15} /> Refresh
              </button>
            </div>

            {loadingPending ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                Checking pending listings...
              </div>
            ) : pendingRestaurants.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'var(--bg-surface)',
                borderRadius: '12px',
              }}>
                <CheckCircle size={32} color="#10B981" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ fontWeight: 700 }}>All listings are up to date!</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  No pending restaurant registrations require approval right now.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pendingRestaurants.map((rest) => (
                  <div
                    key={rest._id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#FFF' }}>{rest.name}</span>
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
                          Pending Review
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📍 {rest.address} (GPS: {rest.location?.lat}, {rest.location?.lng})
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        Geofence Radius: {rest.geofenceRadiusMeters || 200}m • Menu Items: {rest.menuItems?.length || 0}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleToggleApproval(rest._id, true)}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle size={14} /> Approve Listing
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
