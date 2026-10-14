import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Store, MapPin, Plus, Trash2, CheckCircle2, ShieldAlert,
  Sliders, DollarSign, Image as ImageIcon, Utensils, Sparkles
} from 'lucide-react';

export default function RestaurantRegistration({ onRestaurantSaved }) {
  const { token, user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('12.9720');
  const [lng, setLng] = useState('77.5950');
  const [geofenceRadius, setGeofenceRadius] = useState(200);
  const [cuisineInput, setCuisineInput] = useState('Italian, Pizza, Pasta');
  const [region, setRegion] = useState('Downtown Metro');
  const [priceRange, setPriceRange] = useState('$$');
  const [phone, setPhone] = useState('+1 (555) 345-6789');
  const [email, setEmail] = useState(user?.email || 'owner@foodtrail.com');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80');

  // Menu items list
  const [menuItems, setMenuItems] = useState([
    { id: 'm_1', name: 'Signature House Special', category: 'Mains', price: 22, description: 'Chef special prepared fresh with local herbs' },
    { id: 'm_2', name: 'Artisan Dessert Platter', category: 'Desserts', price: 10, description: 'Decadent sweet treats' },
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Mains');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddMenuItem = () => {
    if (!newItemName || !newItemPrice) {
      showToast('Item name and price are required', 'error');
      return;
    }

    setMenuItems([
      ...menuItems,
      {
        id: `m_${Date.now()}`,
        name: newItemName,
        price: parseFloat(newItemPrice) || 0,
        category: newItemCategory || 'Mains',
        description: newItemDesc,
      },
    ]);

    setNewItemName('');
    setNewItemPrice('');
    setNewItemDesc('');
    showToast('Menu item added!', 'success');
  };

  const handleRemoveMenuItem = (id) => {
    setMenuItems(menuItems.filter((item) => item.id !== id));
  };

  const handleApplyPresetCoords = (presetName, pLat, pLng) => {
    setLat(pLat);
    setLng(pLng);
    showToast(`Applied preset coordinates for ${presetName}`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      showToast('Restaurant name and physical address are required', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const cuisineArray = cuisineInput
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const payload = {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        address: address.trim(),
        region: region.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        geofenceRadiusMeters: parseInt(geofenceRadius, 10),
        cuisine: cuisineArray,
        priceRange,
        phone,
        email,
        coverImage,
        photos: [coverImage],
        menuItems,
      };

      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register restaurant');

      showToast('🎉 Restaurant registered successfully!', 'success');
      if (onRestaurantSaved) {
        onRestaurantSaved(data.restaurant);
      }
    } catch (err) {
      showToast(err.message || 'Registration error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <div style={{
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(255, 90, 54, 0.15)',
            border: '1px solid rgba(255, 90, 54, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Store size={26} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Register New Restaurant</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Set up GPS coordinates, geofence radius, and publish your verified dining profile
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Basic Info */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', color: '#FFF' }}>
              1. Basic Profile & Branding
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Restaurant Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Osteria del Porto"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tagline / Subheading</label>
                <input
                  type="text"
                  placeholder="e.g. Authentic Woodfired Artisan Pizza"
                  className="form-input"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description & Culinary Story</label>
              <textarea
                rows={2}
                className="form-textarea"
                placeholder="Tell guests about your ingredients, chef background, atmosphere..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Cuisines (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Italian, Pizza, Fine Dining, Seafood"
                  className="form-input"
                  value={cuisineInput}
                  onChange={(e) => setCuisineInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Jurisdiction / Region</label>
                <select
                  className="form-select"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                >
                  <option value="Downtown Metro">Downtown Metro</option>
                  <option value="North District">North District</option>
                  <option value="South Coast">South Coast</option>
                  <option value="East Bay">East Bay</option>
                  <option value="West Hub">West Hub</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Price Range</label>
                <select
                  className="form-select"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                >
                  <option value="$">$ (Budget-Friendly)</option>
                  <option value="$$">$$ (Casual Dining)</option>
                  <option value="$$$">$$$ (Upscale)</option>
                  <option value="$$$$">$$$$ (Fine Dining Omakase)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Cover Image URL</label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                className="form-input"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
              />
            </div>
          </div>

          {/* Section 2: Physical Address & GPS Geofencing */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#FFF' }}>
              📍 2. Address & Geofence GPS Coordinates
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
              Customer Live Location reviews are verified against these exact coordinates.
            </p>

            <div className="form-group">
              <label className="form-label">Street Address *</label>
              <input
                type="text"
                required
                placeholder="e.g. 108 Marina Boulevard, Suite 4"
                className="form-input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Coordinate Presets */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>PRESET COORDS:</span>
              <button
                type="button"
                onClick={() => handleApplyPresetCoords('City Center', '12.9716', '77.5946')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem' }}
              >
                Downtown Central (12.9716, 77.5946)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPresetCoords('Westside Hub', '12.9750', '77.6010')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem' }}
              >
                Westside Marina (12.9750, 77.6010)
              </button>
            </div>

            {/* Geofence Radius Slider */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="form-label">Geofence Radius (Meters)</label>
                <span style={{ fontWeight: 800, color: '#10B981', fontSize: '0.9rem' }}>
                  {geofenceRadius} meters
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="25"
                value={geofenceRadius}
                onChange={(e) => setGeofenceRadius(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <span>50m (Dining Table Strict)</span>
                <span>200m (Standard Restaurant)</span>
                <span>500m (Resort / Large Plaza)</span>
              </div>
            </div>
          </div>

          {/* Section 3: Menu Items Builder */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', color: '#FFF' }}>
              🍴 3. Menu Items
            </h3>

            {/* Existing items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.name}</span>
                    <span className="badge" style={{ marginLeft: '8px', fontSize: '0.68rem' }}>{item.category}</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 800, marginLeft: '8px' }}>${item.price}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMenuItem(item.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: '#EF4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new item row */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--border-medium)',
              borderRadius: '12px',
              padding: '14px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                <input
                  type="text"
                  placeholder="Item Name (e.g. Black Truffle Risotto)"
                  className="form-input"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Price ($)"
                  className="form-input"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                />
                <select
                  className="form-select"
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                >
                  <option value="Mains">Mains</option>
                  <option value="Starters">Starters</option>
                  <option value="Pasta">Pasta</option>
                  <option value="Pizza">Pizza</option>
                  <option value="Sushi">Sushi</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Drinks">Drinks</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddMenuItem}
                className="btn btn-secondary btn-sm"
              >
                <Plus size={14} /> Add Item to Menu
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            {submitting ? 'Registering Restaurant...' : '🚀 Submit Restaurant for Listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
