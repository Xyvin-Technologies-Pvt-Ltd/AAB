import Activity from './activity.model.js';

export const createActivity = async (activityData) => {
  const activity = await Activity.create(activityData);
  return activity;
};

export const getActivities = async (filters = {}) => {
  const { search, page = 1, limit = 10 } = filters;

  const query = {};

  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    Activity.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Activity.countDocuments(query),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getActivityById = async (activityId) => {
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }
  return activity;
};

export const updateActivity = async (activityId, updateData) => {
  const activity = await Activity.findByIdAndUpdate(activityId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!activity) {
    throw new Error('Activity not found');
  }

  return activity;
};

export const deleteActivity = async (activityId) => {
  const activity = await Activity.findByIdAndDelete(activityId);
  if (!activity) {
    throw new Error('Activity not found');
  }
  return activity;
};

