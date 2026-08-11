import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/auth.js';
import { cacheRoute } from '../../middlewares/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';
import * as teamController from './team.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All team routes are admin-only
router.use(authorize('ADMIN'));

// Get teams - admin only
router.get('/', cacheRoute([CACHE_TAGS.TEAMS], { ttl: 120 }), teamController.getTeams);

// Get team by ID - admin only
router.get('/:id', cacheRoute([CACHE_TAGS.TEAMS], { ttl: 120 }), teamController.getTeamById);

// Get teams by manager - admin only
router.get(
  '/manager/:managerId',
  cacheRoute([CACHE_TAGS.TEAMS], { ttl: 120 }),
  teamController.getTeamsByManager
);

// Get teams by member - admin only
router.get(
  '/member/:employeeId',
  cacheRoute([CACHE_TAGS.TEAMS], { ttl: 120 }),
  teamController.getTeamsByMember
);

router.post('/', teamController.createTeam);
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

export default router;

