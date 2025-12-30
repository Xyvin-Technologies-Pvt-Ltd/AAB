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

  const packages = await Package.find(query).populate('clientId', 'name');

  const results = await Promise.all(
    packages.map(async (pkg) => {
      // Get time entries for this package within date range
      const timeEntryQuery = { packageId: pkg._id };
      if (startDate || endDate) {
        timeEntryQuery.date = {};
        if (startDate) {
          timeEntryQuery.date.$gte = new Date(startDate);
        }
        if (endDate) {
          timeEntryQuery.date.$lte = new Date(endDate);
        }
      }

      // Apply employee filter
      if (employeeId) {
        timeEntryQuery.employeeId = employeeId;
      }

      // Apply team filtering for MANAGER role
      if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
        if (employeeId) {
          // If employeeId filter is set, ensure it's in accessible list
          if (!_accessibleEmployeeIds.includes(employeeId)) {
            return null; // Skip this package if employee not accessible
          }
          timeEntryQuery.employeeId = employeeId;
        } else {
          timeEntryQuery.employeeId = { $in: _accessibleEmployeeIds };
        }
      } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
        timeEntryQuery.employeeId = user.employeeId;
      }

      const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
        'employeeId',
        'name monthlyCost monthlyWorkingHours'
      );

      // Get unique employee IDs and fetch their data
      const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId._id.toString()))];
      const employees = await Employee.find({ _id: { $in: employeeIds } });

      // Create employees map with hourly costs
      const employeesMap = {};
      employees.forEach((emp) => {
        employeesMap[emp._id.toString()] = {
          ...emp.toObject(),
          hourlyCost: getEmployeeHourlyRate(emp),
        };
      });

      // Calculate monthly cost
      const monthlyCost = calculatePackageCost(timeEntries, employeesMap);

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
        timeEntries,
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
        timeEntriesCount: timeEntries.length,
        totalHours: timeEntries.reduce((sum, te) => sum + te.minutesSpent / 3600, 0),
      };
    })
  );

  // Filter out null results (from access control)
  const filteredResults = results.filter((r) => r !== null);

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

  const clients = await Client.find(query);

  const results = await Promise.all(
    clients.map(async (client) => {
      // Get all packages for this client with filters
      const packageQuery = { clientId: client._id };
      if (packageType) {
        packageQuery.type = packageType;
      }
      if (billingFrequency) {
        packageQuery.billingFrequency = billingFrequency;
      }
      const packages = await Package.find(packageQuery);

      // Get package profitability for each package
      const packageProfits = await Promise.all(
        packages.map(async (pkg) => {
          const timeEntryQuery = { packageId: pkg._id };
          if (startDate || endDate) {
            timeEntryQuery.date = {};
            if (startDate) {
              timeEntryQuery.date.$gte = new Date(startDate);
            }
            if (endDate) {
              timeEntryQuery.date.$lte = new Date(endDate);
            }
          }

          // Apply employee filter
          if (employeeId) {
            timeEntryQuery.employeeId = employeeId;
          }

          // Apply team filtering for MANAGER role
          if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
            if (employeeId) {
              if (!_accessibleEmployeeIds.includes(employeeId)) {
                return null;
              }
              timeEntryQuery.employeeId = employeeId;
            } else {
              timeEntryQuery.employeeId = { $in: _accessibleEmployeeIds };
            }
          } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
            timeEntryQuery.employeeId = user.employeeId;
          }

          const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
            'employeeId',
            'name monthlyCost monthlyWorkingHours'
          );

          const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId._id.toString()))];
          const employees = await Employee.find({ _id: { $in: employeeIds } });

          const employeesMap = {};
          employees.forEach((emp) => {
            employeesMap[emp._id.toString()] = {
              ...emp.toObject(),
              hourlyCost: getEmployeeHourlyRate(emp),
            };
          });

          const monthlyCost = calculatePackageCost(timeEntries, employeesMap);
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
            timeEntries,
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
        })
      );

      // Filter out null results
      const validPackageProfits = packageProfits.filter((p) => p !== null);

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
    })
  );

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
    timeEntryQuery.date = {};
    if (startDate) {
      timeEntryQuery.date.$gte = new Date(startDate);
    }
    if (endDate) {
      timeEntryQuery.date.$lte = new Date(endDate);
    }
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

  // Aggregate time entries by employee
  const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
    'employeeId',
    'name monthlyCost monthlyWorkingHours hourlyRate'
  ).populate('clientId', 'name').populate('packageId', 'name');

  // Get full employee documents to ensure we have hourlyRate
  const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId?._id?.toString()).filter(Boolean))];
  const employees = await Employee.find({ _id: { $in: employeeIds } });
  const employeesFullMap = {};
  employees.forEach((emp) => {
    employeesFullMap[emp._id.toString()] = emp.toObject();
  });

  // Group by employee
  const employeeMap = {};
  const clientPackageMap = {}; // Track breakdown by client/package

  timeEntries.forEach((entry) => {
    const empId = entry.employeeId._id.toString();
    const fullEmployee = employeesFullMap[empId] || {};
    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        employeeId: entry.employeeId._id,
        employeeName: entry.employeeId.name,
        monthlyCost: fullEmployee.monthlyCost || entry.employeeId.monthlyCost,
        monthlyWorkingHours: fullEmployee.monthlyWorkingHours || entry.employeeId.monthlyWorkingHours,
        hourlyRate: fullEmployee.hourlyRate,
        hoursLogged: 0,
        timeEntries: [],
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

    employeeMap[empId].timeEntries.push({
      date: entry.date,
      hours,
      clientId: entry.clientId,
      packageId: entry.packageId,
      taskId: entry.taskId,
    });
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
      timeEntriesCount: emp.timeEntries.length,
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
  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  // Get all packages for this client
  const packages = await Package.find({ clientId });

  // Get time entries for date range
  const timeEntryQuery = { clientId };
  if (startDate || endDate) {
    timeEntryQuery.date = {};
    if (startDate) {
      timeEntryQuery.date.$gte = new Date(startDate);
    }
    if (endDate) {
      timeEntryQuery.date.$lte = new Date(endDate);
    }
  }

  const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
    'employeeId',
    'name monthlyCost monthlyWorkingHours'
  );

  // Calculate total hours logged (minutesSpent is stored in seconds)
  const totalHours = timeEntries.reduce((sum, te) => sum + te.minutesSpent / 3600, 0);

  // Get employee IDs and calculate costs
  const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId._id.toString()))];
  const employees = await Employee.find({ _id: { $in: employeeIds } });

  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp.toObject(),
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

      // Calculate monthly equivalent for date range
      const months = startDate && endDate
        ? (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 30)
        : 1;

      totalRevenue += pkgRevenue * months;

      return {
        packageId: pkg._id,
        packageName: pkg.name,
        type: pkg.type,
        contractValue: pkg.contractValue,
        revenue: pkgRevenue * months,
        cost: pkgCost * months,
        profit: pkgRevenue * months - pkgCost * months,
        efficiency: pkgCost > 0 ? parseFloat(((pkgRevenue / pkgCost) * 100).toFixed(2)) : 0,
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

  // Get tasks summary
  const Task = (await import('../task/task.model.js')).default;
  const tasks = await Task.find({ clientId });
  const openTasks = tasks.filter((t) => t.status !== 'DONE').length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

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
    timeEntryQuery.date = {};
    if (startDate) {
      timeEntryQuery.date.$gte = new Date(startDate);
    }
    if (endDate) {
      timeEntryQuery.date.$lte = new Date(endDate);
    }
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
    .populate('taskId', 'name');

  // Get employees data
  const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId?._id?.toString()).filter(Boolean))];
  const employees = await Employee.find({ _id: { $in: employeeIds } });

  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp.toObject(),
      hourlyCost: getEmployeeHourlyRate(emp),
    };
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const pkgStart = pkg.startDate ? new Date(pkg.startDate) : start;
    const effectiveStart = pkgStart > start ? pkgStart : start;

    if (effectiveStart <= end) {
      const monthsDiff = (end.getFullYear() - effectiveStart.getFullYear()) * 12 +
        (end.getMonth() - effectiveStart.getMonth()) + 1;
      periodRevenue = monthlyRevenue * monthsDiff;
    } else {
      periodRevenue = 0;
    }
  } else if (pkg.type === 'ONE_TIME') {
    periodRevenue = pkg.contractValue;
  }

  const totalProfit = periodRevenue - totalCost;
  const margin = periodRevenue > 0 ? (totalProfit / periodRevenue) * 100 : 0;
  const totalHours = timeEntries.reduce((sum, te) => sum + (te.minutesSpent || 0) / 3600, 0);

  // Get tasks
  const Task = (await import('../task/task.model.js')).default;
  const tasks = await Task.find({ packageId: pkg._id });
  const taskIds = new Set(timeEntries.map((te) => te.taskId?._id?.toString()).filter(Boolean));

  // Calculate monthly trends (if recurring)
  const monthlyTrends = [];
  if (pkg.type === 'RECURRING') {
    const start = startDate ? new Date(startDate) : (pkg.startDate ? new Date(pkg.startDate) : new Date());
    const end = endDate ? new Date(endDate) : new Date();

    const monthMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Group time entries by month
    timeEntries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: `${monthNames[entryDate.getMonth()]} ${entryDate.getFullYear()}`,
          year: entryDate.getFullYear(),
          monthNum: entryDate.getMonth(),
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

  const packages = await Package.find(packageQuery);

  // Get package breakdown
  const packageBreakdown = await Promise.all(
    packages.map(async (pkg) => {
      const timeEntryQuery = { packageId: pkg._id };
      if (startDate || endDate) {
        timeEntryQuery.date = {};
        if (startDate) {
          timeEntryQuery.date.$gte = new Date(startDate);
        }
        if (endDate) {
          timeEntryQuery.date.$lte = new Date(endDate);
        }
      }

      if (employeeId) {
        timeEntryQuery.employeeId = employeeId;
      }

      // Apply team filtering
      if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && _accessibleEmployeeIds.length > 0) {
        if (employeeId) {
          if (!_accessibleEmployeeIds.includes(employeeId)) {
            return null;
          }
          timeEntryQuery.employeeId = employeeId;
        } else {
          timeEntryQuery.employeeId = { $in: _accessibleEmployeeIds };
        }
      } else if (user && user.role === 'EMPLOYEE' && user.employeeId) {
        timeEntryQuery.employeeId = user.employeeId;
      }

      const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
        'employeeId',
        'name monthlyCost monthlyWorkingHours'
      );

      const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId?._id?.toString()).filter(Boolean))];
      const employees = await Employee.find({ _id: { $in: employeeIds } });

      const employeesMap = {};
      employees.forEach((emp) => {
        employeesMap[emp._id.toString()] = {
          ...emp.toObject(),
          hourlyCost: getEmployeeHourlyRate(emp),
        };
      });

      const cost = calculatePackageCost(timeEntries, employeesMap);
      const monthlyRevenue = normalizeRevenueToMonthly(
        pkg.contractValue,
        pkg.billingFrequency,
        pkg.type
      );

      // Calculate period revenue
      let periodRevenue = monthlyRevenue;
      if (startDate && endDate && pkg.type === 'RECURRING') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const pkgStart = pkg.startDate ? new Date(pkg.startDate) : start;
        const effectiveStart = pkgStart > start ? pkgStart : start;

        if (effectiveStart <= end) {
          const monthsDiff = (end.getFullYear() - effectiveStart.getFullYear()) * 12 +
            (end.getMonth() - effectiveStart.getMonth()) + 1;
          periodRevenue = monthlyRevenue * monthsDiff;
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
    })
  );

  const validPackages = packageBreakdown.filter((p) => p !== null);

  // Aggregate totals
  const totalRevenue = validPackages.reduce((sum, p) => sum + p.revenue, 0);
  const totalCost = validPackages.reduce((sum, p) => sum + p.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const totalHours = validPackages.reduce((sum, p) => sum + p.hours, 0);

  // Monthly trends (combined across all packages)
  const monthlyTrends = [];
  const monthMap = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (const pkg of packages) {
    const timeEntryQuery = { packageId: pkg._id };
    if (startDate || endDate) {
      timeEntryQuery.date = {};
      if (startDate) {
        timeEntryQuery.date.$gte = new Date(startDate);
      }
      if (endDate) {
        timeEntryQuery.date.$lte = new Date(endDate);
      }
    }

    if (employeeId) {
      timeEntryQuery.employeeId = employeeId;
    }

    const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
      'employeeId',
      'name monthlyCost monthlyWorkingHours'
    );

    const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId?._id?.toString()).filter(Boolean))];
    const employees = await Employee.find({ _id: { $in: employeeIds } });

    const employeesMap = {};
    employees.forEach((emp) => {
      employeesMap[emp._id.toString()] = {
        ...emp.toObject(),
        hourlyCost: getEmployeeHourlyRate(emp),
      };
    });

    const monthlyRevenue = normalizeRevenueToMonthly(
      pkg.contractValue,
      pkg.billingFrequency,
      pkg.type
    );

    timeEntries.forEach((entry) => {
      const entryDate = new Date(entry.date);
      const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: `${monthNames[entryDate.getMonth()]} ${entryDate.getFullYear()}`,
          revenue: 0,
          cost: 0,
        };
      }

      const hours = (entry.minutesSpent || 0) / 3600;
      const hourlyCost = employeesMap[entry.employeeId?._id?.toString()]?.hourlyCost || 0;
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

  // Top employees
  const allTimeEntries = await TimeEntry.find({
    clientId: client._id,
    ...(startDate || endDate ? {
      date: {
        ...(startDate ? { $gte: new Date(startDate) } : {}),
        ...(endDate ? { $lte: new Date(endDate) } : {}),
      },
    } : {}),
    ...(employeeId ? { employeeId } : {}),
  }).populate('employeeId', 'name monthlyCost monthlyWorkingHours hourlyRate');

  const employeeTime = {};
  allTimeEntries.forEach((entry) => {
    if (entry.employeeId) {
      const empId = entry.employeeId._id.toString();
      const hours = (entry.minutesSpent || 0) / 3600;
      if (!employeeTime[empId]) {
        employeeTime[empId] = {
          employeeId: empId,
          name: entry.employeeId.name,
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

  const employeeIds = [...new Set(Object.keys(employeeTime))];
  const employees = await Employee.find({ _id: { $in: employeeIds } });
  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp.toObject(),
      hourlyCost: getEmployeeHourlyRate(emp),
    };
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

  // Check access
  if (user && user.role === 'MANAGER' && _accessibleEmployeeIds && !_accessibleEmployeeIds.includes(employeeId)) {
    throw new Error('Access denied');
  }
  if (user && user.role === 'EMPLOYEE' && user.employeeId !== employeeId) {
    throw new Error('Access denied');
  }

  const hourlyRate = getEmployeeHourlyRate(employee);

  // Build time entry query
  const timeEntryQuery = { employeeId: employee._id };
  if (startDate || endDate) {
    timeEntryQuery.date = {};
    if (startDate) {
      timeEntryQuery.date.$gte = new Date(startDate);
    }
    if (endDate) {
      timeEntryQuery.date.$lte = new Date(endDate);
    }
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) + 1;
    periodMonthlyCost = employee.monthlyCost * monthsDiff;
  }

  // Utilization: (serviceHours * hourlyCost) / monthlyCost * 100
  // Shows cost efficiency: >100% = generating more value than cost, <100% = costing more than value
  const utilizationRate = periodMonthlyCost > 0 ? (costContribution / periodMonthlyCost) * 100 : 0;

  // Salary vs earned analysis
  let monthlySalary = employee.monthlyCost;
  let monthsInPeriod = 1;
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    monthsInPeriod = (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) + 1;
    monthlySalary = employee.monthlyCost * monthsInPeriod;
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
    const entryDate = new Date(entry.date);
    const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = {
        month: `${monthNames[entryDate.getMonth()]} ${entryDate.getFullYear()}`,
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
  const detailedTimeLog = timeEntries.map((entry) => ({
    date: entry.date,
    clientName: entry.clientId?.name || 'N/A',
    packageName: entry.packageId?.name || 'N/A',
    taskName: entry.taskId?.name || 'N/A',
    hours: parseFloat(((entry.minutesSpent || 0) / 3600).toFixed(2)),
    cost: parseFloat((((entry.minutesSpent || 0) / 3600) * hourlyRate).toFixed(2)),
  }));

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

