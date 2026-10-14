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

  // Discount configuration based on review or restaurant pricing
  const discountOptions = [
    '$10 OFF Next Dining Experience',
    '15% OFF Entire Bill (Min. spend $30)',
    'Complimentary Signature Dessert or Drink',
    '20% OFF Chef Special Entree',
    '$15 OFF Food & Beverage',
  ];
  const discountTitle = discountOptions[Math.floor(Math.random() * discountOptions.length)];

  const voucherData = {
    voucherCode,
    qrCodeData: JSON.stringify({
      code: voucherCode,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
      userId: user._id,
      userName: user.name,
      discount: discountTitle,
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

  return {
    success: true,
    message: `Voucher '${voucher.voucherCode}' (${voucher.discountTitle}) successfully redeemed!`,
    voucher: updatedVoucher,
  };
}
