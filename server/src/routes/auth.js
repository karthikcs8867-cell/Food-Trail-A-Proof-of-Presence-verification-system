import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models/dbStore.js';
import { config } from '../config/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      assignedRegion: user.assignedRegion || user.region || null,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

/**
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role = 'customer' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!['customer', 'restaurant_owner', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "customer", "restaurant_owner", or "admin".' });
    }

    const existingUser = db.users.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultAvatar = role === 'restaurant_owner'
      ? 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

    const newUser = db.users.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role,
      authProvider: 'local',
      avatarUrl: defaultAvatar,
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        _id: newUser._id,
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl,
        authProvider: newUser.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedRegion: user.assignedRegion || user.region || null,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * POST /api/auth/oauth-mock (Seamless Google / Meta OAuth simulation & real handshake)
 */
router.post('/oauth-mock', async (req, res) => {
  try {
    const { provider, role = 'customer', email, name, avatarUrl } = req.body;

    if (!['google', 'meta'].includes(provider)) {
      return res.status(400).json({ error: 'Provider must be "google" or "meta".' });
    }

    const targetEmail = (email || `${provider}_user_${Math.floor(100 + Math.random() * 900)}@foodtrail.com`).toLowerCase().trim();
    let user = db.users.findOne({ email: targetEmail });

    if (!user) {
      user = db.users.create({
        name: name || (provider === 'google' ? 'Google Trailblazer' : 'Meta Foodie Explorer'),
        email: targetEmail,
        role: role,
        authProvider: provider,
        avatarUrl: avatarUrl || (provider === 'google'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'),
      });
    }

    const token = generateToken(user);

    return res.json({
      message: `${provider.toUpperCase()} OAuth authentication successful.`,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth] OAuth error:', err);
    return res.status(500).json({ error: 'OAuth authentication failed.' });
  }
});

/**
 * POST /api/auth/demo-login (1-click quick switcher for Customer, Restaurant Owner, or Admin)
 */
router.post('/demo-login', async (req, res) => {
  try {
    const { persona } = req.body; // 'customer' | 'owner' | 'admin'

    let targetEmail = 'customer@foodtrail.com';
    let fallbackRole = 'customer';
    if (persona === 'owner') {
      targetEmail = 'owner@foodtrail.com';
      fallbackRole = 'restaurant_owner';
    } else if (persona === 'admin') {
      targetEmail = 'admin@foodtrail.com';
      fallbackRole = 'admin';
    }

    let user = db.users.findOne({ email: targetEmail });
    if (!user && persona === 'owner') {
      user = db.users.findOne({ email: 'test_owner@foodtrail.com' }) || db.users.findOne({ role: 'restaurant_owner' });
    }
    if (!user && persona === 'admin') {
      user = db.users.findOne({ email: 'main_admin@foodtrail.com' }) || db.users.findOne({ role: 'admin' });
    }
    if (!user && persona === 'customer') {
      user = db.users.findOne({ role: 'customer' });
    }

    if (!user) {
      const demoProfiles = {
        customer: {
          name: 'Alex Rivera (Demo Diner)',
          email: 'customer@foodtrail.com',
          role: 'customer',
          avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        },
        owner: {
          name: 'Chef Marco (Demo Owner)',
          email: 'owner@foodtrail.com',
          role: 'restaurant_owner',
          avatarUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80',
        },
        admin: {
          name: 'Elena Vance (Platform Admin)',
          email: 'admin@foodtrail.com',
          role: 'admin',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        },
      };

      const profile = demoProfiles[persona] || demoProfiles.customer;
      const defaultHash = await bcrypt.hash('Demo@123', 10);
      user = db.users.create({
        ...profile,
        passwordHash: defaultHash,
        authProvider: 'demo',
      });
    }

    const token = generateToken(user);

    return res.json({
      message: `Logged in as ${user.name} (${user.role}).`,
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedRegion: user.assignedRegion || user.region || null,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth] Demo login error:', err);
    return res.status(500).json({ error: 'Demo switch failed.' });
  }
});

/**
 * GET /api/auth/me (Get current profile)
 */
router.get('/me', authenticateToken, (req, res) => {
  const user = db.users.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({
    user: {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedRegion: user.assignedRegion || user.region || null,
      avatarUrl: user.avatarUrl,
      authProvider: user.authProvider,
    },
  });
});

export default router;
