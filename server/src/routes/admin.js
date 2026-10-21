import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../models/dbStore.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Apply auth to all admin endpoints
router.use(authenticateToken, requireRole('admin', 'regional_admin'));

/**
 * GET /api/admin/users - List all platform users
 */
router.get('/users', (req, res) => {
  try {
    const users = db.users.find().map(u => {
      const reviewCount = db.reviews.find({ userId: u._id }).length;
      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        assignedRegion: u.assignedRegion || u.region || null,
        createdAt: u.createdAt,
        avatarUrl: u.avatarUrl,
        reviewCount,
      };
    });

    return res.json({ count: users.length, users });
  } catch (err) {
    console.error('[Admin] Get users error:', err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/regional-admins - List all regional admins (Main Admin only)
 */
router.get('/regional-admins', (req, res) => {
  try {
    const regionalAdmins = db.users.find({ role: 'regional_admin' }).map(u => ({
      id: u._id,
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      assignedRegion: u.assignedRegion || u.region || 'Unassigned',
      assignmentReason: u.assignmentReason || u.reason || 'Territory supervision & quality compliance',
      createdAt: u.createdAt,
      avatarUrl: u.avatarUrl,
    }));

    return res.json({ count: regionalAdmins.length, regionalAdmins });
  } catch (err) {
    console.error('[Admin] Get regional admins error:', err);
    return res.status(500).json({ error: 'Failed to fetch regional admins' });
  }
});

/**
 * POST /api/admin/regional-admins - Create a new regional admin (Main Admin only)
 */
router.post('/regional-admins', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the Main Admin can create Regional Admins.' });
    }

    const { name, email, password, region, assignmentReason, reason } = req.body;

    if (!name || !email || !password || !region) {
      return res.status(400).json({ error: 'Name, email, password, and assigned region are required.' });
    }

    const existingUser = db.users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newRegionalAdmin = db.users.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'regional_admin',
      assignedRegion: region.trim(),
      region: region.trim(),
      assignmentReason: (assignmentReason || reason || 'Territory management & listing moderation').trim(),
      authProvider: 'local',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    });

    return res.status(201).json({
      message: `Regional Admin account created for ${newRegionalAdmin.name} (${newRegionalAdmin.assignedRegion}).`,
      admin: {
        id: newRegionalAdmin._id,
        _id: newRegionalAdmin._id,
        name: newRegionalAdmin.name,
        email: newRegionalAdmin.email,
        role: newRegionalAdmin.role,
        assignedRegion: newRegionalAdmin.assignedRegion,
        assignmentReason: newRegionalAdmin.assignmentReason,
        createdAt: newRegionalAdmin.createdAt,
      },
    });
  } catch (err) {
    console.error('[Admin] Create regional admin error:', err);
    return res.status(500).json({ error: 'Failed to create regional admin' });
  }
});

/**
 * GET /api/admin/restaurants - List restaurants (scoped by region if regional_admin or query filter)
 */
router.get('/restaurants', (req, res) => {
  try {
    let restaurants = db.restaurants.find();

    // If caller is regional admin, strictly scope to their assigned region
    if (req.user.role === 'regional_admin') {
      const userRegion = (req.user.assignedRegion || req.user.region || '').toLowerCase();
      restaurants = restaurants.filter(r => (r.region || '').toLowerCase() === userRegion);
    } else if (req.query.region && req.query.region !== 'All') {
      // Main admin can filter by region
      const qRegion = req.query.region.toLowerCase();
      restaurants = restaurants.filter(r => (r.region || '').toLowerCase() === qRegion);
    }

    // Enrich with owner name and review statistics
    const enriched = restaurants.map(r => {
      const owner = db.users.findById(r.ownerId);
      const reviews = db.reviews.find({ restaurantId: r._id });
      const avgRating = reviews.length > 0
        ? Math.round((reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length) * 10) / 10
        : (r.ratingAverage || 0);

      return {
        ...r,
        id: r._id,
        ownerName: owner ? owner.name : (r.ownerName || 'Unknown Owner'),
        ownerEmail: owner ? owner.email : '',
        averageRating: avgRating,
        reviewCount: reviews.length,
        status: r.status || (r.isApproved ? 'approved' : 'pending'),
        region: r.region || 'Downtown Metro',
      };
    });

    return res.json({ count: enriched.length, restaurants: enriched });
  } catch (err) {
    console.error('[Admin] Get restaurants error:', err);
    return res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

/**
 * POST /api/admin/restaurants/:id/approve - Approve restaurant with optional reason
 */
router.post('/restaurants/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const restaurant = db.restaurants.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Regional admin verification: ensure restaurant belongs to their region
    if (req.user.role === 'regional_admin') {
      const userRegion = (req.user.assignedRegion || req.user.region || '').toLowerCase();
      const restRegion = (restaurant.region || '').toLowerCase();
      if (userRegion && restRegion && userRegion !== restRegion) {
        return res.status(403).json({ error: 'You are only authorized to approve restaurants in your assigned region.' });
      }
    }

    const updated = db.restaurants.findByIdAndUpdate(id, {
      isApproved: true,
      status: 'approved',
      approvalReason: reason || 'Approved after regional verification and documentation check.',
      approvedBy: req.user.name,
      approvedByRole: req.user.role,
      approvedAt: new Date().toISOString(),
    });

    return res.json({
      message: `Restaurant "${updated.name}" has been approved!`,
      restaurant: updated,
    });
  } catch (err) {
    console.error('[Admin] Approve restaurant error:', err);
    return res.status(500).json({ error: 'Failed to approve restaurant' });
  }
});

/**
 * POST /api/admin/restaurants/:id/reject - Reject restaurant with reason
 */
router.post('/restaurants/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const restaurant = db.restaurants.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Regional admin verification: ensure restaurant belongs to their region
    if (req.user.role === 'regional_admin') {
      const userRegion = (req.user.assignedRegion || req.user.region || '').toLowerCase();
      const restRegion = (restaurant.region || '').toLowerCase();
      if (userRegion && restRegion && userRegion !== restRegion) {
        return res.status(403).json({ error: 'You are only authorized to reject restaurants in your assigned region.' });
      }
    }

    const updated = db.restaurants.findByIdAndUpdate(id, {
      isApproved: false,
      status: 'rejected',
      rejectionReason: reason || 'Listing does not meet regional guidelines.',
      rejectedBy: req.user.name,
      rejectedByRole: req.user.role,
      rejectedAt: new Date().toISOString(),
    });

    return res.json({
      message: `Restaurant "${updated.name}" has been rejected.`,
      restaurant: updated,
    });
  } catch (err) {
    console.error('[Admin] Reject restaurant error:', err);
    return res.status(500).json({ error: 'Failed to reject restaurant' });
  }
});

