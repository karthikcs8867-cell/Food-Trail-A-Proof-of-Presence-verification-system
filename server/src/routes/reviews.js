import express from 'express';
import { db } from '../models/dbStore.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';
import { verifyProximity } from '../services/geoService.js';
import { verifyBillReceipt } from '../services/ocrService.js';
import { issueVoucherForVerifiedReview } from '../services/voucherService.js';

const router = express.Router();

/**
 * POST /api/reviews/verify-location - Test/Check proximity against a restaurant before submission
 */
router.post('/verify-location', authenticateToken, (req, res) => {
  try {
    const { restaurantId, userLat, userLng } = req.body;

    if (!restaurantId || userLat == null || userLng == null) {
      return res.status(400).json({ error: 'restaurantId, userLat, and userLng are required.' });
    }

    const restaurant = db.restaurants.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    if (!restaurant.location || restaurant.location.lat == null || restaurant.location.lng == null) {
      return res.status(400).json({ error: 'Restaurant does not have registered GPS coordinates.' });
    }

    const radius = Number(restaurant.geofenceRadiusMeters) || 200;
    const result = verifyProximity(userLat, userLng, restaurant.location.lat, restaurant.location.lng, radius, 0);

    return res.json({
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        location: restaurant.location,
        geofenceRadiusMeters: radius,
      },
      verification: result,
    });
  } catch (err) {
    console.error('[Reviews] Location verify error:', err);
    return res.status(500).json({ error: 'Location verification failed.' });
  }
});

/**
 * POST /api/reviews/verify-bill - Upload and OCR analyze receipt image
 */
router.post('/verify-bill', authenticateToken, upload.single('receiptImage'), async (req, res) => {
  try {
    const { restaurantId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a receipt image file.' });
    }

    if (!restaurantId) {
      return res.status(400).json({ error: 'restaurantId is required.' });
    }

    const restaurant = db.restaurants.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }

    const billImageUrl = `/uploads/${req.file.filename}`;
    const ocrResult = await verifyBillReceipt(req.file.path, restaurant);

    return res.json({
      billImageUrl,
      ocrResult,
    });
  } catch (err) {
    console.error('[Reviews] Bill verify error:', err);
    return res.status(500).json({ error: 'Bill verification failed.' });
  }
});

/**
 * POST /api/reviews - Submit review and auto-issue reward voucher
 */
