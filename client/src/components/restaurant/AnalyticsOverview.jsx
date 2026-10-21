import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  TrendingUp, Star, Users, Gift, CheckCircle2, IndianRupee,
  MapPin, Receipt, MessageSquare, Clock, ArrowUpRight
} from 'lucide-react';
import StarRating from '../common/StarRating';

export default function AnalyticsOverview({ onNavigateTab }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await fetch('/api/analytics/owner-dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok) {
          setData(json);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [token]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Loading analytics...</div>;
  }

  const kpis = data?.kpis || {};
  const breakdown = data?.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const totalRatingCount = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. TOP KPI METRICS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
      }}>
        {/* KPI 1: Average Rating */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVERAGE RATING</span>
            <div style={{ padding: '8px', background: 'rgba(255, 179, 0, 0.15)', borderRadius: '8px' }}>
              <Star size={18} color="#FFB300" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF' }}>
              {kpis.avgRating ? kpis.avgRating.toFixed(1) : '5.0'}
            </span>
            <span style={{ color: '#10B981', fontSize: '0.85rem', fontWeight: 700 }}>★ 100% Verified</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Across {kpis.totalReviews || 0} customer reviews
          </div>
        </div>

        {/* KPI 2: Total Reviews & Verification Breakdown */}
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
            <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>
              📍 {kpis.liveLocationCount || 0} Live GPS
            </span>
            <span className="badge badge-bill" style={{ fontSize: '0.7rem' }}>
              🧾 {kpis.billProofCount || 0} Bills
            </span>
          </div>
        </div>

        {/* KPI 3: Vouchers Issued & Redemption Rate */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>REWARD VOUCHERS</span>
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

        {/* KPI 4: Estimated Revenue Generated */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>EST. REVENUE IMPACT</span>
            <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '8px' }}>
              <IndianRupee size={18} color="#8B5CF6" />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF' }}>
            ₹{kpis.estimatedRevenueImpact || 120}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            Attributed to repeat voucher dining
          </div>
        </div>
      </div>

      {/* 2. RATING DISTRIBUTION & REVIEWS STREAM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1.4fr)', gap: '24px' }}>
        {/* Rating Breakdown Bar Chart */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Rating Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = breakdown[star] || 0;
              const pct = Math.round((count / totalRatingCount) * 100);

              return (
                <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.88rem' }}>
                  <span style={{ width: '54px', fontWeight: 600 }}>{star} Stars</span>
                  <div style={{
                    flex: 1,
                    height: '10px',
                    background: 'var(--bg-surface)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: star >= 4 ? 'linear-gradient(90deg, #FFB300, #FF5A36)' : '#64748B',
                      borderRadius: '5px',
                      transition: 'width 0.5s ease',
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
            marginTop: '24px',
            padding: '14px',
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
          }}>
            💡 <strong>Anti-Spam Guarantee:</strong> 100% of reviews on FoodTrail are authenticated with geofence proximity or OCR receipt verification.
          </div>
        </div>

        {/* Recent Reviews Stream */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Recent Verified Reviews</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest stream</span>
          </div>

          {(!data?.recentReviews || data.recentReviews.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No reviews recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '380px', overflowY: 'auto' }}>
              {data.recentReviews.map((rev) => (
                <div
                  key={rev._id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
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
    </div>
  );
}
