/**
 * Parse VAT Return Month string and convert to vatReturnCycle and vatTaxPeriods
 * @param {string} vatReturnMonth - String like "Feb May Aug Nov" or "Jan Apr Jul Oct"
 * @returns {Object} Object with vatReturnCycle and vatTaxPeriods
 */
export const parseVATReturnMonth = (vatReturnMonth) => {
  if (!vatReturnMonth || !vatReturnMonth.trim()) {
    return {
      vatReturnCycle: null,
      vatTaxPeriods: [],
    };
  }

  // Month name to number mapping
  const monthMap = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  // Extract month names from the string (case insensitive)
  const months = vatReturnMonth
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((m) => m.trim())
    .map((m) => monthMap[m.trim()])
    .filter((m) => m !== undefined);

  if (months.length === 0) {
    return {
      vatReturnCycle: null,
      vatTaxPeriods: [],
    };
  }

  // Determine quarterly cycle based on first month
  // Q1 cycle: Jan, Apr, Jul, Oct (months 0, 3, 6, 9)
  // Q2 cycle: Feb, May, Aug, Nov (months 1, 4, 7, 10)
  // Q3 cycle: Mar, Jun, Sep, Dec (months 2, 5, 8, 11)
  
  const firstMonth = months[0];
  let cycleStartMonth;
  
  if ([0, 3, 6, 9].includes(firstMonth)) {
    cycleStartMonth = 0; // Q1 cycle
  } else if ([1, 4, 7, 10].includes(firstMonth)) {
    cycleStartMonth = 1; // Q2 cycle
  } else if ([2, 5, 8, 11].includes(firstMonth)) {
    cycleStartMonth = 2; // Q3 cycle
  } else {
    // Default to Q1 cycle if unclear
    cycleStartMonth = 0;
  }

  // Generate quarterly periods for current year
  const currentYear = new Date().getFullYear();
  const periods = [];
  
  // Generate 4 quarters based on cycle
  for (let quarter = 0; quarter < 4; quarter++) {
    let startMonth = cycleStartMonth + quarter * 3;
    let endMonth = startMonth + 2;
    
    // Handle year rollover
    let startYear = currentYear;
    let endYear = currentYear;
    
    if (startMonth > 11) {
      startMonth -= 12;
      startYear += 1;
    }
    
    if (endMonth > 11) {
      endMonth -= 12;
      endYear += 1;
    }
    
    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(endYear, endMonth + 1, 0); // Last day of end month
    
    periods.push({
      startDate,
      endDate,
    });
  }

  return {
    vatReturnCycle: 'QUARTERLY',
    vatTaxPeriods: periods,
  };
};

