import Team from './team.model.js';
import Employee from '../employee/employee.model.js';
import mongoose from 'mongoose';

export const createTeam = async (teamData) => {
  // Verify manager exists
  const manager = await Employee.findById(teamData.managerId);
  if (!manager) {
    throw new Error('Manager not found');
  }

  // Verify all members exist
  if (teamData.members && teamData.members.length > 0) {
    const members = await Employee.find({ _id: { $in: teamData.members } });
    if (members.length !== teamData.members.length) {
      throw new Error('One or more members not found');
    }
  }

  const team = await Team.create(teamData);
  return await Team.findById(team._id)
    .populate('managerId', 'name email designation')
    .populate('members', 'name email designation');
};

export const getTeams = async (filters = {}) => {
  const { managerId, isActive, page = 1, limit = 10 } = filters;
  const query = {};

  if (managerId) {
    query.managerId = managerId;
  }

  if (isActive !== undefined) {
    query.isActive = isActive;
  }

  const skip = (page - 1) * limit;

  const [teams, total] = await Promise.all([
    Team.find(query)
      .populate('managerId', 'name email designation')
      .populate('members', 'name email designation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Team.countDocuments(query),
  ]);

  return {
    teams,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getTeamById = async (teamId) => {
  const team = await Team.findById(teamId)
    .populate('managerId', 'name email designation')
    .populate('members', 'name email designation');

  if (!team) {
    throw new Error('Team not found');
  }

  return team;
};

export const getTeamsByManager = async (managerId) => {
  return await Team.find({ managerId, isActive: true })
    .populate('managerId', 'name email designation')
    .populate('members', 'name email designation');
};

export const getTeamsByMember = async (employeeId) => {
  return await Team.find({ members: employeeId, isActive: true })
    .populate('managerId', 'name email designation')
    .populate('members', 'name email designation');
};

export const updateTeam = async (teamId, updateData) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // Verify manager exists if being updated
  if (updateData.managerId) {
    const manager = await Employee.findById(updateData.managerId);
    if (!manager) {
      throw new Error('Manager not found');
    }
  }

  // Verify all members exist if being updated
  if (updateData.members && updateData.members.length > 0) {
    const members = await Employee.find({ _id: { $in: updateData.members } });
    if (members.length !== updateData.members.length) {
      throw new Error('One or more members not found');
    }
  }

  Object.assign(team, updateData);
  await team.save();

  return await Team.findById(team._id)
    .populate('managerId', 'name email designation')
    .populate('members', 'name email designation');
};

export const deleteTeam = async (teamId) => {
  const team = await Team.findById(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  await Team.findByIdAndDelete(teamId);
  return { message: 'Team deleted successfully' };
};

