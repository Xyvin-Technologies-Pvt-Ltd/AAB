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
 * @param {Array} timeEntries - Array of time entry objects with employeeId and minutesSpent
 * @param {Map|Object} employeesMap - Map or object of employees with hourlyCost
 * @returns {number} Total cost in currency units
 */
export const calculatePackageCost = (timeEntries, employeesMap) => {
  if (!timeEntries || timeEntries.length === 0) {
    return 0;
  }

  let totalCost = 0;

  for (const entry of timeEntries) {
    const employee = employeesMap[entry.employeeId] || employeesMap.get?.(entry.employeeId);
    if (!employee || !employee.hourlyCost) {
      continue;
    }

    const hours = entry.minutesSpent / 60;
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

