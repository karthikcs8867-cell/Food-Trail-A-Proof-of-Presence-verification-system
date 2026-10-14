import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Compass, Search, MapPin, Star, Gift, Utensils,
  ChevronRight, Sparkles, Navigation, Filter, CheckCircle2, Receipt
} from 'lucide-react';
import StarRating from '../common/StarRating';

export default function CustomerHome({
  onSelectRestaurant,
  onOpenSubmitReview,
  onOpenWallet,
  voucherCount = 0
}) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [minRating, setMinRating] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const cuisines = ['All', 'Italian', 'Japanese', 'Mexican', 'Cafe', 'Sushi', 'Pasta', 'Woodfired Pizza'];

  const fetchRestaurants = async (coords = null) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCuisine && selectedCuisine !== 'All') params.append('cuisine', selectedCuisine);
      if (minRating) params.append('minRating', minRating);

      if (coords) {
        params.append('lat', coords.lat);
        params.append('lng', coords.lng);
      } else if (userLocation) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
      }

      const res = await fetch(`/api/restaurants?${params.toString()}`);
      const data = await res.json();
      setRestaurants(data.restaurants || []);
    } catch (err) {
      console.error('Error fetching restaurants:', err);
      showToast('Failed to load restaurants.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [searchTerm, selectedCuisine, minRating]);

  const handleDetectLocation = () => {
    setDetectingLocation(true);
    if (!navigator.geolocation) {
      // Fallback simulation coordinates (Bangalore Downtown)
      const mockCoords = { lat: 12.9716, lng: 77.5946 };
      setUserLocation(mockCoords);
      fetchRestaurants(mockCoords);
      setDetectingLocation(false);
      showToast('📍 Simulated current city coordinates applied.', 'info');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(coords);
        fetchRestaurants(coords);
        setDetectingLocation(false);
        showToast('📍 Nearby restaurants calculated via GPS!', 'success');
      },
      (err) => {
        // Use demo coordinates on error
        const mockCoords = { lat: 12.9716, lng: 77.5946 };
        setUserLocation(mockCoords);
        fetchRestaurants(mockCoords);
        setDetectingLocation(false);
        showToast('📍 Location simulated at Downtown center.', 'info');
      },
      { timeout: 8000 }
    );
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* 1. HERO SECTION */}
      <section style={{
        padding: '48px 0 36px',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div className="container">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 90, 54, 0.1)',
            border: '1px solid rgba(255, 90, 54, 0.3)',
            borderRadius: 'var(--radius-full)',
            padding: '6px 16px',
            marginBottom: '18px',
          }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FF784E', letterSpacing: '0.04em' }}>
              RESTAURANT REPUTATION BACKED BY PROOF
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            fontWeight: 900,
            lineHeight: 1.15,
            marginBottom: '16px',
            letterSpacing: '-0.03em',
          }}>
            Taste. Verify. <span style={{
              background: 'linear-gradient(135deg, #FF5A36 0%, #FFB300 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Get Rewarded.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2vw, 1.15rem)',
            color: 'var(--text-muted)',
            maxWidth: '680px',
            margin: '0 auto 36px',
          }}>
            FoodTrail eliminates fake reviews through <strong>Live GPS Geofencing</strong> and <strong>OCR Bill Proof</strong>. Earn instant restaurant gift vouchers on every verified dining experience.
          </p>

          {/* 3 MANDATORY ACTION ICONS / CARDS */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            maxWidth: '1020px',
            margin: '0 auto 40px',
            textAlign: 'left',
          }}>
            {/* ICON 1: VIEW REVIEWS */}
            <div
              onClick={() => {
                const el = document.getElementById('browse-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                cursor: 'pointer',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'linear-gradient(135deg, rgba(19, 27, 42, 0.9) 0%, rgba(26, 36, 56, 0.9) 100%)',
              }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Search size={26} color="#60A5FA" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>1. View Reviews</h3>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '6px', lineHeight: 1.5 }}>
                Browse certified restaurants, filter by cuisine & distance, inspect menus and verified diner ratings.
              </p>
            </div>

            {/* ICON 2: SUBMIT REVIEW */}
            <div
              onClick={() => onOpenSubmitReview(null)}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                cursor: 'pointer',
                border: '1px solid rgba(255, 90, 54, 0.35)',
                background: 'linear-gradient(135deg, rgba(38, 24, 28, 0.9) 0%, rgba(26, 36, 56, 0.9) 100%)',
              }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(255, 90, 54, 0.18)',
                border: '1px solid rgba(255, 90, 54, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <MapPin size={26} color="#FF5A36" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>2. Submit Review</h3>
                <span className="badge badge-live" style={{ fontSize: '0.7rem' }}>2 Modes</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '6px', lineHeight: 1.5 }}>
                Review via <strong>Live Location GPS</strong> (table proximity) or <strong>Bill Receipt Proof</strong> (OCR validation).
              </p>
            </div>

            {/* ICON 3: GIFT VOUCHERS */}
            <div
              onClick={onOpenWallet}
              className="glass-panel glass-panel-hover"
              style={{
                padding: '24px',
                cursor: 'pointer',
                border: '1px solid rgba(255, 179, 0, 0.35)',
                background: 'linear-gradient(135deg, rgba(38, 32, 20, 0.9) 0%, rgba(26, 36, 56, 0.9) 100%)',
              }}
            >
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'rgba(255, 179, 0, 0.18)',
                border: '1px solid rgba(255, 179, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}>
                <Gift size={26} color="#FFB300" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>3. Gift Vouchers</h3>
                {voucherCount > 0 ? (
                  <span className="badge badge-voucher" style={{ fontSize: '0.7rem' }}>
                    {voucherCount} Active
                  </span>
                ) : (
                  <ChevronRight size={18} color="var(--text-muted)" />
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '6px', lineHeight: 1.5 }}>
                Wallet automatically stores earned reward vouchers. Generate QR tokens for instant redemption at dining.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SEARCH & FILTER BAR */}
      <section id="browse-section" className="container" style={{ marginBottom: '32px' }}>
        <div style={{
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          boxShadow: 'var(--shadow-md)',
        }}>
          {/* Main Search Input & Geo Button */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search restaurant name, cuisine, pasta, sushi, tacos, address..."
                className="form-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '42px', height: '48px', fontSize: '0.95rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '15px', color: 'var(--text-muted)' }} />
            </div>

            <button
              onClick={handleDetectLocation}
              disabled={detectingLocation}
              className="btn btn-secondary"
              style={{ height: '48px', padding: '0 20px' }}
            >
              <Navigation size={18} color="var(--primary)" />
              <span>{userLocation ? '📍 Near Me Active' : 'Find Near Me'}</span>
            </button>

            <select
              className="form-select"
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              style={{ width: 'auto', minWidth: '150px', height: '48px' }}
            >
              <option value="">Any Rating</option>
              <option value="4.5">⭐ 4.5+ Stars</option>
              <option value="4.0">⭐ 4.0+ Stars</option>
              <option value="3.5">⭐ 3.5+ Stars</option>
            </select>
          </div>

          {/* Cuisine Filter Pills */}
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}>
            {cuisines.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCuisine(c)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: `1px solid ${selectedCuisine === c ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  background: selectedCuisine === c ? 'rgba(255, 90, 54, 0.15)' : 'var(--bg-surface)',
                  color: selectedCuisine === c ? 'var(--primary)' : 'var(--text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition)',
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. RESTAURANT CARDS GRID */}
      <section className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {selectedCuisine !== 'All' ? `${selectedCuisine} Spots` : 'Verified Restaurants'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Showing {restaurants.length} destination{restaurants.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Loading verified restaurants...
          </div>
        ) : restaurants.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔍</div>
            <h3 style={{ fontWeight: 700 }}>No restaurants match your filters</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '8px 0 16px' }}>
              Try searching with different keywords or clearing your cuisine filter.
            </p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCuisine('All'); setMinRating(''); }}
              className="btn btn-secondary btn-sm"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '24px',
          }}>
            {restaurants.map((rest) => (
              <div
                key={rest._id}
                className="glass-panel glass-panel-hover"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-lg)',
                }}
              >
                {/* Cover Image Banner */}
                <div style={{ position: 'relative', height: '190px', overflow: 'hidden' }}>
                  <img
                    src={rest.coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80'}
                    alt={rest.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(11, 15, 23, 0.85) 0%, transparent 60%)',
                  }} />

                  {/* Rating Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '14px',
                    left: '14px',
                    background: 'rgba(11, 15, 23, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 179, 0, 0.4)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Star size={15} fill="#FFB300" color="#FFB300" />
                    <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FFF' }}>
                      {rest.ratingAverage ? rest.ratingAverage.toFixed(1) : 'New'}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      ({rest.reviewCount || 0})
                    </span>
                  </div>

                  {/* Distance or Geofence Tag */}
                  <div style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                  }}>
                    {rest.distanceMeters != null ? (
                      <span className="badge badge-live">
                        📍 {rest.distanceMeters > 1000 ? `${(rest.distanceMeters / 1000).toFixed(1)} km` : `${Math.round(rest.distanceMeters)} m`}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.6)', color: '#FFF' }}>
                        {rest.priceRange || '$$'}
                      </span>
                    )}
                  </div>

                  {/* Restaurant Name in Banner */}
                  <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFF' }}>{rest.name}</h3>
                  </div>
                </div>

                {/* Card Content Body */}
                <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Cuisine Badges */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    {rest.cuisine?.slice(0, 3).map((c, i) => (
                      <span key={i} className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {c}
                      </span>
                    ))}
                  </div>

                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.5,
                    marginBottom: '14px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    flex: 1,
                  }}>
                    {rest.tagline || rest.description || 'Verified dining destination.'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-dim)', fontSize: '0.78rem', marginBottom: '16px' }}>
                    <MapPin size={14} color="var(--primary)" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rest.address}
                    </span>
                  </div>

                  {/* Card Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      onClick={() => onSelectRestaurant(rest)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Utensils size={14} /> View Details
                    </button>
                    <button
                      onClick={() => onOpenSubmitReview(rest)}
                      className="btn btn-primary btn-sm"
                    >
                      ✍️ Review & Earn
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
