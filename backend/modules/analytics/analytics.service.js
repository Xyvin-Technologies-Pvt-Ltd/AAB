import Package from '../package/package.model.js';
import TimeEntry from '../timeEntry/timeEntry.model.js';
import Employee from '../employee/employee.model.js';
import Client from '../client/client.model.js';
import {
  normalizeRevenueToMonthly,
  calculatePackageCost,
  calculatePackageProfitability,
  calculateHourlyCost,
  calculateCycleMetrics,
  getEmployeeHourlyRate,
} from '../../helpers/calculations.js';
import {
  buildDateRangeQuery,
  getProratedPeriodCost,
  getDubaiDateParts,
  startOfDay,
  endOfDay,
  toDateString,
} from '../../helpers/dateRange.js';

/**
 * Get package profitability analytics
 */
export const getPackageProfitability = async (filters = {}, user = null) => {
  const {
    packageId,
    clientId,
    employeeId,
    packageType,
    billingFrequency,
    startDate,
    endDate,
    _accessibleEmployeeIds,
    page = 1,
    limit = 10,
    search = '',
  } = filters;

  const query = {};
  if (packageId) {
    query._id = packageId;
  }
  if (clientId) {
    query.clientId = clientId;
  }
  if (packageType) {
    query.type = packageType;
  }
  if (billingFrequency) {
    query.billingFrequency = billingFrequency;
  }

  // Add search filter
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const packages = await Package.find(query).populate('clientId', 'name').lean();

  // The per-package TimeEntry filter below (date range, employee filter, and
  // MANAGER/EMPLOYEE team scoping) is identical for every package in this
  // request - only packageId varied. Build it once and fetch every package's
  // time entries in a single $in query instead of one query per package.
  const timeEntryFilter = {};
  if (startDate || endDate) {
    timeEntryFilter.date = buildDateRangeQuery(startDate, endDate);
  }
  if (employeeId) {
    timeEntryFilter.employeeId = employeeId;
  }

  // MANAGER scoping: if an employeeId filter is set and it isn't in the
  // accessible list, every package used to return null (access denied) -
  // i.e. the whole result set is empty. Check that once up front.
  if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
    if (employeeId) {
      if (!_accessibleEmployeeIds.includes(employeeId)) {
        return {
          results: [],
          pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, pages: 0 },
        };
      }
      timeEntryFilter.employeeId = employeeId;
    } else {
      timeEntryFilter.employeeId = { $in: _accessibleEmployeeIds };
    }
  } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
    timeEntryFilter.employeeId = user.employeeId;
  }

  const packageIds = packages.map((pkg) => pkg._id);
  const timeEntries = packageIds.length
    ? await TimeEntry.find({ ...timeEntryFilter, packageId: { $in: packageIds } }).lean()
    : [];

  // Group time entries by package
  const entriesByPackage = new Map();
  for (const entry of timeEntries) {
    const key = entry.packageId.toString();
    if (!entriesByPackage.has(key)) {
      entriesByPackage.set(key, []);
    }
    entriesByPackage.get(key).push(entry);
  }

  // Fetch every referenced employee once instead of re-fetching per package.
  const allEmployeeIds = [...new Set(timeEntries.map((te) => te.employeeId?.toString()).filter(Boolean))];
  const employees = allEmployeeIds.length
    ? await Employee.find({ _id: { $in: allEmployeeIds } }).lean()
    : [];
  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp,
      hourlyCost: getEmployeeHourlyRate(emp),
    };
  });

  const filteredResults = packages.map((pkg) => {
    const pkgTimeEntries = entriesByPackage.get(pkg._id.toString()) || [];

    // Calculate monthly cost
    const monthlyCost = calculatePackageCost(pkgTimeEntries, employeesMap);

    // Get monthly revenue (normalized)
    const monthlyRevenue = normalizeRevenueToMonthly(
      pkg.contractValue,
      pkg.billingFrequency,
      pkg.type
    );

    // Calculate normalized profitability
    const profitability = calculatePackageProfitability(monthlyRevenue, monthlyCost);

    // Calculate cycle metrics
    const cycleMetrics = calculateCycleMetrics(
      pkg.type,
      pkg.billingFrequency,
      pkg.contractValue,
      pkgTimeEntries,
      employeesMap,
      startDate,
      endDate,
      pkg.startDate
    );

    return {
      packageId: pkg._id,
      packageName: pkg.name,
      clientId: pkg.clientId._id,
      clientName: pkg.clientId.name,
      type: pkg.type,
      billingFrequency: pkg.billingFrequency,
      contractValue: pkg.contractValue,
      ...profitability, // Normalized monthly metrics
      ...cycleMetrics, // Per-cycle metrics
      timeEntriesCount: pkgTimeEntries.length,
      totalHours: pkgTimeEntries.reduce((sum, te) => sum + te.minutesSpent / 3600, 0),
    };
  });

  // Apply search filter on results (client name, package name)
  let finalResults = filteredResults;
  if (search) {
    const searchLower = search.toLowerCase();
    finalResults = filteredResults.filter((r) => {
      return (
        r.packageName?.toLowerCase().includes(searchLower) ||
        r.clientName?.toLowerCase().includes(searchLower)
      );
    });
  }

  // Pagination
  const total = finalResults.length;
  const skip = (page - 1) * limit;
  const paginatedResults = finalResults.slice(skip, skip + limit);
  const totalPages = Math.ceil(total / limit);

  return {
    results: paginatedResults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: totalPages,
    },
  };
};

/**
 * Get client profitability analytics
 */
