import express from 'express';
import { db } from '../models/dbStore.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { calculateHaversineDistance } from '../services/geoService.js';

import { upload } from '../middleware/upload.js';

const router = express.Router();

/**
 * POST /api/restaurants/upload - Upload an image (JPG or PNG) for cover or bill proof
 */
router.post('/upload', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a valid image file (JPG or PNG).' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    return res.json({
      url: imageUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (err) {
    console.error('[Upload error]', err);
    return res.status(500).json({ error: 'Image upload failed.' });
  }
});

/**
 * GET /api/restaurants - List & search restaurants with filtering
 * Query params: search, cuisine, minRating, lat, lng, maxDistance
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const { search, cuisine, minRating, lat, lng, maxDistance, includePending, region } = req.query;

    let restaurants = db.restaurants.find();

    // Unless user is admin or regional_admin, only show approved restaurants to public
    if (!includePending || !req.user || (req.user.role !== 'admin' && req.user.role !== 'regional_admin')) {
      restaurants = restaurants.filter(r => r.isApproved !== false);
    }

    // Filter by region
    if (region && region !== 'All') {
      restaurants = restaurants.filter(r => (r.region || 'Downtown Metro').toLowerCase() === region.toLowerCase());
    }

    // Filter by search keyword (name, description, address, cuisine)
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      restaurants = restaurants.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.address?.toLowerCase().includes(q) ||
        r.cuisine?.some(c => c.toLowerCase().includes(q))
      );
    }

    // Filter by cuisine
    if (cuisine && cuisine !== 'All') {
      restaurants = restaurants.filter(r =>
        r.cuisine && r.cuisine.map(c => c.toLowerCase()).includes(cuisine.toLowerCase())
      );
    }

    // Filter by minimum rating
    if (minRating) {
      const min = parseFloat(minRating);
      if (!isNaN(min)) {
        restaurants = restaurants.filter(r => (r.ratingAverage || 0) >= min);
      }
    }

    // Distance calculation & filter if user coordinates provided
    if (lat && lng) {
      const uLat = parseFloat(lat);
      const uLng = parseFloat(lng);
      if (!isNaN(uLat) && !isNaN(uLng)) {
        restaurants = restaurants.map(r => {
          const dist = r.location?.lat && r.location?.lng
            ? calculateHaversineDistance(uLat, uLng, r.location.lat, r.location.lng)
            : null;
          return { ...r, distanceMeters: dist };
        });

        if (maxDistance) {
          const maxDist = parseFloat(maxDistance);
          restaurants = restaurants.filter(r => r.distanceMeters !== null && r.distanceMeters <= maxDist);
        }

        // Sort by closest distance first if geo was provided
        restaurants.sort((a, b) => (a.distanceMeters || 999999) - (b.distanceMeters || 999999));
      }
    }

    return res.json({
      count: restaurants.length,
      restaurants,
    });
  } catch (err) {
    console.error('[Restaurants] Get error:', err);
    return res.status(500).json({ error: 'Failed to fetch restaurants.' });
  }
});

/**
 * GET /api/restaurants/owner/my-restaurants - List restaurants for logged-in owner
 */
router.get('/owner/my-restaurants', authenticateToken, requireRole('restaurant_owner'), (req, res) => {
  try {
    const restaurants = db.restaurants.find({ ownerId: req.user._id });
    return res.json({
      count: restaurants.length,
      restaurants,
    });
  } catch (err) {
    console.error('[Restaurants] Owner list error:', err);
    return res.status(500).json({ error: 'Failed to fetch owner restaurants.' });
  }
});

/**
 * GET /api/restaurants/:id - Detail view of a restaurant
 */
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const { id } = req.params;
    const restaurant = db.restaurants.findById(id);

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    // Fetch verified reviews for this restaurant
    const reviews = db.reviews.find({ restaurantId: id });
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      restaurant,
      reviews,
    });
  } catch (err) {
    console.error('[Restaurants] Detail error:', err);
    return res.status(500).json({ error: 'Failed to fetch restaurant details.' });
  }
});

/**
 * POST /api/restaurants - Register a new restaurant (Owner only)
 */
