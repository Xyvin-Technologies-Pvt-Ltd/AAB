import Package from '../package/package.model.js';
import TimeEntry from '../timeEntry/timeEntry.model.js';
import Employee from '../employee/employee.model.js';
import Client from '../client/client.model.js';
import {
  normalizeRevenueToMonthly,
  calculatePackageCost,
  calculatePackageProfitability,
  calculateHourlyCost,
} from '../../helpers/calculations.js';

/**
 * Get package profitability analytics
 */
export const getPackageProfitability = async (filters = {}) => {
  const { packageId, startDate, endDate } = filters;

  const query = {};
  if (packageId) {
    query._id = packageId;
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
          hourlyCost: calculateHourlyCost(emp.monthlyCost, emp.monthlyWorkingHours),
        };
      });

      // Calculate monthly cost
      const monthlyCost = calculatePackageCost(timeEntries, employeesMap);

      // Get monthly revenue
      const monthlyRevenue = normalizeRevenueToMonthly(
        pkg.contractValue,
        pkg.billingFrequency,
        pkg.type
      );

      // Calculate profitability
      const profitability = calculatePackageProfitability(monthlyRevenue, monthlyCost);

      return {
        packageId: pkg._id,
        packageName: pkg.name,
        clientId: pkg.clientId._id,
        clientName: pkg.clientId.name,
        type: pkg.type,
        billingFrequency: pkg.billingFrequency,
        contractValue: pkg.contractValue,
        ...profitability,
        timeEntriesCount: timeEntries.length,
        totalHours: timeEntries.reduce((sum, te) => sum + te.minutesSpent / 60, 0),
      };
    })
  );

  return results;
};

/**
 * Get client profitability analytics
 */
export const getClientProfitability = async (filters = {}) => {
  const { clientId, startDate, endDate } = filters;

  const query = {};
  if (clientId) {
    query._id = clientId;
  }

  const clients = await Client.find(query);

  const results = await Promise.all(
    clients.map(async (client) => {
      // Get all packages for this client
      const packages = await Package.find({ clientId: client._id });

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
              hourlyCost: calculateHourlyCost(emp.monthlyCost, emp.monthlyWorkingHours),
            };
          });

          const monthlyCost = calculatePackageCost(timeEntries, employeesMap);
          const monthlyRevenue = normalizeRevenueToMonthly(
            pkg.contractValue,
            pkg.billingFrequency,
            pkg.type
          );
          const profitability = calculatePackageProfitability(monthlyRevenue, monthlyCost);

          return {
            packageId: pkg._id,
            packageName: pkg.name,
            ...profitability,
          };
        })
      );

      // Aggregate client totals
      const totalRevenue = packageProfits.reduce((sum, p) => sum + p.revenue, 0);
      const totalCost = packageProfits.reduce((sum, p) => sum + p.cost, 0);
      const totalProfit = totalRevenue - totalCost;
      const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return {
        clientId: client._id,
        clientName: client.name,
        totalRevenue,
        totalCost,
        totalProfit,
        margin: parseFloat(margin.toFixed(2)),
        packagesCount: packages.length,
        packages: packageProfits,
      };
    })
  );

  return results;
};

/**
 * Get employee utilization analytics
 */
export const getEmployeeUtilization = async (filters = {}) => {
  const { startDate, endDate } = filters;

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

  // Aggregate time entries by employee
  const timeEntries = await TimeEntry.find(timeEntryQuery).populate(
    'employeeId',
    'name monthlyCost monthlyWorkingHours'
  );

  // Group by employee
  const employeeMap = {};

  timeEntries.forEach((entry) => {
    const empId = entry.employeeId._id.toString();
    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        employeeId: entry.employeeId._id,
        employeeName: entry.employeeId.name,
        monthlyCost: entry.employeeId.monthlyCost,
        monthlyWorkingHours: entry.employeeId.monthlyWorkingHours,
        hoursLogged: 0,
        timeEntries: [],
        costContribution: 0,
      };
    }

    const hours = entry.minutesSpent / 60;
    employeeMap[empId].hoursLogged += hours;
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
    const hourlyCost = calculateHourlyCost(emp.monthlyCost, emp.monthlyWorkingHours);
    const utilizationRate =
      emp.monthlyWorkingHours > 0 ? (emp.hoursLogged / emp.monthlyWorkingHours) * 100 : 0;
    const costContribution = emp.hoursLogged * hourlyCost;

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
    };
  });

  return results;
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

  // Calculate total hours logged
  const totalHours = timeEntries.reduce((sum, te) => sum + te.minutesSpent / 60, 0);

  // Get employee IDs and calculate costs
  const employeeIds = [...new Set(timeEntries.map((te) => te.employeeId._id.toString()))];
  const employees = await Employee.find({ _id: { $in: employeeIds } });

  const employeesMap = {};
  employees.forEach((emp) => {
    employeesMap[emp._id.toString()] = {
      ...emp.toObject(),
      hourlyCost: calculateHourlyCost(emp.monthlyCost, emp.monthlyWorkingHours),
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
        hoursLogged: pkgTimeEntries.reduce((sum, te) => sum + te.minutesSpent / 60, 0),
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
      hours: monthEntries.reduce((sum, te) => sum + te.minutesSpent / 60, 0),
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

