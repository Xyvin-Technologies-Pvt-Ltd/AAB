import * as teamService from './team.service.js';
import { successResponse, errorResponse } from '../../helpers/response.js';
import { parsePage, parseLimit } from '../../helpers/pagination.js';
import { invalidateTags } from '../../helpers/cache.js';
import { CACHE_TAGS } from '../../helpers/cacheTags.js';

// Team membership feeds MANAGER-role RBAC filtering used across analytics.
const TEAM_TAGS = [CACHE_TAGS.TEAMS, CACHE_TAGS.ANALYTICS];

export const createTeam = async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.body);
    await invalidateTags(TEAM_TAGS);
    return successResponse(res, 201, 'Team created successfully', team);
  } catch (error) {
    next(error);
  }
};

export const getTeams = async (req, res, next) => {
  try {
    const filters = {
      ...req.query,
      page: parsePage(req.query.page),
      // Reference data; lightweight documents.
      limit: parseLimit(req.query.limit, 10, 2000),
    };
    const result = await teamService.getTeams(filters);
    return successResponse(res, 200, 'Teams retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (req, res, next) => {
  try {
    const team = await teamService.getTeamById(req.params.id);
    return successResponse(res, 200, 'Team retrieved successfully', team);
  } catch (error) {
    next(error);
  }
};

export const getTeamsByManager = async (req, res, next) => {
  try {
    const teams = await teamService.getTeamsByManager(req.params.managerId);
    return successResponse(res, 200, 'Teams retrieved successfully', { teams });
  } catch (error) {
    next(error);
  }
};

export const getTeamsByMember = async (req, res, next) => {
  try {
    const teams = await teamService.getTeamsByMember(req.params.employeeId);
    return successResponse(res, 200, 'Teams retrieved successfully', { teams });
  } catch (error) {
    next(error);
  }
};

export const updateTeam = async (req, res, next) => {
  try {
    const team = await teamService.updateTeam(req.params.id, req.body);
    await invalidateTags(TEAM_TAGS);
    return successResponse(res, 200, 'Team updated successfully', team);
  } catch (error) {
    next(error);
  }
};

export const deleteTeam = async (req, res, next) => {
  try {
    const result = await teamService.deleteTeam(req.params.id);
    await invalidateTags(TEAM_TAGS);
    return successResponse(res, 200, 'Team deleted successfully', result);
  } catch (error) {
    next(error);
  }
};