/**
 * DELETE /api/admin/restaurants/:id - Delete / Delist an underperforming restaurant
 */
router.delete('/restaurants/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const restaurant = db.restaurants.findById(id);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Regional admin verification: ensure restaurant belongs to their region
    if (req.user.role === 'regional_admin') {
      const userRegion = (req.user.assignedRegion || req.user.region || '').toLowerCase();
      const restRegion = (restaurant.region || '').toLowerCase();
      if (userRegion && restRegion && userRegion !== restRegion) {
        return res.status(403).json({ error: 'You are only authorized to delete restaurants in your assigned region.' });
      }
    }

    const restName = restaurant.name;
    // Delete restaurant and associated reviews
    db.restaurants.deleteOne({ _id: id });
    db.reviews.deleteMany({ restaurantId: id });
    db.vouchers.deleteMany({ restaurantId: id });

    return res.json({
      message: `Restaurant "${restName}" has been deleted from FoodTrail. Reason: ${reason || 'Delisted by regional administrator.'}`,
      deletedId: id,
    });
  } catch (err) {
    console.error('[Admin] Delete restaurant error:', err);
    return res.status(500).json({ error: 'Failed to delete restaurant' });
  }
});

/**
 * GET /api/admin/voucher-config - Retrieve voucher discount limits (Admin only)
 */
router.get('/voucher-config', (req, res) => {
  try {
    const config = db.voucherConfigs.findOne() || { maxPercent: 10, maxAmount: 100 };
    return res.json({
      config: {
        percent: config.maxPercent || 10,
        amount: config.maxAmount || 100,
        maxPercent: config.maxPercent || 10,
        maxAmount: config.maxAmount || 100,
      }
    });
  } catch (err) {
    console.error('[Admin] Get voucher config error:', err);
    return res.status(500).json({ error: 'Failed to fetch voucher configuration' });
  }
});

/**
 * POST /api/admin/voucher-config - Save voucher discount limits (Super Admin only)
 */
router.post('/voucher-config', (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the Super Admin can configure voucher discounts.' });
    }

    const { percent, amount, maxPercent, maxAmount } = req.body;
    const finalPercent = Math.min(Math.max(Number(percent ?? maxPercent) || 10, 1), 50);
    const finalAmount = Math.max(Number(amount ?? maxAmount) || 0, 0);

    const existing = db.voucherConfigs.findOne();
    let updated;
    if (existing) {
      updated = db.voucherConfigs.findByIdAndUpdate(existing._id, {
        maxPercent: finalPercent,
        maxAmount: finalAmount,
      });
    } else {
      updated = db.voucherConfigs.create({
        maxPercent: finalPercent,
        maxAmount: finalAmount,
      });
    }

    return res.json({
      message: 'Voucher discount configuration saved successfully.',
      config: {
        percent: updated.maxPercent,
        amount: updated.maxAmount,
        maxPercent: updated.maxPercent,
        maxAmount: updated.maxAmount,
      }
    });
  } catch (err) {
    console.error('[Admin] Save voucher config error:', err);
    return res.status(500).json({ error: 'Failed to save voucher configuration' });
  }
});

export default router;