export const getClientProfitability = async (filters = {}, user = null) => {
  const {
    clientId,
    employeeId,
    packageType,
    billingFrequency,
    startDate,
    endDate,
    _accessibleEmployeeIds,
    page = 1,
    limit = 10,
    search = '',
  } = filters;

  const query = {};
  if (clientId) {
    query._id = clientId;
  }

  // Add search filter
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }

  const clients = await Client.find(query).lean();

  // Fetch every package for every matching client in one query instead of
  // one query per client.
  const clientIds = clients.map((c) => c._id);
  const packageQuery = { clientId: { $in: clientIds } };
  if (packageType) {
    packageQuery.type = packageType;
  }
  if (billingFrequency) {
    packageQuery.billingFrequency = billingFrequency;
  }
  const allPackages = clientIds.length ? await Package.find(packageQuery).lean() : [];

  const packagesByClient = new Map();
  for (const pkg of allPackages) {
    const key = pkg.clientId.toString();
    if (!packagesByClient.has(key)) {
      packagesByClient.set(key, []);
    }
    packagesByClient.get(key).push(pkg);
  }

  // The per-package TimeEntry filter below (date range, employee filter, and
  // MANAGER/EMPLOYEE team scoping) is identical for every package under
  // every client - only packageId varied before. Build it once.
  const timeEntryFilter = {};
  if (startDate || endDate) {
    timeEntryFilter.date = buildDateRangeQuery(startDate, endDate);
  }
  if (employeeId) {
    timeEntryFilter.employeeId = employeeId;
  }

  // MANAGER scoping: if an employeeId filter is set and it isn't in the
  // accessible list, every package under every client used to resolve to
  // null (access denied), so every client ends up with zero packages.
  // accessDenied captures that without running any TimeEntry/Employee query.
  let accessDenied = false;
  if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
    if (employeeId) {
      if (!_accessibleEmployeeIds.includes(employeeId)) {
        accessDenied = true;
      } else {
        timeEntryFilter.employeeId = employeeId;
      }
    } else {
      timeEntryFilter.employeeId = { $in: _accessibleEmployeeIds };
    }
  } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
    timeEntryFilter.employeeId = user.employeeId;
  }

  const allPackageIds = allPackages.map((pkg) => pkg._id);
  const timeEntries = !accessDenied && allPackageIds.length
    ? await TimeEntry.find({ ...timeEntryFilter, packageId: { $in: allPackageIds } }).lean()
    : [];

  const entriesByPackage = new Map();
  for (const entry of timeEntries) {
    const key = entry.packageId.toString();
    if (!entriesByPackage.has(key)) {
      entriesByPackage.set(key, []);
    }
    entriesByPackage.get(key).push(entry);
  }

  // Fetch every referenced employee once instead of re-fetching per package.
  const allEmployeeIds = [...new Set(timeEntries.map((te) => te.employeeId?.toString()).filter(Boolean))];
  const employees = allEmployeeIds.length
    ? await Employee.find({ _id: { $in: allEmployeeIds } }).lean()
    : [];
  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp,
      hourlyCost: getEmployeeHourlyRate(emp),
    };
  });

  const results = clients.map((client) => {
    const clientPackages = accessDenied ? [] : (packagesByClient.get(client._id.toString()) || []);

    // Get package profitability for each package
    const validPackageProfits = clientPackages.map((pkg) => {
      const pkgTimeEntries = entriesByPackage.get(pkg._id.toString()) || [];

      const monthlyCost = calculatePackageCost(pkgTimeEntries, employeesMap);
      const monthlyRevenue = normalizeRevenueToMonthly(
        pkg.contractValue,
        pkg.billingFrequency,
        pkg.type
      );
      const profitability = calculatePackageProfitability(monthlyRevenue, monthlyCost);

      // Calculate cycle metrics
      const cycleMetrics = calculateCycleMetrics(
        pkg.type,
        pkg.billingFrequency,
        pkg.contractValue,
        pkgTimeEntries,
        employeesMap,
        startDate,
        endDate,
        pkg.startDate
      );

      return {
        packageId: pkg._id,
        packageName: pkg.name,
        type: pkg.type,
        billingFrequency: pkg.billingFrequency,
        ...profitability, // Normalized monthly metrics
        ...cycleMetrics, // Per-cycle metrics
      };
    });

    // Aggregate client totals (normalized monthly)
    const totalRevenue = validPackageProfits.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = validPackageProfits.reduce((sum, p) => sum + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Aggregate cycle totals
    const totalCycleRevenue = validPackageProfits.reduce((sum, p) => sum + (p.totalCycleRevenue || 0), 0);
    const totalCycleCost = validPackageProfits.reduce((sum, p) => sum + (p.totalCycleCost || 0), 0);
    const totalCycleProfit = totalCycleRevenue - totalCycleCost;
    const cycleMargin = totalCycleRevenue > 0 ? (totalCycleProfit / totalCycleRevenue) * 100 : 0;

    return {
      clientId: client._id,
      clientName: client.name,
      totalRevenue,
      totalCost,
      totalProfit,
      margin: parseFloat(margin.toFixed(2)),
      totalCycleRevenue: parseFloat(totalCycleRevenue.toFixed(2)),
      totalCycleCost: parseFloat(totalCycleCost.toFixed(2)),
      totalCycleProfit: parseFloat(totalCycleProfit.toFixed(2)),
      cycleMargin: parseFloat(cycleMargin.toFixed(2)),
      packagesCount: validPackageProfits.length,
      packages: validPackageProfits,
    };
  });

  // Filter out null results
  const filteredResults = results.filter((r) => r !== null);

  // Pagination
  const total = filteredResults.length;
  const skip = (page - 1) * limit;
  const paginatedResults = filteredResults.slice(skip, skip + limit);
  const totalPages = Math.ceil(total / limit);

  return {
    results: paginatedResults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: totalPages,
    },
  };
};

/**
 * Get employee utilization analytics
 */
