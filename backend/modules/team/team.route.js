import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/auth.js';
import * as teamController from './team.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All team routes are admin-only
router.use(authorize('ADMIN'));

// Get teams - admin only
router.get('/', teamController.getTeams);

// Get team by ID - admin only
router.get('/:id', teamController.getTeamById);

// Get teams by manager - admin only
router.get('/manager/:managerId', teamController.getTeamsByManager);

// Get teams by member - admin only
router.get('/member/:employeeId', teamController.getTeamsByMember);

router.post('/', teamController.createTeam);
router.put('/:id', teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

export default router;