router.post('/', authenticateToken, requireRole('customer'), async (req, res) => {
  try {
    const {
      restaurantId,
      rating,
      comment,
      photos = [],
      verificationType, // 'live_location' | 'bill_proof'
      userLocation, // { lat, lng } if live_location
      billData, // { billImageUrl, extractedText, detectedDate } if bill_proof
    } = req.body;

    if (!restaurantId || !rating || !comment || !verificationType) {
      return res.status(400).json({
        error: 'restaurantId, rating (1-5), comment, and verificationType are required.',
      });
    }

    const restaurant = db.restaurants.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Target restaurant not found.' });
    }

    let verificationDetails = {};

    // 1. Validate Live Location
    if (verificationType === 'live_location') {
      if (!userLocation || userLocation.lat == null || userLocation.lng == null) {
        return res.status(400).json({ error: 'User GPS coordinates required for live location verification.' });
      }

      if (!restaurant.location || restaurant.location.lat == null || restaurant.location.lng == null) {
        return res.status(400).json({ error: 'Target restaurant does not have registered GPS coordinates.' });
      }

      const radius = Number(restaurant.geofenceRadiusMeters) || 200;
      const geoCheck = verifyProximity(userLocation.lat, userLocation.lng, restaurant.location.lat, restaurant.location.lng, radius, 0);

      if (!geoCheck.isWithinRadius) {
        return res.status(400).json({
          error: `Proximity verification failed: You are ${geoCheck.distanceMeters}m away from the restaurant. Reviews by live location can only be submitted when you are physically at the registered restaurant location (within ${radius}m radius).`,
          geoCheck,
        });
      }

      verificationDetails = {
        userLocation: { lat: userLocation.lat, lng: userLocation.lng },
        distanceMeters: geoCheck.distanceMeters,
        isProximityVerified: true,
        verifiedAt: new Date().toISOString(),
      };
    }
    // 2. Validate Bill Proof
    else if (verificationType === 'bill_proof') {
      if (!billData || !billData.billImageUrl) {
        return res.status(400).json({ error: 'Bill receipt image and verification data required.' });
      }

      verificationDetails = {
        billImageUrl: billData.billImageUrl,
        extractedText: billData.extractedText || 'Receipt Scan Verified',
        matchedRestaurantName: Boolean(billData.matchedRestaurantName ?? true),
        detectedDate: billData.detectedDate || new Date().toISOString().split('T')[0],
        isBillVerified: true,
        verifiedAt: new Date().toISOString(),
      };
    } else {
      return res.status(400).json({ error: 'Invalid verificationType. Must be "live_location" or "bill_proof".' });
    }

    // 3. Create the Review
    const newReview = db.reviews.create({
      restaurantId,
      restaurantName: restaurant.name,
      userId: req.user._id,
      userName: req.user.name,
      userAvatar: req.user.avatarUrl,
      rating: Math.max(1, Math.min(5, parseInt(rating, 10))),
      comment: comment.trim(),
      photos: Array.isArray(photos) ? photos : [photos],
      verificationType,
      verificationDetails,
    });

    // 4. Update Restaurant average rating & review count
    const allReviews = db.reviews.find({ restaurantId });
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = Math.round((totalRating / allReviews.length) * 10) / 10;

    db.restaurants.findByIdAndUpdate(restaurantId, {
      ratingAverage: avgRating,
      reviewCount: allReviews.length,
    });

    // 5. AUTO-ISSUE GIFT VOUCHER to Customer Wallet
    const voucher = issueVoucherForVerifiedReview(req.user, restaurant, newReview);

    // Link voucher to review
    db.reviews.findByIdAndUpdate(newReview._id, { voucherIssuedId: voucher._id });

    return res.status(201).json({
      message: 'Review successfully verified and submitted! A new reward gift voucher has been added to your wallet.',
      review: newReview,
      voucher,
    });
  } catch (err) {
    console.error('[Reviews] Submit error:', err);
    return res.status(500).json({ error: 'Failed to submit review.' });
  }
});

/**
 * GET /api/reviews - Get all verified reviews across the platform (optionally filtered by restaurantId, userId, or region)
 */
router.get('/', (req, res) => {
  try {
    const { restaurantId, userId, region } = req.query;
    let reviews = db.reviews.find();

    if (restaurantId) {
      reviews = reviews.filter(r => r.restaurantId === restaurantId);
    }
    if (userId) {
      reviews = reviews.filter(r => r.userId === userId);
    }

    // Enrich with restaurant details if missing
    reviews = reviews.map(r => {
      const rest = db.restaurants.findById(r.restaurantId);
      return {
        ...r,
        restaurantName: r.restaurantName || (rest ? rest.name : 'Unknown Restaurant'),
        restaurantRegion: rest ? (rest.region || 'Downtown Metro') : 'Downtown Metro',
      };
    });

    if (region && region !== 'All') {
      reviews = reviews.filter(r => (r.restaurantRegion || '').toLowerCase() === region.toLowerCase());
    }

    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      count: reviews.length,
      reviews,
    });
  } catch (err) {
    console.error('[Reviews] List all error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

/**
 * GET /api/reviews/restaurant/:restaurantId - Get all verified reviews for a restaurant
 */
router.get('/restaurant/:restaurantId', (req, res) => {
  try {
    const { restaurantId } = req.params;
    const reviews = db.reviews.find({ restaurantId });
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({
      count: reviews.length,
      reviews,
    });
  } catch (err) {
    console.error('[Reviews] List error:', err);
    return res.status(500).json({ error: 'Failed to fetch reviews.' });
  }
});

export default router;
