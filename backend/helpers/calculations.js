/**
 * Calculate employee hourly cost
 * @param {number} monthlyCost - Employee monthly cost
 * @param {number} monthlyWorkingHours - Employee monthly working hours
 * @returns {number} Hourly cost
 */
export const calculateHourlyCost = (monthlyCost, monthlyWorkingHours) => {
  if (!monthlyCost || !monthlyWorkingHours || monthlyWorkingHours === 0) {
    return 0;
  }
  return monthlyCost / monthlyWorkingHours;
};

/**
 * Get employee hourly rate/cost - prefers hourlyRate if available, otherwise calculates from monthly cost
 * @param {Object} employee - Employee object with hourlyRate, monthlyCost, monthlyWorkingHours
 * @returns {number} Hourly rate/cost
 */
export const getEmployeeHourlyRate = (employee) => {
  // Prefer hourlyRate if it exists and is greater than 0
  if (employee?.hourlyRate && employee.hourlyRate > 0) {
    return employee.hourlyRate;
  }

  // Fall back to calculated hourly cost
  return calculateHourlyCost(employee?.monthlyCost, employee?.monthlyWorkingHours);
};

/**
 * Normalize package revenue to monthly equivalent
 * @param {number} contractValue - Contract value
 * @param {string} billingFrequency - Billing frequency (MONTHLY, QUARTERLY, YEARLY)
 * @param {string} type - Package type (RECURRING, ONE_TIME)
 * @returns {number} Monthly revenue
 */
export const normalizeRevenueToMonthly = (
  contractValue,
  billingFrequency,
  type
) => {
  if (!contractValue || contractValue <= 0) {
    return 0;
  }

  if (type === 'ONE_TIME') {
    // For one-time packages, divide by 12 to get monthly equivalent
    return contractValue / 12;
  }

  // For recurring packages, normalize based on billing frequency
  switch (billingFrequency) {
    case 'MONTHLY':
      return contractValue;
    case 'QUARTERLY':
      return contractValue / 3;
    case 'YEARLY':
      return contractValue / 12;
    default:
      return 0;
  }
};

/**
 * Calculate package total cost from time entries
 * @param {Array} timeEntries - Array of time entry objects with employeeId and minutesSpent (stored in seconds)
 * @param {Map|Object} employeesMap - Map or object of employees with hourlyCost
 * @returns {number} Total cost in currency units
 */
export const calculatePackageCost = (timeEntries, employeesMap) => {
  if (!timeEntries || timeEntries.length === 0) {
    return 0;
  }

  let totalCost = 0;

  for (const entry of timeEntries) {
    // Extract employee ID - handle both populated and non-populated cases
    let employeeId;
    if (entry.employeeId && typeof entry.employeeId === 'object' && entry.employeeId._id) {
      // Populated employee object
      employeeId = entry.employeeId._id.toString();
    } else if (entry.employeeId) {
      // ObjectId or string
      employeeId = entry.employeeId.toString();
    } else {
      continue;
    }

    const employee = employeesMap[employeeId] || employeesMap.get?.(employeeId);
    if (!employee || !employee.hourlyCost) {
      continue;
    }

    // minutesSpent is stored in seconds, convert to hours by dividing by 3600
    const hours = entry.minutesSpent / 3600;
    totalCost += hours * employee.hourlyCost;
  }

  return totalCost;
};

/**
 * Calculate package profitability
 * @param {number} monthlyRevenue - Monthly revenue
 * @param {number} monthlyCost - Monthly cost
 * @returns {Object} Profit and margin percentage
 */
export const calculatePackageProfitability = (monthlyRevenue, monthlyCost) => {
  const profit = monthlyRevenue - monthlyCost;
  const margin = monthlyRevenue > 0 ? (profit / monthlyRevenue) * 100 : 0;

  return {
    revenue: monthlyRevenue,
    cost: monthlyCost,
    profit,
    margin: parseFloat(margin.toFixed(2)),
  };
};

/**
 * Get number of billing cycles within a date range
 * @param {string} billingFrequency - Billing frequency (MONTHLY, QUARTERLY, YEARLY)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {Date|string} packageStartDate - Package start date
 * @returns {number} Number of cycles
 */
