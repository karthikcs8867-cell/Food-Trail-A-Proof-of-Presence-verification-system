import React, { useState, useEffect } from 'react';
import { X, MapPin, Phone, Mail, Star, ShieldCheck, CheckCircle, Receipt, Utensils, Calendar, ExternalLink } from 'lucide-react';
import StarRating from '../common/StarRating';

export default function RestaurantDetailModal({ restaurant, onClose, onWriteReview }) {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [activeTab, setActiveTab] = useState('reviews'); // 'reviews' | 'menu' | 'info'

  useEffect(() => {
    if (!restaurant?._id) return;
    async function fetchReviews() {
      try {
        const res = await fetch(`/api/reviews/restaurant/${restaurant._id}`);
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (err) {
        console.error('Error loading reviews:', err);
      } finally {
        setLoadingReviews(false);
      }
    }
    fetchReviews();
  }, [restaurant]);

  if (!restaurant) return null;

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
        className="modal-card"
        style={{
          maxWidth: '780px',
          width: '100%',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          margin: 'auto',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Hero Banner */}
        <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
          <img
            src={restaurant.coverImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80'}
            alt={restaurant.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(19, 27, 42, 1) 0%, rgba(19, 27, 42, 0.4) 60%, transparent 100%)',
          }} />

          <button
            onClick={onClose}
            className="btn-ghost"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '50%',
              padding: '8px',
              color: '#FFF',
            }}
          >
            <X size={20} />
          </button>

          {/* Restaurant Title & Badges in Hero */}
          <div style={{ position: 'absolute', bottom: '20px', left: '24px', right: '24px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              {restaurant.cuisine?.map((c, i) => (
                <span key={i} className="badge" style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF' }}>
                  {c}
                </span>
              ))}
              <span className="badge" style={{ background: 'rgba(255, 179, 0, 0.2)', color: '#FFB300' }}>
                {restaurant.priceRange || '₹₹'}
              </span>
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
                📍 {restaurant.geofenceRadiusMeters || 50}m Geofenced
              </span>
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FFF' }}>{restaurant.name}</h2>
            {restaurant.tagline && (
              <p style={{ color: '#E2E8F0', fontSize: '0.92rem', opacity: 0.9 }}>{restaurant.tagline}</p>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px' }}>
          {/* Quick Details Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            flexWrap: 'wrap',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 179, 0, 0.12)',
                padding: '6px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 179, 0, 0.3)',
              }}>
                <Star size={20} fill="#FFB300" color="#FFB300" />
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFB300' }}>
                  {restaurant.ratingAverage ? restaurant.ratingAverage.toFixed(1) : 'New'}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  ({restaurant.reviewCount || reviews.length} verified)
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                <MapPin size={16} color="var(--primary)" />
                <span>{restaurant.address}</span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onWriteReview(restaurant);
              }}
              className="btn btn-primary"
            >
              ✍️ Write Verified Review
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '12px',
            margin: '20px 0',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '10px',
          }}>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`btn btn-sm ${activeTab === 'reviews' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Verified Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`btn btn-sm ${activeTab === 'menu' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Utensils size={14} /> Menu ({restaurant.menuItems?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`btn btn-sm ${activeTab === 'info' ? 'btn-primary' : 'btn-ghost'}`}
            >
              About & GPS
            </button>
          </div>

          {/* Tab 1: Verified Reviews */}
          {activeTab === 'reviews' && (
            <div>
              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  Loading community verified reviews...
                </div>
              ) : reviews.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: 'var(--bg-surface)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📝</div>
                  <h4 style={{ fontWeight: 700 }}>No verified reviews yet</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '8px 0 16px' }}>
                    Be the first foodie to review via Live Location or Bill Proof and earn a reward voucher!
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onWriteReview(restaurant);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    Write the First Review
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {reviews.map((rev) => (
                    <div
                      key={rev._id}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '14px',
                        padding: '16px',
                      }}
                    >
                      {/* Reviewer Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={rev.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                            alt={rev.userName}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{rev.userName || 'Verified Diner'}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                              {new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>

                        {/* Verification Type Badge */}
                        {rev.verificationType === 'live_location' ? (
                          <span className="badge badge-live" title="Verified via live GPS proximity at restaurant">
                            <MapPin size={12} /> Live Verified {rev.verificationDetails?.distanceMeters ? `(${Math.round(rev.verificationDetails.distanceMeters)}m)` : ''}
                          </span>
                        ) : (
                          <span className="badge badge-bill" title="Verified via uploaded dining receipt OCR">
                            <Receipt size={12} /> Bill Proof Verified
                          </span>
                        )}
                      </div>

                      {/* Rating & Comment */}
                      <div style={{ marginBottom: '8px' }}>
                        <StarRating rating={rev.rating} size={15} />
                      </div>
                      <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                        {rev.comment}
                      </p>

                      {/* Photo attachments if any */}
                      {rev.photos && rev.photos.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                          {rev.photos.map((photo, pIdx) => (
                            <img
                              key={pIdx}
                              src={photo}
                              alt="Review attachment"
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                border: '1px solid var(--border-subtle)',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Menu Showcase */}
          {activeTab === 'menu' && (
            <div>
              {(!restaurant.menuItems || restaurant.menuItems.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No menu items listed yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                  {restaurant.menuItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        gap: '12px',
                      }}
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.name}</span>
                          <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.92rem' }}>₹{item.price}</span>
                        </div>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', fontSize: '0.68rem', margin: '4px 0' }}>
                          {item.category || 'Specialty'}
                        </span>
                        {item.description && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: About & GPS Coordinates */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: '12px' }}>
                <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>About {restaurant.name}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                  {restaurant.description || 'A cherished local dining destination with verified authentic culinary excellence.'}
                </p>
              </div>

              <div style={{
                background: 'var(--bg-surface)',
                padding: '18px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
              }}>
                <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>📍 Registered Coordinates & Geofencing</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Latitude</span>
                    <span style={{ fontWeight: 600 }}>{restaurant.location?.lat || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Longitude</span>
                    <span style={{ fontWeight: 600 }}>{restaurant.location?.lng || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Geofence Radius</span>
                    <span style={{ fontWeight: 600, color: '#10B981' }}>{restaurant.geofenceRadiusMeters || 50} meters</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block' }}>Contact Phone</span>
                    <span style={{ fontWeight: 600 }}>{restaurant.phone || 'Not listed'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