export const getEmployeeUtilization = async (filters = {}, user = null) => {
  const {
    clientId,
    packageId,
    employeeId,
    startDate,
    endDate,
    _accessibleEmployeeIds,
    page = 1,
    limit = 10,
    search = '',
  } = filters;

  const timeEntryQuery = {};
  if (startDate || endDate) {
    timeEntryQuery.date = buildDateRangeQuery(startDate, endDate);
  }

  // Apply client filter
  if (clientId) {
    timeEntryQuery.clientId = clientId;
  }

  // Apply package filter
  if (packageId) {
    timeEntryQuery.packageId = packageId;
  }

  // Apply employee filter
  if (employeeId) {
    timeEntryQuery.employeeId = employeeId;
  }

  // Apply team filtering for MANAGER role
  if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
    if (employeeId) {
      if (!_accessibleEmployeeIds.includes(employeeId)) {
        return []; // Return empty if employee not accessible
      }
      timeEntryQuery.employeeId = employeeId;
    } else {
      timeEntryQuery.employeeId = { $in: _accessibleEmployeeIds };
    }
  } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
    // EMPLOYEE can only see their own utilization
    timeEntryQuery.employeeId = user.employeeId;
  }

  // Aggregate time entries by employee. The employeeId populate already
  // selects every field the calculations below need (including hourlyRate),
  // so there's no need to separately re-fetch full Employee documents.
  const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
    'employeeId',
    'name monthlyCost monthlyWorkingHours hourlyRate'
  ).populate('clientId', 'name').populate('packageId', 'name').lean();

  // Group by employee
  const employeeMap = {};
  const clientPackageMap = {}; // Track breakdown by client/package

  timeEntries.forEach((entry) => {
    const empId = entry.employeeId._id.toString();
    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        employeeId: entry.employeeId._id,
        employeeName: entry.employeeId.name,
        monthlyCost: entry.employeeId.monthlyCost,
        monthlyWorkingHours: entry.employeeId.monthlyWorkingHours,
        hourlyRate: entry.employeeId.hourlyRate,
        hoursLogged: 0,
        timeEntriesCount: 0,
        costContribution: 0,
        breakdown: {}, // Breakdown by client/package
      };
    }

    // minutesSpent is stored in seconds, convert to hours by dividing by 3600
    const hours = entry.minutesSpent / 3600;
    employeeMap[empId].hoursLogged += hours;

    const clientIdStr = entry.clientId?._id?.toString() || 'unknown';
    const packageIdStr = entry.packageId?._id?.toString() || 'unknown';
    const clientName = entry.clientId?.name || 'Unknown Client';
    const packageName = entry.packageId?.name || 'No Package';

    const key = `${clientIdStr}-${packageIdStr}`;
    if (!employeeMap[empId].breakdown[key]) {
      employeeMap[empId].breakdown[key] = {
        clientId: clientIdStr,
        clientName,
        packageId: packageIdStr,
        packageName,
        hours: 0,
        cost: 0,
      };
    }

    const hourlyCost = getEmployeeHourlyRate(employeeMap[empId]);
    const entryCost = hours * hourlyCost;

    employeeMap[empId].breakdown[key].hours += hours;
    employeeMap[empId].breakdown[key].cost += entryCost;

    employeeMap[empId].timeEntriesCount += 1;
  });

  // Calculate utilization and cost contribution
  const results = Object.values(employeeMap).map((emp) => {
    const hourlyCost = getEmployeeHourlyRate(emp);
    const serviceHoursCost = emp.hoursLogged * hourlyCost;
    const costContribution = serviceHoursCost;
    // Utilization: (serviceHours * hourlyCost) / monthlyCost * 100
    // Shows cost efficiency: >100% = generating more value than cost, <100% = costing more than value
    const utilizationRate = emp.monthlyCost > 0 ? (serviceHoursCost / emp.monthlyCost) * 100 : 0;

    // Convert breakdown object to array
    const breakdown = Object.values(emp.breakdown).map((item) => ({
      ...item,
      hours: parseFloat(item.hours.toFixed(2)),
      cost: parseFloat(item.cost.toFixed(2)),
    }));

    return {
      employeeId: emp.employeeId,
      employeeName: emp.employeeName,
      monthlyCost: emp.monthlyCost,
      monthlyWorkingHours: emp.monthlyWorkingHours,
      hourlyCost: parseFloat(hourlyCost.toFixed(2)),
      hoursLogged: parseFloat(emp.hoursLogged.toFixed(2)),
      utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      costContribution: parseFloat(costContribution.toFixed(2)),
      timeEntriesCount: emp.timeEntriesCount,
      breakdown: breakdown.length > 0 ? breakdown : undefined, // Only include if filters applied
    };
  });

  // Apply search filter
  let filteredResults = results;
  if (search) {
    const searchLower = search.toLowerCase();
    filteredResults = results.filter((r) => {
      return r.employeeName?.toLowerCase().includes(searchLower);
    });
  }

  // Pagination
  const total = filteredResults.length;
  const skip = (page - 1) * limit;
  const paginatedResults = filteredResults.slice(skip, skip + limit);
  const totalPages = Math.ceil(total / limit);

  return {
    results: paginatedResults,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: totalPages,
    },
  };
};

/**
 * Get client dashboard analytics with KPIs
 */
export const getClientDashboard = async (clientId, filters = {}) => {
  const { startDate, endDate } = filters;

  const Client = (await import('../client/client.model.js')).default;
  const client = await Client.findById(clientId).lean();
  if (!client) {
    throw new Error('Client not found');
  }

  // Get all packages for this client
  const packages = await Package.find({ clientId }).lean();

  // Get time entries for date range
  const timeEntryQuery = { clientId };
  if (startDate || endDate) {
    timeEntryQuery.date = buildDateRangeQuery(startDate, endDate);
  }

  const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
    'employeeId',
    'name monthlyCost monthlyWorkingHours'
  ).lean();

  // Calculate total hours logged (minutesSpent is stored in seconds)
  const totalHours = timeEntries.reduce((sum, te) => sum + te.minutesSpent / 3600, 0);

  // Get employee IDs and calculate costs
  const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId._id.toString()))];
  const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();

  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp,
      hourlyCost: getEmployeeHourlyRate(emp),
    };
  });

  // Calculate total cost
  const totalCost = calculatePackageCost(timeEntries, employeesMap);

  // Calculate total revenue from packages
  let totalRevenue = 0;
  const packageBreakdown = await Promise.all(
    packages.map(async (pkg) => {
      const pkgTimeEntries = timeEntries.filter(
        (te) => te.packageId.toString() === pkg._id.toString()
      );
      const pkgCost = calculatePackageCost(pkgTimeEntries, employeesMap);
      const pkgRevenue = normalizeRevenueToMonthly(
        pkg.contractValue,
        pkg.billingFrequency,
        pkg.type
      );

      const periodRevenue = startDate && endDate
        ? getProratedPeriodCost(pkgRevenue, startDate, endDate)
        : pkgRevenue;

      totalRevenue += periodRevenue;

      return {
        packageId: pkg._id,
        packageName: pkg.name,
        type: pkg.type,
        contractValue: pkg.contractValue,
        revenue: periodRevenue,
        cost: pkgCost,
        profit: periodRevenue - pkgCost,
        efficiency: pkgCost > 0 ? parseFloat(((periodRevenue / pkgCost) * 100).toFixed(2)) : 0,
        hoursLogged: pkgTimeEntries.reduce((sum, te) => sum + te.minutesSpent / 3600, 0),
      };
    })
  );

  // Calculate profitability metrics
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const costRatio = totalRevenue > 0 ? totalCost / totalRevenue : 0;

  // Determine profitability status
  let profitabilityStatus = 'HEALTHY';
  if (costRatio > 1.2) {
    profitabilityStatus = 'UNDERPAYING'; // Spending 20%+ more than earning
  } else if (profitMargin > 50) {
    profitabilityStatus = 'OVERPAYING'; // Might be overcharging
  }

  // Get tasks summary - counts only, so count in the DB instead of loading
  // every Task document (which can carry large comments/attachments/
  // activityLog arrays) just to filter by status in memory.
  const Task = (await import('../task/task.model.js')).default;
  const [totalTasks, completedTasks] = await Promise.all([
    Task.countDocuments({ clientId }),
    Task.countDocuments({ clientId, status: 'DONE' }),
  ]);
  const openTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  // Monthly trends (last 6 months if no date range specified)
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const monthEntries = timeEntries.filter(
      (te) =>
        new Date(te.date) >= monthStart && new Date(te.date) <= monthEnd
    );
    const monthCost = calculatePackageCost(monthEntries, employeesMap);
    const monthRevenue = totalRevenue / 6; // Approximate monthly revenue
    const monthProfit = monthRevenue - monthCost;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.push({
      month: `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`,
      revenue: monthRevenue,
      cost: monthCost,
      profit: monthProfit,
      hours: monthEntries.reduce((sum, te) => sum + te.minutesSpent / 3600, 0),
    });
  }

  return {
    clientId: client._id,
    clientName: client.name,
    kpis: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2)),
      packagesCount: packages.length,
      openTasks,
      completedTasks,
      completionRate: parseFloat(completionRate.toFixed(2)),
    },
    profitabilityStatus,
    packageBreakdown,
    monthlyTrends: months,
  };
};

