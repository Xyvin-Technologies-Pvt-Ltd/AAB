import express from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/auth.js';
import * as teamController from './team.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get teams - accessible to all authenticated users
router.get('/', teamController.getTeams);

// Get team by ID - accessible to all authenticated users
router.get('/:id', teamController.getTeamById);

// Get teams by manager - accessible to all authenticated users
router.get('/manager/:managerId', teamController.getTeamsByManager);

// Get teams by member - accessible to all authenticated users
router.get('/member/:employeeId', teamController.getTeamsByMember);

// Create, update, delete - ADMIN only
router.post('/', authorize('ADMIN'), teamController.createTeam);
router.put('/:id', authorize('ADMIN'), teamController.updateTeam);
router.delete('/:id', authorize('ADMIN'), teamController.deleteTeam);

export default router;