router.post('/', authenticateToken, requireRole('restaurant_owner'), (req, res) => {
  try {
    const {
      name,
      tagline,
      description,
      address,
      lat,
      lng,
      geofenceRadiusMeters = 200,
      cuisine = [],
      priceRange = '₹₹',
      phone,
      email,
      coverImage,
      billImage,
      photos = [],
      menuItems = [],
    } = req.body;

    if (!name || !address || lat == null || lng == null) {
      return res.status(400).json({
        error: 'Restaurant name, address, latitude, and longitude are required.',
      });
    }

    if (!billImage || !String(billImage).trim()) {
      return res.status(400).json({
        error: 'Restaurant bill/receipt upload is mandatory for verification. Please upload a clear photo of your official restaurant bill.',
      });
    }

    const newRestaurant = db.restaurants.create({
      ownerId: req.user._id,
      name: name.trim(),
      tagline: tagline || '',
      description: description || '',
      address: address.trim(),
      taluk: req.body.taluk || '',
      location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
      geofenceRadiusMeters: parseInt(geofenceRadiusMeters, 10) || 200,
      region: req.body.region || 'Downtown Metro',
      cuisine: Array.isArray(cuisine) ? cuisine : [cuisine],
      priceRange: priceRange || 'As per menu',
      phone: phone || '',
      email: email || req.user.email,
      coverImage: coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80',
      billImage: billImage || '',
      photos: photos.length > 0 ? photos : [coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80'],
      menuItems: menuItems.map((item, idx) => ({
        id: item.id || `m_${Date.now()}_${idx}`,
        name: item.name,
        description: item.description || '',
        price: parseFloat(item.price) || 0,
        category: item.category || 'Specialty',
        image: item.image || '',
      })),
      isApproved: false, // requires admin approval
      ratingAverage: 0,
      reviewCount: 0,
    });

    return res.status(201).json({
      message: 'Restaurant registered successfully! It is pending admin approval before appearing in public listings.',
      restaurant: newRestaurant,
    });
  } catch (err) {
    console.error('[Restaurants] Create error:', err);
    return res.status(500).json({ error: 'Failed to create restaurant listing.' });
  }
});

/**
 * PUT /api/restaurants/:id - Update restaurant profile and menu
 */
router.put('/:id', authenticateToken, requireRole('restaurant_owner'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.restaurants.findById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    if (existing.ownerId !== req.user._id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You are not authorized to edit this restaurant.' });
    }

    const {
      name,
      tagline,
      description,
      address,
      lat,
      lng,
      geofenceRadiusMeters,
      cuisine,
      priceRange,
      phone,
      email,
      coverImage,
      photos,
      menuItems,
    } = req.body;

    const updates = {};
    if (name) updates.name = name.trim();
    if (tagline !== undefined) updates.tagline = tagline;
    if (description !== undefined) updates.description = description;
    if (address) updates.address = address.trim();
    if (req.body.taluk !== undefined) updates.taluk = req.body.taluk;
    if (lat != null && lng != null) {
      updates.location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    }
    if (geofenceRadiusMeters != null) {
      updates.geofenceRadiusMeters = parseInt(geofenceRadiusMeters, 10);
    }
    if (cuisine) updates.cuisine = Array.isArray(cuisine) ? cuisine : [cuisine];
    if (priceRange) updates.priceRange = priceRange;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (coverImage) updates.coverImage = coverImage;
    if (req.body.billImage !== undefined) updates.billImage = req.body.billImage;
    if (photos) updates.photos = photos;
    if (menuItems) updates.menuItems = menuItems;

    const updated = db.restaurants.findByIdAndUpdate(id, updates);

    return res.json({
      message: 'Restaurant profile updated successfully.',
      restaurant: updated,
    });
  } catch (err) {
    console.error('[Restaurants] Update error:', err);
    return res.status(500).json({ error: 'Failed to update restaurant.' });
  }
});

/**
 * PATCH /api/restaurants/:id/approval - Approve/Reject restaurant listing (Admin or dev shortcut)
 */
router.patch('/:id/approval', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved } = req.body;

    const restaurant = db.restaurants.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    // Only admin, regional_admin, or the restaurant owner themselves can trigger approval toggle
    if (restaurant.ownerId !== req.user._id && req.user.role !== 'admin' && req.user.role !== 'regional_admin') {
      return res.status(403).json({ error: 'You are not authorized to update approval status for this restaurant.' });
    }

    const updated = db.restaurants.findByIdAndUpdate(id, {
      isApproved: isApproved !== undefined ? Boolean(isApproved) : true,
    });

    return res.json({
      message: `Restaurant listing status updated to ${updated.isApproved ? 'APPROVED' : 'PENDING'}.`,
      restaurant: updated,
    });
  } catch (err) {
    console.error('[Restaurants] Approval error:', err);
    return res.status(500).json({ error: 'Failed to update approval status.' });
  }
});

export default router;
