import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { db } from '../models/dbStore.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.users.findById(decoded.userId || decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User no longer exists.' });
    }

    req.user = {
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      assignedRegion: user.assignedRegion || user.region || null,
      region: user.assignedRegion || user.region || null,
      avatarUrl: user.avatarUrl,
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.users.findById(decoded.userId || decoded.id);
    if (user) {
      req.user = {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedRegion: user.assignedRegion || user.region || null,
        region: user.assignedRegion || user.region || null,
        avatarUrl: user.avatarUrl,
      };
    }
  } catch (err) {
    req.user = null;
  }
  next();
}