/**
 * Get dashboard statistics for next 4 months
 * Returns tasks count and VAT/CT/Expiry submissions count by month
 */
export const getDashboardStatistics = async () => {
  const Task = (await import('../task/task.model.js')).default;
  const Client = (await import('../client/client.model.js')).default;
  const {
    calculateNextVATSubmissionDate,
    calculateNextCorporateTaxSubmissionDate,
  } = await import('../../services/compliance.service.js');

  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize data for next 4 months
  const monthsData = [];
  for (let i = 0; i < 4; i++) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    monthsData.push({
      month: monthDate.getMonth() + 1,
      year: monthDate.getFullYear(),
      monthLabel: `${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
      monthStart: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1),
      monthEnd: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0),
    });
  }

  // Get all tasks with due dates in next 4 months
  const fourMonthsFromNow = new Date(now.getFullYear(), now.getMonth() + 4, 0);
  const tasks = await Task.find({
    dueDate: {
      $gte: now,
      $lte: fourMonthsFromNow,
    },
  }).populate('clientId', 'name').lean();

  // Group tasks by month
  const tasksByMonth = monthsData.map((monthInfo) => {
    const monthTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getMonth() + 1 === monthInfo.month &&
        taskDate.getFullYear() === monthInfo.year
      );
    });

    return {
      month: monthInfo.month,
      monthLabel: monthInfo.monthLabel,
      todo: monthTasks.filter((t) => t.status === 'TODO').length,
      inProgress: monthTasks.filter((t) => t.status === 'IN_PROGRESS').length,
      done: monthTasks.filter((t) => t.status === 'DONE').length,
      total: monthTasks.length,
    };
  });

  // Get all active clients
  const clients = await Client.find({ status: 'ACTIVE' }).lean();

  // Helper function to generate VAT submissions for next 4 months
  const generateVATSubmissionsForMonths = (client, monthsData) => {
    const submissions = [];
    const now = new Date();
    const vatFilingDaysAfterPeriod = 28;
    const maxDate = monthsData[monthsData.length - 1].monthEnd;

    if (!client.businessInfo) return submissions;

    // Use tax periods if available
    if (client.businessInfo.vatTaxPeriods && client.businessInfo.vatTaxPeriods.length > 0) {
      const vatTaxPeriods = client.businessInfo.vatTaxPeriods;
      const sortedPeriods = [...vatTaxPeriods].sort((a, b) =>
        new Date(a.startDate) - new Date(b.startDate)
      );

      // Generate submissions for the next 4 months
      const generatedDates = new Set();
      const currentYear = now.getFullYear();

      // Generate submissions for current year and next year
      for (let yearOffset = 0; yearOffset <= 1; yearOffset++) {
        for (const period of sortedPeriods) {
          const periodStart = new Date(period.startDate);
          const periodEnd = new Date(period.endDate);

          const targetPeriodStart = new Date(periodStart);
          targetPeriodStart.setFullYear(currentYear + yearOffset);

          const targetPeriodEnd = new Date(periodEnd);
          targetPeriodEnd.setFullYear(currentYear + yearOffset);

          const submissionDate = new Date(targetPeriodEnd);
          submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

          // Only add if within date range and not already added
          const dateKey = submissionDate.toISOString().split('T')[0];
          if (
            submissionDate >= now &&
            submissionDate <= maxDate &&
            !generatedDates.has(dateKey)
          ) {
            generatedDates.add(dateKey);
            submissions.push({
              submissionDate: new Date(submissionDate),
            });
          }
        }
      }
    } else if (client.businessInfo.vatReturnCycle) {
      // Fallback to cycle-based calculation
      const cycle = client.businessInfo.vatReturnCycle;
      let currentDate = new Date(now);

      if (cycle === 'MONTHLY') {
        while (currentDate <= maxDate) {
          const periodEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          const submissionDate = new Date(periodEndDate);
          submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

          if (submissionDate >= now && submissionDate <= maxDate) {
            submissions.push({
              submissionDate: new Date(submissionDate),
            });
          }

          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      } else if (cycle === 'QUARTERLY') {
        while (currentDate <= maxDate) {
          const periodEndDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, 0);
          const submissionDate = new Date(periodEndDate);
          submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

          if (submissionDate >= now && submissionDate <= maxDate) {
            submissions.push({
              submissionDate: new Date(submissionDate),
            });
          }

          currentDate.setMonth(currentDate.getMonth() + 3);
        }
      }
    }

    return submissions;
  };

  // Group submissions by month (VAT, Corporate Tax, Expiry)
  const submissionsByMonth = monthsData.map((monthInfo) => {
    let vat = 0;
    let corporateTax = 0;
    let expiry = 0;

    clients.forEach((client) => {
      // VAT submissions - get all for next 4 months
      const vatSubmissions = generateVATSubmissionsForMonths(client, monthsData);
      vatSubmissions.forEach((submission) => {
        const submissionDate = new Date(submission.submissionDate);
        if (
          submissionDate.getMonth() + 1 === monthInfo.month &&
          submissionDate.getFullYear() === monthInfo.year
        ) {
          vat++;
        }
      });

      // Corporate Tax submissions - only next one
      const ctSubmission = calculateNextCorporateTaxSubmissionDate(client);
      if (ctSubmission && ctSubmission.submissionDate) {
        const submissionDate = new Date(ctSubmission.submissionDate);
        if (
          submissionDate.getMonth() + 1 === monthInfo.month &&
          submissionDate.getFullYear() === monthInfo.year &&
          submissionDate >= now
        ) {
          corporateTax++;
        }
      }

      // License expiry
      if (client.businessInfo?.licenseExpiryDate) {
        const expiryDate = new Date(client.businessInfo.licenseExpiryDate);
        if (
          expiryDate.getMonth() + 1 === monthInfo.month &&
          expiryDate.getFullYear() === monthInfo.year &&
          expiryDate >= now
        ) {
          expiry++;
        }
      }
    });

    return {
      month: monthInfo.month,
      monthLabel: monthInfo.monthLabel,
      vat,
      corporateTax,
      expiry,
      total: vat + corporateTax + expiry,
    };
  });

  return {
    tasks: tasksByMonth,
    submissions: submissionsByMonth,
  };
};

/**
 * Get detailed package analytics
 */
export const getPackageAnalytics = async (packageId, filters = {}, user = null) => {
  const {
    employeeId,
    taskId,
    startDate,
    endDate,
    _accessibleEmployeeIds,
  } = filters;

  const pkg = await Package.findById(packageId).populate('clientId', 'name');
  if (!pkg) {
    throw new Error('Package not found');
  }

  // Build time entry query
  const timeEntryQuery = { packageId: pkg._id };
  if (startDate || endDate) {
    timeEntryQuery.date = buildDateRangeQuery(startDate, endDate);
  }

  if (employeeId) {
    timeEntryQuery.employeeId = employeeId;
  }

  if (taskId) {
    timeEntryQuery.taskId = taskId;
  }

  // Apply team filtering for MANAGER role
  if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
    if (employeeId) {
      if (!_accessibleEmployeeIds.includes(employeeId)) {
        throw new Error('Access denied');
      }
      timeEntryQuery.employeeId = employeeId;
    } else {
      timeEntryQuery.employeeId = { $in: _accessibleEmployeeIds };
    }
  } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
    timeEntryQuery.employeeId = user.employeeId;
  }

  const timeEntries = await TimeEntry.find(timeEntryQuery)
    .populate('employeeId', 'name monthlyCost monthlyWorkingHours hourlyRate')
    .populate('taskId', 'name')
    .lean();

  // Build employeesMap straight from the populate above - it already selects
  // every field used below (including hourlyRate), so a separate
  // Employee.find({_id: {$in: employeeIds}}) re-fetch is unnecessary.
  const employeesMap = {};
  timeEntries.forEach((te) => {
    if (te.employeeId && !employeesMap[te.employeeId._id.toString()]) {
      employeesMap[te.employeeId._id.toString()] = {
        ...te.employeeId,
        hourlyCost: getEmployeeHourlyRate(te.employeeId),
      };
    }
  });

  // Calculate summary
  const totalCost = calculatePackageCost(timeEntries, employeesMap);
  const monthlyRevenue = normalizeRevenueToMonthly(
    pkg.contractValue,
    pkg.billingFrequency,
    pkg.type
  );

  // For filtered period, calculate revenue based on date range
  let periodRevenue = monthlyRevenue;
  if (startDate && endDate && pkg.type === 'RECURRING') {
    const rangeStart = startOfDay(startDate);
    const pkgStart = pkg.startDate ? startOfDay(toDateString(pkg.startDate)) : rangeStart;
    const effectiveStart = pkgStart > rangeStart ? toDateString(pkgStart) : startDate;

    if (startOfDay(effectiveStart) <= endOfDay(endDate)) {
      periodRevenue = getProratedPeriodCost(monthlyRevenue, effectiveStart, endDate);
    } else {
      periodRevenue = 0;
    }
  } else if (pkg.type === 'ONE_TIME') {
    periodRevenue = pkg.contractValue;
  }

  const totalProfit = periodRevenue - totalCost;
  const margin = periodRevenue > 0 ? (totalProfit / periodRevenue) * 100 : 0;
  const totalHours = timeEntries.reduce((sum, te) => sum + (te.minutesSpent || 0) / 3600, 0);

  // taskCount below is derived from timeEntries' taskId field, not a
  // separate Task query - a `Task.find({ packageId })` fetch used to run
  // here but its result was never read.
  const taskIds = new Set(timeEntries.map((te) => te.taskId?._id?.toString()).filter(Boolean));

  // Calculate monthly trends (if recurring)
  const monthlyTrends = [];
  if (pkg.type === 'RECURRING') {
    const monthMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Group time entries by month
    timeEntries.forEach((entry) => {
      const dubaiParts = getDubaiDateParts(entry.date);
      const monthKey = `${dubaiParts.year}-${dubaiParts.month}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: `${monthNames[dubaiParts.month]} ${dubaiParts.year}`,
          year: dubaiParts.year,
          monthNum: dubaiParts.month,
          timeEntries: [],
        };
      }
      monthMap[monthKey].timeEntries.push(entry);
    });

    // Calculate metrics for each month
    Object.values(monthMap).forEach((monthData) => {
      const monthCost = calculatePackageCost(monthData.timeEntries, employeesMap);
      const monthRevenue = monthlyRevenue; // Same for each month if monthly
      const monthProfit = monthRevenue - monthCost;

      monthlyTrends.push({
        month: monthData.month,
        revenue: parseFloat(monthRevenue.toFixed(2)),
        cost: parseFloat(monthCost.toFixed(2)),
        profit: parseFloat(monthProfit.toFixed(2)),
      });
    });

    monthlyTrends.sort((a, b) => {
      const aParts = a.month.split(' ');
      const bParts = b.month.split(' ');
      if (aParts[1] !== bParts[1]) {
        return parseInt(aParts[1]) - parseInt(bParts[1]);
      }
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthOrder.indexOf(aParts[0]) - monthOrder.indexOf(bParts[0]);
    });
  }

  // Top 3 employees by task count
  const employeeTaskCount = {};
  timeEntries.forEach((entry) => {
    if (entry.taskId && entry.employeeId) {
      const empId = entry.employeeId._id.toString();
      if (!employeeTaskCount[empId]) {
        employeeTaskCount[empId] = { employeeId: empId, employeeName: entry.employeeId.name, tasks: new Set() };
      }
      employeeTaskCount[empId].tasks.add(entry.taskId._id.toString());
    }
  });

  const topEmployeesByTasks = Object.values(employeeTaskCount)
    .map((emp) => ({
      employeeId: emp.employeeId,
      name: emp.employeeName,
      taskCount: emp.tasks.size,
    }))
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 3)
    .map((emp, idx, arr) => ({
      ...emp,
      percentage: arr.reduce((sum, e) => sum + e.taskCount, 0) > 0
        ? ((emp.taskCount / arr.reduce((sum, e) => sum + e.taskCount, 0)) * 100).toFixed(1)
        : '0',
    }));

  // Top 3 employees by time
  const employeeTime = {};
  timeEntries.forEach((entry) => {
    if (entry.employeeId) {
      const empId = entry.employeeId._id.toString();
      const hours = (entry.minutesSpent || 0) / 3600;
      if (!employeeTime[empId]) {
        employeeTime[empId] = {
          employeeId: empId,
          name: entry.employeeId.name,
          hours: 0,
          cost: 0,
        };
      }
      const hourlyCost = employeesMap[empId]?.hourlyCost || 0;
      employeeTime[empId].hours += hours;
      employeeTime[empId].cost += hours * hourlyCost;
    }
  });

  const totalHoursAll = Object.values(employeeTime).reduce((sum, emp) => sum + emp.hours, 0);
  const topEmployeesByTime = Object.values(employeeTime)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 3)
    .map((emp) => ({
      ...emp,
      hours: parseFloat(emp.hours.toFixed(2)),
      cost: parseFloat(emp.cost.toFixed(2)),
      percentage: totalHoursAll > 0 ? ((emp.hours / totalHoursAll) * 100).toFixed(1) : '0',
    }));

  // Employee breakdown
  const employeeBreakdown = Object.values(employeeTime).map((emp) => {
    const taskCount = employeeTaskCount[emp.employeeId]?.tasks?.size || 0;
    return {
      employeeId: emp.employeeId,
      name: emp.name,
      hours: parseFloat(emp.hours.toFixed(2)),
      cost: parseFloat(emp.cost.toFixed(2)),
      taskCount,
    };
  });

  // Task breakdown
  const taskTime = {};
  timeEntries.forEach((entry) => {
    if (entry.taskId) {
      const taskId = entry.taskId._id.toString();
      const hours = (entry.minutesSpent || 0) / 3600;
      if (!taskTime[taskId]) {
        taskTime[taskId] = {
          taskId: taskId,
          name: entry.taskId.name,
          hours: 0,
          cost: 0,
        };
      }
      const empId = entry.employeeId?._id?.toString();
      const hourlyCost = employeesMap[empId]?.hourlyCost || 0;
      taskTime[taskId].hours += hours;
      taskTime[taskId].cost += hours * hourlyCost;
    }
  });

  const taskBreakdown = Object.values(taskTime).map((task) => ({
    ...task,
    hours: parseFloat(task.hours.toFixed(2)),
    cost: parseFloat(task.cost.toFixed(2)),
  }));

  return {
    package: {
      id: pkg._id,
      name: pkg.name,
      type: pkg.type,
      billingFrequency: pkg.billingFrequency,
      contractValue: pkg.contractValue,
      clientId: pkg.clientId._id,
      clientName: pkg.clientId.name,
    },
    summary: {
      revenue: parseFloat(periodRevenue.toFixed(2)),
      cost: parseFloat(totalCost.toFixed(2)),
      profit: parseFloat(totalProfit.toFixed(2)),
      margin: parseFloat(margin.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2)),
      taskCount: taskIds.size,
    },
    monthlyTrends,
    topEmployeesByTasks,
    topEmployeesByTime,
    employeeBreakdown,
    taskBreakdown,
  };
};

