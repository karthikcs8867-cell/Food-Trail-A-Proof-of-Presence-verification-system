import crypto from 'crypto';
import { db } from '../models/dbStore.js';

/**
 * Generates a unique, friendly voucher code (e.g. FT-TRAT-8492)
 */
function generateVoucherCode(restaurantName) {
  const prefix = (restaurantName || 'FOOD')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 4)
    .toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `FT-${prefix}-${randomSuffix}`;
}

/**
 * Issues an automatic gift voucher to a customer when a verified review is submitted
 * @param {object} user - Customer user
 * @param {object} restaurant - Restaurant object
 * @param {object} review - The verified review object
 * @returns {object} created voucher record
 */
export function issueVoucherForVerifiedReview(user, restaurant, review) {
  const voucherCode = generateVoucherCode(restaurant.name);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

  // Discount configuration: generate both a percentage (1-10%) and a rupee amount (₹1-100)
  // Retrieve admin-configured discount limits (percentage 1‑50% and amount)
  const config = db.voucherConfigs.findOne() || { maxPercent: 10, maxAmount: 100 };
  const maxPercent = Math.min(Math.max(config.maxPercent || 10, 1), 50); // enforce 1‑50% range
  const maxAmount = config.maxAmount || 100;
  const perc = Math.floor(Math.random() * maxPercent) + 1; // 1‑% to maxPercent%
  const amt = Math.floor(Math.random() * maxAmount) + 1; // ₹1 to maxAmount
  // Store both values for later comparison during redemption
  const discountTitle = `${perc}% OFF or ₹${amt} OFF`;

  const voucherData = {
    voucherCode,
    qrCodeData: JSON.stringify({
      code: voucherCode,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      userId: user._id,
      userName: user.name,
      discount: discountTitle,
      perc,
      amt,
      expiresAt: expiresAt.toISOString(),
      securitySig: crypto.createHash('sha256').update(`${voucherCode}-${restaurant._id}`).digest('hex').slice(0, 16),
    }),
    userId: user._id,
    restaurantId: restaurant._id,
    restaurantName: restaurant.name,
    restaurantCover: restaurant.coverImage || restaurant.photos?.[0] || '',
    restaurantAddress: restaurant.address,
    reviewId: review._id,
    discountTitle,
    perc,
    amt,
    status: 'active', // 'active' | 'redeemed' | 'expired'
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  const createdVoucher = db.vouchers.create(voucherData);
  console.log(`[VoucherService] Issued new voucher ${voucherCode} for user ${user.name} at ${restaurant.name}`);
  return createdVoucher;
}

/**
 * Redeems a voucher presented by a customer at the restaurant
 * @param {string} voucherCode - e.g. "FT-TRAT-8492" or scanned JSON string
 * @param {string} ownerUserId - The logged-in restaurant owner ID
 * @param {string} specificRestaurantId - Optional restriction
 */
export function redeemVoucher(voucherCode, ownerUserId, specificRestaurantId = null) {
  let cleanCode = voucherCode.trim();

  // If QR code data was passed as raw JSON, parse out the voucher code
  if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
    try {
      const parsed = JSON.parse(cleanCode);
      if (parsed.code) cleanCode = parsed.code;
    } catch (e) {
      // Keep original
    }
  }

  const voucher = db.vouchers.findOne({ voucherCode: cleanCode });
  if (!voucher) {
    return {
      success: false,
      error: `Voucher code '${cleanCode}' was not found in the system.`,
    };
  }

  // Check if already redeemed
  if (voucher.status === 'redeemed') {
    return {
      success: false,
      error: `This voucher has already been redeemed on ${new Date(voucher.redeemedAt).toLocaleString()}.`,
      voucher,
    };
  }

  // Check if expired
  if (new Date(voucher.expiresAt) < new Date()) {
    db.vouchers.findByIdAndUpdate(voucher._id, { status: 'expired' });
    return {
      success: false,
      error: `This voucher expired on ${new Date(voucher.expiresAt).toLocaleDateString()}.`,
      voucher,
    };
  }

  // Verify restaurant owner authority:
  // If owner owns the restaurant or specificRestaurantId matches
  if (specificRestaurantId && voucher.restaurantId !== specificRestaurantId) {
    return {
      success: false,
      error: `This voucher is only valid at '${voucher.restaurantName}', not at your current restaurant.`,
      voucher,
    };
  }

  // Redeem the voucher!
  const updatedVoucher = db.vouchers.findByIdAndUpdate(voucher._id, {
    status: 'redeemed',
    redeemedAt: new Date().toISOString(),
    redeemedByOwnerId: ownerUserId,
  });

  // Determine which discount is greater (percentage vs amount)
  const applyPerc = voucher.perc >= voucher.amt;
  const appliedDiscount = applyPerc ? `${voucher.perc}% OFF` : `₹${voucher.amt} OFF`;
  return {
    success: true,
    message: `Voucher '${voucher.voucherCode}' (${appliedDiscount}) successfully redeemed!`,
    appliedDiscount,
    voucher: updatedVoucher,
  };
}
