import express from 'express';
import { db } from '../models/dbStore.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

/**
 * GET /api/analytics/owner-dashboard - Analytics metrics for restaurant owner
 */
router.get('/owner-dashboard', authenticateToken, requireRole('restaurant_owner', 'admin'), (req, res) => {
  try {
    const ownerId = req.user._id;
    const isSuperAdmin = req.user.role === 'admin';
    const { restaurantId } = req.query;

    // Get restaurants owned by this user
    let ownedRestaurants = isSuperAdmin ? db.restaurants.find() : db.restaurants.find({ ownerId });

    // If a specific restaurant is requested, filter analytics to only that one
    let analyticsRestaurants = ownedRestaurants;
    if (restaurantId) {
      analyticsRestaurants = ownedRestaurants.filter(r => r._id === restaurantId);
    }
    const restaurantIds = analyticsRestaurants.map(r => r._id);

    // Get all reviews for these restaurants
    const allReviews = db.reviews.find().filter(r => restaurantIds.includes(r.restaurantId));

    // Get all vouchers for these restaurants
    const allVouchers = db.vouchers.find().filter(v => restaurantIds.includes(v.restaurantId));

    // 1. Core KPIs
    const totalReviews = allReviews.length;
    const avgRating = totalReviews > 0
      ? Math.round((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 0;

    const liveLocationCount = allReviews.filter(r => r.verificationType === 'live_location').length;
    const billProofCount = allReviews.filter(r => r.verificationType === 'bill_proof').length;

    const totalVouchersIssued = allVouchers.length;
    const totalVouchersRedeemed = allVouchers.filter(v => v.status === 'redeemed').length;
    const totalVouchersActive = allVouchers.filter(v => v.status === 'active').length;
    const redemptionRate = totalVouchersIssued > 0
      ? Math.round((totalVouchersRedeemed / totalVouchersIssued) * 100)
      : 0;

    // 2. Rating Breakdown (1 to 5 stars)
    const ratingBreakdown = {
      5: allReviews.filter(r => r.rating === 5).length,
      4: allReviews.filter(r => r.rating === 4).length,
      3: allReviews.filter(r => r.rating === 3).length,
      2: allReviews.filter(r => r.rating === 2).length,
      1: allReviews.filter(r => r.rating === 1).length,
    };

    // 3. Recent activity streams
    const recentReviews = [...allReviews]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    const recentRedemptions = allVouchers
      .filter(v => v.status === 'redeemed')
      .sort((a, b) => new Date(b.redeemedAt || b.updatedAt) - new Date(a.redeemedAt || a.updatedAt))
      .slice(0, 5);

    return res.json({
      restaurantsCount: ownedRestaurants.length,
      restaurants: ownedRestaurants,
      kpis: {
        totalReviews,
        avgRating,
        liveLocationCount,
        billProofCount,
        verifiedRate: '100%', // All FoodTrail reviews are verified by design
        totalVouchersIssued,
        totalVouchersRedeemed,
        totalVouchersActive,
        redemptionRate,
        estimatedRevenueImpact: totalVouchersRedeemed * 48, // based on avg basket size
      },
      ratingBreakdown,
      recentReviews,
      recentRedemptions,
    });
  } catch (err) {
    console.error('[Analytics] Dashboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
});

export default router;
