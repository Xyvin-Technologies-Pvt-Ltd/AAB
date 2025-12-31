import Package from './package.model.js';
import Client from '../client/client.model.js';

export const createPackage = async (packageData) => {
  // Verify client exists
  const client = await Client.findById(packageData.clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const packageDoc = await Package.create(packageData);
  return await Package.findById(packageDoc._id)
    .populate('clientId', 'name status')
    .populate('services', 'name')
    .populate('activities', 'name');
};

export const getPackages = async (filters = {}) => {
  const { clientId, type, status, search, page = 1, limit = 10 } = filters;

  const query = {};

  if (clientId) {
    query.clientId = clientId;
  }

  if (type) {
    query.type = type;
  }

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  // If search is provided, prioritize client name search, then package name
  if (search) {
    // First, find clients matching the search term
    const matchingClients = await Client.find({
      name: { $regex: search, $options: 'i' },
    }).select('_id');

    const matchingClientIds = matchingClients.map((client) => client._id);

    // Build search query: prioritize client matches, then package name matches
    const searchQuery = {
      ...query,
      $or: [
        // Priority 1: Packages with matching client names
        ...(matchingClientIds.length > 0
          ? [{ clientId: { $in: matchingClientIds } }]
          : []),
        // Priority 2: Packages with matching names
        { name: { $regex: search, $options: 'i' } },
      ],
    };

    // Use aggregation to sort by priority (client matches first)
    const aggregationPipeline = [
      { $match: searchQuery },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'clientData',
          pipeline: [{ $project: { name: 1, status: 1 } }],
        },
      },
      { $unwind: { path: '$clientData', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          // Add priority field: 1 for client match, 2 for package name match
          searchPriority: {
            $cond: {
              if: {
                $regexMatch: {
                  input: { $ifNull: ['$clientData.name', ''] },
                  regex: search,
                  options: 'i',
                },
              },
              then: 1,
              else: 2,
            },
          },
        },
      },
      { $sort: { searchPriority: 1, createdAt: -1 } },
      {
        $lookup: {
          from: 'services',
          localField: 'services',
          foreignField: '_id',
          as: 'servicesData',
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $lookup: {
          from: 'activities',
          localField: 'activities',
          foreignField: '_id',
          as: 'activitiesData',
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      {
        $project: {
          searchPriority: 0,
          'clientData._id': 0,
        },
      },
      { $skip: skip },
      { $limit: limit },
    ];

    // Get total count
    const totalQuery = Package.countDocuments(searchQuery);

    // Get packages with aggregation
    const packagesQuery = Package.aggregate(aggregationPipeline);

    const [packages, total] = await Promise.all([packagesQuery, totalQuery]);

    // Transform the response to match the expected structure
    const transformedPackages = packages.map((pkg) => {
      const transformed = {
        ...pkg,
        clientId: pkg.clientData
          ? {
              _id: pkg.clientData._id,
              name: pkg.clientData.name,
              status: pkg.clientData.status,
            }
          : null,
        services: pkg.servicesData?.map((service) => ({
          _id: service._id,
          name: service.name,
        })) || [],
        activities: pkg.activitiesData?.map((activity) => ({
          _id: activity._id,
          name: activity.name,
        })) || [],
      };
      // Remove temporary fields
      delete transformed.clientData;
      delete transformed.servicesData;
      delete transformed.activitiesData;
      return transformed;
    });

    return {
      packages: transformedPackages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // No search - use regular query
  const [packages, total] = await Promise.all([
    Package.find(query)
      .populate('clientId', 'name status')
      .populate('services', 'name')
      .populate('activities', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Package.countDocuments(query),
  ]);

  return {
    packages,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getPackageById = async (packageId) => {
  const packageDoc = await Package.findById(packageId)
    .populate('clientId', 'name status')
    .populate('services', 'name')
    .populate('activities', 'name');
  if (!packageDoc) {
    throw new Error('Package not found');
  }
  return packageDoc;
};

export const updatePackage = async (packageId, updateData) => {
  // If clientId is being updated, verify it exists
  if (updateData.clientId) {
    const client = await Client.findById(updateData.clientId);
    if (!client) {
      throw new Error('Client not found');
    }
  }

  const packageDoc = await Package.findByIdAndUpdate(packageId, updateData, {
    new: true,
    runValidators: true,
  })
    .populate('clientId', 'name status')
    .populate('services', 'name')
    .populate('activities', 'name');

  if (!packageDoc) {
    throw new Error('Package not found');
  }

  return packageDoc;
};

export const deletePackage = async (packageId) => {
  const packageDoc = await Package.findByIdAndDelete(packageId);
  if (!packageDoc) {
    throw new Error('Package not found');
  }
  return packageDoc;
};