export const getCyclesInPeriod = (billingFrequency, startDate, endDate, packageStartDate) => {
  // If no date range provided, assume 1 cycle
  if (!startDate || !endDate) {
    return 1;
  }

  // If no billing frequency (e.g., ONE_TIME packages), return 1
  if (!billingFrequency) {
    return 1;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const pkgStart = packageStartDate ? new Date(packageStartDate) : start;

  // Use package start date as reference if it's later than the filter start date
  const effectiveStart = pkgStart > start ? pkgStart : start;

  if (effectiveStart > end) {
    return 0;
  }

  switch (billingFrequency) {
    case 'MONTHLY': {
      const monthsDiff = (end.getFullYear() - effectiveStart.getFullYear()) * 12 +
        (end.getMonth() - effectiveStart.getMonth());
      return Math.max(1, Math.floor(monthsDiff) + 1);
    }
    case 'QUARTERLY': {
      const monthsDiff = (end.getFullYear() - effectiveStart.getFullYear()) * 12 +
        (end.getMonth() - effectiveStart.getMonth());
      const quarters = Math.floor(monthsDiff / 3);
      return Math.max(1, quarters + 1);
    }
    case 'YEARLY': {
      const yearsDiff = end.getFullYear() - effectiveStart.getFullYear();
      return Math.max(1, yearsDiff + 1);
    }
    default:
      return 1;
  }
};

/**
 * Calculate per-cycle revenue for a package
 * @param {number} contractValue - Contract value
 * @param {string} billingFrequency - Billing frequency (MONTHLY, QUARTERLY, YEARLY)
 * @param {string} type - Package type (RECURRING, ONE_TIME)
 * @returns {number} Revenue per billing cycle
 */
export const calculateCycleRevenue = (contractValue, billingFrequency, type) => {
  if (!contractValue || contractValue <= 0) {
    return 0;
  }

  if (type === 'ONE_TIME') {
    // For one-time packages, return the full contract value as one cycle
    return contractValue;
  }

  // For recurring packages, return the contract value as-is (it's already per cycle)
  return contractValue;
};

/**
 * Calculate cycle metrics (revenue, cost, profit, margin) for a package
 * @param {string} type - Package type (RECURRING, ONE_TIME)
 * @param {string} billingFrequency - Billing frequency (MONTHLY, QUARTERLY, YEARLY)
 * @param {number} contractValue - Contract value
 * @param {Array} timeEntries - Time entries for the package
 * @param {Object} employeesMap - Map of employees with hourlyCost
 * @param {Date} startDate - Start date of the period
 * @param {Date} endDate - End date of the period
 * @param {Date} packageStartDate - Package start date
 * @returns {Object} Cycle metrics
 */
export const calculateCycleMetrics = (
  type,
  billingFrequency,
  contractValue,
  timeEntries,
  employeesMap,
  startDate,
  endDate,
  packageStartDate
) => {
  // For ONE_TIME packages, cycles are always 1
  if (type === 'ONE_TIME') {
    const totalCost = calculatePackageCost(timeEntries, employeesMap);
    const cycleRevenue = contractValue;
    const cycleProfit = cycleRevenue - totalCost;
    const cycleMargin = cycleRevenue > 0 ? (cycleProfit / cycleRevenue) * 100 : 0;

    return {
      cycleRevenue: parseFloat(cycleRevenue.toFixed(2)),
      cycleCost: parseFloat(totalCost.toFixed(2)),
      cycleProfit: parseFloat(cycleProfit.toFixed(2)),
      cycleMargin: parseFloat(cycleMargin.toFixed(2)),
      cyclesInPeriod: 1,
      totalCycleRevenue: parseFloat(cycleRevenue.toFixed(2)),
      totalCycleCost: parseFloat(totalCost.toFixed(2)),
      totalCycleProfit: parseFloat(cycleProfit.toFixed(2)),
    };
  }

  // Calculate per-cycle revenue for recurring packages
  const cycleRevenue = calculateCycleRevenue(contractValue, billingFrequency, type);

  // Calculate total cost from time entries
  const totalCost = calculatePackageCost(timeEntries, employeesMap);

  // Get number of cycles in the period
  const cyclesInPeriod = getCyclesInPeriod(billingFrequency, startDate, endDate, packageStartDate);

  // For cycle metrics, we need to calculate cost per cycle
  // This is the total cost divided by the number of cycles (average cost per cycle)
  const cycleCost = cyclesInPeriod > 0 ? totalCost / cyclesInPeriod : totalCost;

  // Calculate cycle profit and margin
  const cycleProfit = cycleRevenue - cycleCost;
  const cycleMargin = cycleRevenue > 0 ? (cycleProfit / cycleRevenue) * 100 : 0;

  // Calculate totals across all cycles
  const totalCycleRevenue = cycleRevenue * cyclesInPeriod;
  const totalCycleCost = totalCost; // Already the total cost for all cycles
  const totalCycleProfit = totalCycleRevenue - totalCycleCost;

  return {
    cycleRevenue: parseFloat(cycleRevenue.toFixed(2)),
    cycleCost: parseFloat(cycleCost.toFixed(2)),
    cycleProfit: parseFloat(cycleProfit.toFixed(2)),
    cycleMargin: parseFloat(cycleMargin.toFixed(2)),
    cyclesInPeriod,
    totalCycleRevenue: parseFloat(totalCycleRevenue.toFixed(2)),
    totalCycleCost: parseFloat(totalCycleCost.toFixed(2)),
    totalCycleProfit: parseFloat(totalCycleProfit.toFixed(2)),
  };
};

