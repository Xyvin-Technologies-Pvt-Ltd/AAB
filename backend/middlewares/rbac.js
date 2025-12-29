import Team from '../modules/team/team.model.js';
import Employee from '../modules/employee/employee.model.js';

/**
 * Check if user has access to a resource based on their role
 * @param {Object} user - The authenticated user
 * @param {String} resource - The resource being accessed
 * @param {String} action - The action being performed (view, edit, delete)
 * @returns {Boolean} - True if user has access
 */
export const checkResourceAccess = (user, resource, action = 'view') => {
  const { role } = user;

  // ADMIN has full access to everything
  if (role === 'ADMIN') {
    return true;
  }

  // Resource-specific permissions
  const permissions = {
    analytics: {
      ADMIN: ['view', 'edit', 'delete'],
      MANAGER: ['view'], // Managers can view team analytics
      EMPLOYEE: [], // Employees cannot access analytics
    },
    settings: {
      ADMIN: ['view', 'edit', 'delete'],
      MANAGER: [],
      EMPLOYEE: [],
    },
    timeEntries: {
      ADMIN: ['view', 'edit', 'delete'],
      MANAGER: ['view'], // Managers can view team time entries
      EMPLOYEE: ['view'], // Employees can view their own
    },
    tasks: {
      ADMIN: ['view', 'edit', 'delete'],
      MANAGER: ['view', 'edit'], // Managers can manage team tasks
      EMPLOYEE: ['view', 'edit'], // Employees can manage their own tasks
    },
    employees: {
      ADMIN: ['view', 'edit', 'delete'],
      MANAGER: ['view'], // Managers can view team members
      EMPLOYEE: ['view'], // Employees can view their own profile
    },
    teams: {
      ADMIN: ['view', 'edit', 'delete'],
      MANAGER: ['view'], // Managers can view their teams
      EMPLOYEE: ['view'], // Employees can view their teams
    },
  };

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) {
    return false;
  }

  const rolePermissions = resourcePermissions[role] || [];
  return rolePermissions.includes(action);
};

/**
 * Get team IDs that a user has access to
 * @param {Object} user - The authenticated user
 * @returns {Promise<Array>} - Array of team IDs
 */
export const getUserTeamIds = async (user) => {
  if (!user.employeeId) {
    return [];
  }

  // Get teams where user is manager
  const managedTeams = await Team.find({
    managerId: user.employeeId,
    isActive: true,
  }).select('_id');

  // Get teams where user is a member
  const memberTeams = await Team.find({
    members: user.employeeId,
    isActive: true,
  }).select('_id');

  // Combine and return unique team IDs
  const allTeamIds = [
    ...managedTeams.map((t) => t._id),
    ...memberTeams.map((t) => t._id),
  ];

  return [...new Set(allTeamIds.map((id) => id.toString()))];
};

/**
 * Get employee IDs that a user has access to
 * @param {Object} user - The authenticated user
 * @returns {Promise<Array>} - Array of employee IDs
 */
export const getUserAccessibleEmployeeIds = async (user) => {
  if (user.role === 'ADMIN') {
    // ADMIN can access all employees
    const allEmployees = await Employee.find({ isActive: true }).select('_id');
    return allEmployees.map((e) => e._id.toString());
  }

  if (user.role === 'MANAGER' && user.employeeId) {
    // MANAGER can access their team members
    const teams = await Team.find({
      $or: [{ managerId: user.employeeId }, { members: user.employeeId }],
      isActive: true,
    })
      .populate('members', '_id')
      .select('members managerId');

    const employeeIds = new Set();
    
    // Add manager's own ID
    employeeIds.add(user.employeeId.toString());

    // Add all team members
    teams.forEach((team) => {
      if (team.managerId) {
        employeeIds.add(team.managerId.toString());
      }
      if (team.members) {
        team.members.forEach((member) => {
          employeeIds.add(member._id.toString());
        });
      }
    });

    return Array.from(employeeIds);
  }

  if (user.role === 'EMPLOYEE' && user.employeeId) {
    // EMPLOYEE can only access themselves
    return [user.employeeId.toString()];
  }

  return [];
};

/**
 * Filter query based on user's team access
 * @param {Object} query - MongoDB query object
 * @param {Object} user - The authenticated user
 * @param {String} field - The field to filter by (e.g., 'employeeId')
 * @returns {Promise<Object>} - Filtered query
 */
export const filterByTeam = async (query, user, field = 'employeeId') => {
  if (user.role === 'ADMIN') {
    // ADMIN can see everything, no filtering needed
    return query;
  }

  const accessibleEmployeeIds = await getUserAccessibleEmployeeIds(user);
  
  if (accessibleEmployeeIds.length === 0) {
    // No access, return query that matches nothing
    query[field] = { $in: [] };
    return query;
  }

  // Filter by accessible employee IDs
  if (query[field]) {
    // If field already exists, combine with $in
    if (query[field].$in) {
      query[field].$in = query[field].$in.filter((id) =>
        accessibleEmployeeIds.includes(id.toString())
      );
    } else {
      // If it's a single value, check if it's accessible
      if (!accessibleEmployeeIds.includes(query[field].toString())) {
        query[field] = { $in: [] };
      }
    }
  } else {
    query[field] = { $in: accessibleEmployeeIds };
  }

  return query;
};

/**
 * Middleware to check team access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const checkTeamAccess = async (req, res, next) => {
  try {
    const { user } = req;

    if (user.role === 'ADMIN') {
      return next();
    }

    // For MANAGER and EMPLOYEE, verify they have access to the requested resource
    const accessibleEmployeeIds = await getUserAccessibleEmployeeIds(user);

    if (accessibleEmployeeIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have permission to access this resource.',
      });
    }

    req.accessibleEmployeeIds = accessibleEmployeeIds;
    next();
  } catch (error) {
    next(error);
  }
};

