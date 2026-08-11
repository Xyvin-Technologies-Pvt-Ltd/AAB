import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';
import User from '../modules/auth/auth.model.js';
import { errorResponse } from '../helpers/response.js';
import { getCachedUser, setCachedUser } from '../helpers/userCache.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return errorResponse(res, 401, 'Authentication required');
    }

    const decoded = jwt.verify(token, jwtConfig.secret);

    // This lookup runs on every authenticated request, so a short-TTL cache
    // avoids a DB round trip + full document hydration per call. See
    // helpers/userCache.js for invalidation details.
    let user = await getCachedUser(decoded.id);
    if (!user) {
      user = await User.findById(decoded.id).select('-password').lean();
      if (user) {
        // Mongoose documents expose a virtual `id` (string form of `_id`);
        // .lean() skips virtuals, but several controllers read req.user.id,
        // so replicate it explicitly to keep behaviour identical.
        user.id = user._id.toString();
        await setCachedUser(decoded.id, user);
      }
    }

    if (!user || !user.isActive) {
      return errorResponse(res, 401, 'User not found or inactive');
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 401, 'Invalid or expired token');
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, 403, 'Access denied. Insufficient permissions.');
    }

    next();
  };
};

