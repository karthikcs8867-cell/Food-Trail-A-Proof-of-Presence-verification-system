import express from 'express';
import { db } from '../models/dbStore.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { redeemVoucher } from '../services/voucherService.js';

const router = express.Router();

/**
 * GET /api/vouchers/my-wallet - Customer voucher wallet
 */
router.get('/my-wallet', authenticateToken, requireRole('customer'), (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();

    // Fetch customer's vouchers
    let allVouchers = db.vouchers.find({ userId });

    // Check for expired vouchers and update them
    allVouchers = allVouchers.map(v => {
      if (v.status === 'active' && new Date(v.expiresAt) < now) {
        return db.vouchers.findByIdAndUpdate(v._id, { status: 'expired' });
      }
      return v;
    });

    // Sort newest first
    allVouchers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const active = allVouchers.filter(v => v.status === 'active');
    const redeemed = allVouchers.filter(v => v.status === 'redeemed');
    const expired = allVouchers.filter(v => v.status === 'expired');

    return res.json({
      totalCount: allVouchers.length,
      active,
      redeemed,
      expired,
    });
  } catch (err) {
    console.error('[Vouchers] Wallet error:', err);
    return res.status(500).json({ error: 'Failed to retrieve voucher wallet.' });
  }
});

/**
 * GET /api/vouchers/lookup/:code - Lookup voucher details for owner verification before redeeming
 */
router.get('/lookup/:code', authenticateToken, requireRole('restaurant_owner', 'admin'), (req, res) => {
  try {
    const { code } = req.params;
    let cleanCode = code.trim();

    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.code) cleanCode = parsed.code;
      } catch (e) {
        // ignore
      }
    }

    const voucher = db.vouchers.findOne({ voucherCode: cleanCode });
    if (!voucher) {
      return res.status(404).json({ error: `No voucher found with code "${cleanCode}".` });
    }

    // Lookup customer details
    const customer = db.users.findById(voucher.userId);

    return res.json({
      voucher,
      customer: customer ? { name: customer.name, email: customer.email } : null,
    });
  } catch (err) {
    console.error('[Vouchers] Lookup error:', err);
    return res.status(500).json({ error: 'Voucher lookup failed.' });
  }
});

/**
 * POST /api/vouchers/redeem - Restaurant owner marks a voucher as redeemed
 */
router.post('/redeem', authenticateToken, requireRole('restaurant_owner', 'admin'), (req, res) => {
  try {
    const { voucherCode, restaurantId } = req.body;

    if (!voucherCode) {
      return res.status(400).json({ error: 'voucherCode is required.' });
    }

    const result = redeemVoucher(voucherCode, req.user._id, restaurantId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (err) {
    console.error('[Vouchers] Redeem error:', err);
    return res.status(500).json({ error: 'Failed to redeem voucher.' });
  }
});

export default router;