/**
 * Get detailed client analytics
 */
export const getClientAnalytics = async (clientId, filters = {}, user = null) => {
  const {
    employeeId,
    packageId,
    packageType,
    startDate,
    endDate,
    _accessibleEmployeeIds,
  } = filters;

  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // Get all packages for this client
  const packageQuery = { clientId: client._id };
  if (packageType) {
    packageQuery.type = packageType;
  }
  if (packageId) {
    packageQuery._id = packageId;
  }

  const packages = await Package.find(packageQuery).lean();
  const packageIds = packages.map((pkg) => pkg._id);

  // packageBreakdown's per-package TimeEntry filter (date range, employee
  // filter, and MANAGER/EMPLOYEE team scoping) was identical for every
  // package before - batch it into one $in query instead of one per package.
  const scopedFilter = {};
  if (startDate || endDate) {
    scopedFilter.date = buildDateRangeQuery(startDate, endDate);
  }
  if (employeeId) {
    scopedFilter.employeeId = employeeId;
  }

  // If an employeeId filter is set and it isn't in the accessible list,
  // every package used to resolve to null (access denied) - i.e. the whole
  // packageBreakdown/topPackages set is empty.
  let breakdownAccessDenied = false;
  if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
    if (employeeId) {
      if (!_accessibleEmployeeIds.includes(employeeId)) {
        breakdownAccessDenied = true;
      } else {
        scopedFilter.employeeId = employeeId;
      }
    } else {
      scopedFilter.employeeId = { $in: _accessibleEmployeeIds };
    }
  } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
    scopedFilter.employeeId = user.employeeId;
  }

  const scopedTimeEntries = !breakdownAccessDenied && packageIds.length
    ? await TimeEntry.find({ ...scopedFilter, packageId: { $in: packageIds } }).lean()
    : [];

  const scopedEntriesByPackage = new Map();
  for (const entry of scopedTimeEntries) {
    const key = entry.packageId.toString();
    if (!scopedEntriesByPackage.has(key)) {
      scopedEntriesByPackage.set(key, []);
    }
    scopedEntriesByPackage.get(key).push(entry);
  }

  // monthlyTrends/topEmployees below never applied MANAGER/EMPLOYEE team
  // scoping in the original code (only the explicit employeeId filter, if
  // any) - preserve that distinct, unscoped filter shape as its own query.
  const unscopedFilter = {};
  if (startDate || endDate) {
    unscopedFilter.date = buildDateRangeQuery(startDate, endDate);
  }
  if (employeeId) {
    unscopedFilter.employeeId = employeeId;
  }
  const clientTimeEntries = await TimeEntry.find({ ...unscopedFilter, clientId: client._id }).lean();

  const allEmployeeIds = [...new Set([
    ...scopedTimeEntries.map((te) => te.employeeId?.toString()),
    ...clientTimeEntries.map((te) => te.employeeId?.toString()),
  ].filter(Boolean))];
  const employees = allEmployeeIds.length
    ? await Employee.find({ _id: { $in: allEmployeeIds } }).lean()
    : [];
  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp,
      hourlyCost: getEmployeeHourlyRate(emp),
    };
  });

  // Get package breakdown
  const validPackages = breakdownAccessDenied ? [] : packages.map((pkg) => {
    const timeEntries = scopedEntriesByPackage.get(pkg._id.toString()) || [];

    const cost = calculatePackageCost(timeEntries, employeesMap);
    const monthlyRevenue = normalizeRevenueToMonthly(
      pkg.contractValue,
      pkg.billingFrequency,
      pkg.type
    );

    // Calculate period revenue
    let periodRevenue = monthlyRevenue;
    if (startDate && endDate && pkg.type === 'RECURRING') {
      const rangeStart = startOfDay(startDate);
      const pkgStart = pkg.startDate ? startOfDay(toDateString(pkg.startDate)) : rangeStart;
      const effectiveStart = pkgStart > rangeStart ? toDateString(pkgStart) : startDate;

      if (startOfDay(effectiveStart) <= endOfDay(endDate)) {
        periodRevenue = getProratedPeriodCost(monthlyRevenue, effectiveStart, endDate);
      } else {
        periodRevenue = 0;
      }
    } else if (pkg.type === 'ONE_TIME') {
      periodRevenue = pkg.contractValue;
    }

    const profit = periodRevenue - cost;
    const margin = periodRevenue > 0 ? (profit / periodRevenue) * 100 : 0;
    const hours = timeEntries.reduce((sum, te) => sum + (te.minutesSpent || 0) / 3600, 0);

    return {
      packageId: pkg._id,
      name: pkg.name,
      type: pkg.type,
      revenue: parseFloat(periodRevenue.toFixed(2)),
      cost: parseFloat(cost.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      margin: parseFloat(margin.toFixed(2)),
      hours: parseFloat(hours.toFixed(2)),
    };
  });

  // Aggregate totals
  const totalRevenue = validPackages.reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = validPackages.reduce((sum, p) => sum + p.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalHours = validPackages.reduce((sum, p) => sum + p.hours, 0);

  // Monthly trends (combined across all packages). Reuses clientTimeEntries
  // (fetched above) grouped by package, instead of a separate TimeEntry +
  // Employee query per package. Packages are still processed in the same
  // order as before, since the revenue-accumulation logic below is
  // order-sensitive (a RECURRING package adds its monthly revenue once per
  // time entry in that month, and only the first ONE_TIME package processed
  // for a given month contributes its contractValue) - preserved exactly.
  const monthlyTrends = [];
  const monthMap = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const packageIdSet = new Set(packageIds.map((id) => id.toString()));
  const trendsEntriesByPackage = new Map();
  for (const entry of clientTimeEntries) {
    const key = entry.packageId?.toString();
    if (!key || !packageIdSet.has(key)) continue;
    if (!trendsEntriesByPackage.has(key)) {
      trendsEntriesByPackage.set(key, []);
    }
    trendsEntriesByPackage.get(key).push(entry);
  }

  for (const pkg of packages) {
    const timeEntries = trendsEntriesByPackage.get(pkg._id.toString()) || [];

    const monthlyRevenue = normalizeRevenueToMonthly(
      pkg.contractValue,
      pkg.billingFrequency,
      pkg.type
    );

    timeEntries.forEach((entry) => {
      const dubaiParts = getDubaiDateParts(entry.date);
      const monthKey = `${dubaiParts.year}-${dubaiParts.month}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: `${monthNames[dubaiParts.month]} ${dubaiParts.year}`,
          revenue: 0,
          cost: 0,
        };
      }

      const hours = (entry.minutesSpent || 0) / 3600;
      const hourlyCost = employeesMap[entry.employeeId?.toString()]?.hourlyCost || 0;
      monthMap[monthKey].cost += hours * hourlyCost;

      // Add monthly revenue for recurring packages
      if (pkg.type === 'RECURRING') {
        monthMap[monthKey].revenue += monthlyRevenue;
      } else if (pkg.type === 'ONE_TIME') {
        // For one-time, add a portion based on when it started
        if (!monthMap[monthKey].oneTimeAdded) {
          monthMap[monthKey].revenue += pkg.contractValue;
          monthMap[monthKey].oneTimeAdded = true;
        }
      }
    });
  }

  Object.values(monthMap).forEach((month) => {
    month.profit = month.revenue - month.cost;
    monthlyTrends.push({
      month: month.month,
      revenue: parseFloat(month.revenue.toFixed(2)),
      cost: parseFloat(month.cost.toFixed(2)),
      profit: parseFloat(month.profit.toFixed(2)),
    });
  });

  monthlyTrends.sort((a, b) => {
    const aParts = a.month.split(' ');
    const bParts = b.month.split(' ');
    if (aParts[1] !== bParts[1]) {
      return parseInt(aParts[1]) - parseInt(bParts[1]);
    }
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthOrder.indexOf(aParts[0]) - monthOrder.indexOf(bParts[0]);
  });

  // Top packages by profitability
  const topPackages = [...validPackages]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  // Top employees - reuses clientTimeEntries and employeesMap fetched above
  // instead of a separate TimeEntry + Employee query. The original
  // populate('employeeId', ...) resolved to null for a time entry whose
  // employee had been hard-deleted, which silently excluded that entry from
  // this aggregation - replicate that with an explicit employeesMap lookup
  // since these entries are unpopulated (lean) raw ObjectIds.
  const employeeTime = {};
  clientTimeEntries.forEach((entry) => {
    const empId = entry.employeeId?.toString();
    if (empId && employeesMap[empId]) {
      const hours = (entry.minutesSpent || 0) / 3600;
      if (!employeeTime[empId]) {
        employeeTime[empId] = {
          employeeId: empId,
          name: employeesMap[empId].name,
          hours: 0,
          tasks: new Set(),
        };
      }
      employeeTime[empId].hours += hours;
      if (entry.taskId) {
        employeeTime[empId].tasks.add(entry.taskId.toString());
      }
    }
  });

  const topEmployees = Object.values(employeeTime)
    .map((emp) => ({
      ...emp,
      hours: parseFloat(emp.hours.toFixed(2)),
      tasks: emp.tasks.size,
      cost: parseFloat((emp.hours * (employeesMap[emp.employeeId]?.hourlyCost || 0)).toFixed(2)),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  return {
    client: {
      id: client._id,
      name: client.name,
    },
    summary: {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      margin: parseFloat(margin.toFixed(2)),
      packagesCount: validPackages.length,
      totalHours: parseFloat(totalHours.toFixed(2)),
    },
    packageBreakdown: validPackages,
    monthlyTrends,
    topPackages,
    topEmployees,
  };
};

/**
 * Get detailed employee analytics
 */
export const getEmployeeAnalytics = async (employeeId, filters = {}, user = null) => {
  const {
    clientId,
    packageId,
    startDate,
    endDate,
    _accessibleEmployeeIds,
  } = filters;

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new Error('Employee not found');
  }

  // Check access (compare as strings - employeeId from URL is string, user.employeeId may be ObjectId)
  const employeeIdStr = employeeId && (typeof employeeId === 'string' ? employeeId : employeeId.toString());
  if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && !_accessibleEmployeeIds.includes(employeeIdStr)) {
    throw new Error('Access denied');
  }
  if (user && user.role === 'EMPLOYEE') {
    const userEmpId = user.employeeId != null ? String(user.employeeId) : null;
    if (userEmpId !== employeeIdStr) {
      throw new Error('Access denied');
    }
  }

  const hourlyRate = getEmployeeHourlyRate(employee);

  // Build time entry query
  const timeEntryQuery = { employeeId: employee._id };
  if (startDate || endDate) {
    timeEntryQuery.date = buildDateRangeQuery(startDate, endDate);
  }

  if (clientId) {
    timeEntryQuery.clientId = clientId;
  }

  if (packageId) {
    timeEntryQuery.packageId = packageId;
  }

  const timeEntries = await TimeEntry.find(timeEntryQuery)
    .populate('clientId', 'name')
    .populate('packageId', 'name')
    .populate('taskId', 'name');

  // Calculate summary
  const totalHours = timeEntries.reduce((sum, te) => sum + (te.minutesSpent || 0) / 3600, 0);
  const costContribution = totalHours * hourlyRate;

  // Calculate monthly cost for the period
  let periodMonthlyCost = employee.monthlyCost;
  if (startDate && endDate) {
    periodMonthlyCost = getProratedPeriodCost(employee.monthlyCost, startDate, endDate);
  }

  // Utilization: (serviceHours * hourlyCost) / monthlyCost * 100
  // Shows cost efficiency: >100% = generating more value than cost, <100% = costing more than value
  const utilizationRate = periodMonthlyCost > 0 ? (costContribution / periodMonthlyCost) * 100 : 0;

  // Salary vs earned analysis
  let monthlySalary = employee.monthlyCost;
  if (startDate && endDate) {
    monthlySalary = getProratedPeriodCost(employee.monthlyCost, startDate, endDate);
  }

  const salaryVsEarned = {
    monthlySalary: parseFloat(monthlySalary.toFixed(2)),
    costBasedOnHours: parseFloat(costContribution.toFixed(2)),
    ratio: monthlySalary > 0 ? parseFloat(((costContribution / monthlySalary) * 100).toFixed(2)) : 0,
  };

  // Monthly trends
  const monthlyTrends = [];
  const monthMap = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  timeEntries.forEach((entry) => {
    const dubaiParts = getDubaiDateParts(entry.date);
    const monthKey = `${dubaiParts.year}-${dubaiParts.month}`;

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        month: `${monthNames[dubaiParts.month]} ${dubaiParts.year}`,
        hours: 0,
        cost: 0,
      };
    }

    const hours = (entry.minutesSpent || 0) / 3600;
    monthMap[monthKey].hours += hours;
    monthMap[monthKey].cost += hours * hourlyRate;
  });

  Object.values(monthMap).forEach((month) => {
    // Utilization: (serviceHours * hourlyCost) / monthlyCost * 100
    // Shows cost efficiency: >100% = generating more value than cost, <100% = costing more than value
    const monthUtilization = employee.monthlyCost > 0 ? (month.cost / employee.monthlyCost) * 100 : 0;

    monthlyTrends.push({
      month: month.month,
      hours: parseFloat(month.hours.toFixed(2)),
      utilizationRate: parseFloat(monthUtilization.toFixed(2)),
      cost: parseFloat(month.cost.toFixed(2)),
    });
  });

  monthlyTrends.sort((a, b) => {
    const aParts = a.month.split(' ');
    const bParts = b.month.split(' ');
    if (aParts[1] !== bParts[1]) {
      return parseInt(aParts[1]) - parseInt(bParts[1]);
    }
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthOrder.indexOf(aParts[0]) - monthOrder.indexOf(bParts[0]);
  });

  // Top clients
  const clientTime = {};
  timeEntries.forEach((entry) => {
    if (entry.clientId) {
      const clientId = entry.clientId._id.toString();
      const hours = (entry.minutesSpent || 0) / 3600;
      if (!clientTime[clientId]) {
        clientTime[clientId] = {
          clientId: clientId,
          name: entry.clientId.name,
          hours: 0,
          tasks: new Set(),
        };
      }
      clientTime[clientId].hours += hours;
      if (entry.taskId) {
        clientTime[clientId].tasks.add(entry.taskId.toString());
      }
    }
  });

  const topClients = Object.values(clientTime)
    .map((client) => ({
      ...client,
      hours: parseFloat(client.hours.toFixed(2)),
      tasks: client.tasks.size,
      cost: parseFloat((client.hours * hourlyRate).toFixed(2)),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  // Top packages
  const packageTime = {};
  timeEntries.forEach((entry) => {
    if (entry.packageId) {
      const packageId = entry.packageId._id.toString();
      const hours = (entry.minutesSpent || 0) / 3600;
      if (!packageTime[packageId]) {
        packageTime[packageId] = {
          packageId: packageId,
          name: entry.packageId.name,
          hours: 0,
          tasks: new Set(),
        };
      }
      packageTime[packageId].hours += hours;
      if (entry.taskId) {
        packageTime[packageId].tasks.add(entry.taskId.toString());
      }
    }
  });

  const topPackages = Object.values(packageTime)
    .map((pkg) => ({
      ...pkg,
      hours: parseFloat(pkg.hours.toFixed(2)),
      tasks: pkg.tasks.size,
      cost: parseFloat((pkg.hours * hourlyRate).toFixed(2)),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  // Top tasks
  const taskTime = {};
  timeEntries.forEach((entry) => {
    if (entry.taskId) {
      const taskId = entry.taskId._id.toString();
      const hours = (entry.minutesSpent || 0) / 3600;
      if (!taskTime[taskId]) {
        taskTime[taskId] = {
          taskId: taskId,
          name: entry.taskId.name,
          hours: 0,
        };
      }
      taskTime[taskId].hours += hours;
    }
  });

  const topTasks = Object.values(taskTime)
    .map((task) => ({
      ...task,
      hours: parseFloat(task.hours.toFixed(2)),
      cost: parseFloat((task.hours * hourlyRate).toFixed(2)),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  // Time distribution
  const totalDistHours = topClients.reduce((sum, c) => sum + c.hours, 0);
  const timeDistribution = topClients.map((client) => ({
    label: client.name,
    hours: client.hours,
    percentage: totalDistHours > 0 ? parseFloat(((client.hours / totalDistHours) * 100).toFixed(1)) : 0,
  }));

  // Detailed time log
  const detailedTimeLog = timeEntries
    .map((entry) => ({
      date: entry.date,
      startTime: entry.startTime || null,
      endTime: entry.endTime || null,
      clientName: entry.clientId?.name || 'N/A',
      packageName: entry.packageId?.name || 'N/A',
      taskName: entry.taskId?.name || 'N/A',
      hours: parseFloat(((entry.minutesSpent || 0) / 3600).toFixed(2)),
      cost: parseFloat((((entry.minutesSpent || 0) / 3600) * hourlyRate).toFixed(2)),
    }))
    .sort((a, b) => {
      const aTime = new Date(a.startTime || a.date).getTime();
      const bTime = new Date(b.startTime || b.date).getTime();
      return bTime - aTime;
    });

  return {
    employee: {
      id: employee._id,
      name: employee.name,
      monthlyCost: employee.monthlyCost,
      monthlyWorkingHours: employee.monthlyWorkingHours,
      hourlyRate: parseFloat(hourlyRate.toFixed(2)),
    },
    summary: {
      totalHours: parseFloat(totalHours.toFixed(2)),
      utilizationRate: parseFloat(utilizationRate.toFixed(2)),
      costContribution: parseFloat(costContribution.toFixed(2)),
    },
    salaryVsEarned,
    monthlyTrends,
    topClients,
    topPackages,
    topTasks,
    timeDistribution,
    detailedTimeLog: detailedTimeLog.slice(0, 100), // Limit to last 100 entries
  };
};

