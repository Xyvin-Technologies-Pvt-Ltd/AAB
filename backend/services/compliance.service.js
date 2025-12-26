/**
 * Format date to dd/mm/yyyy format
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
const formatDateDDMMYYYY = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Calculate next VAT submission date for a client
 * @param {Object} client - Client document
 * @returns {Object|null} Next VAT submission date info or null
 */
export const calculateNextVATSubmissionDate = (client) => {
  const now = new Date();
  const vatFilingDaysAfterPeriod = 28;

  // Use tax periods if available
  if (client.businessInfo?.vatTaxPeriods && client.businessInfo.vatTaxPeriods.length > 0) {
    const vatTaxPeriods = client.businessInfo.vatTaxPeriods;
    const sortedPeriods = [...vatTaxPeriods].sort((a, b) =>
      new Date(a.startDate) - new Date(b.startDate)
    );

    // Find next upcoming period based on submission dates
    for (const period of sortedPeriods) {
      const periodEndDate = new Date(period.endDate);
      const submissionDate = new Date(periodEndDate);
      submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

      if (submissionDate.getTime() > now.getTime()) {
        return {
          submissionDate,
          period: {
            startDate: new Date(period.startDate),
            endDate: periodEndDate,
          },
          daysUntilDue: Math.floor((submissionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        };
      }
    }

    // All periods have passed - calculate next recurring period
    // Find which period should come next based on current month
    const currentMonth = now.getMonth() + 1; // 1-12
    let nextPeriod = null;

    // Find the period that should occur next based on current month
    for (const period of sortedPeriods) {
      const periodStart = new Date(period.startDate);
      const periodStartMonth = periodStart.getMonth() + 1;

      // Check if this period should occur in the current or next cycle
      let testYear = now.getFullYear();
      if (periodStartMonth < currentMonth) {
        testYear = now.getFullYear() + 1;
      }

      const testPeriodStart = new Date(periodStart);
      testPeriodStart.setFullYear(testYear);

      const testPeriodEnd = new Date(period.endDate);
      testPeriodEnd.setFullYear(testYear);

      const testSubmissionDate = new Date(testPeriodEnd);
      testSubmissionDate.setDate(testSubmissionDate.getDate() + vatFilingDaysAfterPeriod);

      if (testSubmissionDate.getTime() > now.getTime()) {
        if (!nextPeriod || testSubmissionDate.getTime() < new Date(nextPeriod.endDate).getTime()) {
          nextPeriod = {
            startDate: testPeriodStart,
            endDate: testPeriodEnd,
            submissionDate: testSubmissionDate,
          };
        }
      }
    }

    // If no period found, use first period of next year
    if (!nextPeriod) {
      const firstPeriod = sortedPeriods[0];
      const nextPeriodStart = new Date(firstPeriod.startDate);
      nextPeriodStart.setFullYear(now.getFullYear() + 1);

      const nextPeriodEnd = new Date(firstPeriod.endDate);
      nextPeriodEnd.setFullYear(now.getFullYear() + 1);

      const submissionDate = new Date(nextPeriodEnd);
      submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

      return {
        submissionDate,
        period: {
          startDate: nextPeriodStart,
          endDate: nextPeriodEnd,
        },
        daysUntilDue: Math.floor((submissionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    }

    return {
      submissionDate: nextPeriod.submissionDate,
      period: {
        startDate: nextPeriod.startDate,
        endDate: nextPeriod.endDate,
      },
      daysUntilDue: Math.floor((nextPeriod.submissionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }

  // Fallback to cycle-based calculation - cycle continuously without anchoring to dates
  if (client.businessInfo?.vatReturnCycle) {
    const cycle = client.businessInfo.vatReturnCycle;
    let periodEndDate = new Date(now);
    let submissionDate = new Date(now);

    if (cycle === 'MONTHLY') {
      // Always use current month's end, if submission passed, use next month
      periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      submissionDate = new Date(periodEndDate);
      submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

      // If submission date has passed, move to next month (cycle forward)
      if (submissionDate <= now) {
        periodEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        submissionDate = new Date(periodEndDate);
        submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);
      }
    } else if (cycle === 'QUARTERLY') {
      // Calculate current quarter and cycle forward
      const currentQuarter = Math.floor(now.getMonth() / 3);
      // Current quarter end (month 3, 6, 9, or 12)
      periodEndDate = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
      submissionDate = new Date(periodEndDate);
      submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);

      // If submission date has passed, move to next quarter (cycle forward)
      if (submissionDate <= now) {
        const nextQuarter = currentQuarter + 1;
        if (nextQuarter >= 4) {
          // Cycle to Q1 of next year
          periodEndDate = new Date(now.getFullYear() + 1, 3, 0);
        } else {
          // Cycle to next quarter of same year
          periodEndDate = new Date(now.getFullYear(), (nextQuarter + 1) * 3, 0);
        }
        submissionDate = new Date(periodEndDate);
        submissionDate.setDate(submissionDate.getDate() + vatFilingDaysAfterPeriod);
      }
    } else {
      return null;
    }

    return {
      submissionDate,
      cycle,
      daysUntilDue: Math.floor((submissionDate - now) / (1000 * 60 * 60 * 24)),
    };
  }

  return null;
};

/**
 * Calculate next Corporate Tax submission date for a client
 * @param {Object} client - Client document
 * @returns {Object|null} Next Corporate Tax submission date info or null
 */
export const calculateNextCorporateTaxSubmissionDate = (client) => {
  const now = new Date();

  if (client.businessInfo?.corporateTaxDueDate) {
    const dueDate = new Date(client.businessInfo.corporateTaxDueDate);

    // If due date has passed, calculate next year
    if (dueDate < now) {
      const nextDueDate = new Date(dueDate);
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);

      return {
        submissionDate: nextDueDate,
        daysUntilDue: Math.floor((nextDueDate - now) / (1000 * 60 * 60 * 24)),
      };
    }

    return {
      submissionDate: dueDate,
      daysUntilDue: Math.floor((dueDate - now) / (1000 * 60 * 60 * 24)),
    };
  }

  return null;
};

/**
 * Calculate compliance status and alerts for a client
 * @param {Object} client - Client document
 * @returns {Object} Compliance status with alerts
 */
export const calculateComplianceStatus = (client) => {
  const requiredDocumentCategories = [
    'TRADE_LICENSE',
    'VAT_CERTIFICATE',
    'CORPORATE_TAX_CERTIFICATE',
  ];

  const alerts = [];
  const missingDocuments = [];
  const expiringDocuments = [];

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Check for missing documents
  requiredDocumentCategories.forEach((category) => {
    const doc = client.documents.find((d) => d.category === category);
    if (!doc || doc.uploadStatus !== 'VERIFIED') {
      missingDocuments.push(category);
      alerts.push({
        type: 'MISSING_DOCUMENT',
        severity: 'HIGH',
        message: `Missing or unverified ${category.replace(/_/g, ' ').toLowerCase()}`,
        category,
      });
    }
  });

  // Check license expiry
  if (client.businessInfo?.licenseExpiryDate) {
    const expiryDate = new Date(client.businessInfo.licenseExpiryDate);
    if (expiryDate < now) {
      alerts.push({
        type: 'EXPIRED_LICENSE',
        severity: 'CRITICAL',
        message: 'Trade License has expired',
        expiryDate,
      });
      expiringDocuments.push({
        type: 'TRADE_LICENSE',
        expiryDate,
        daysUntilExpiry: Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24)),
      });
    } else if (expiryDate <= thirtyDays) {
      alerts.push({
        type: 'EXPIRING_LICENSE',
        severity: 'HIGH',
        message: `Trade License expires in ${Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24))} days`,
        expiryDate,
      });
      expiringDocuments.push({
        type: 'TRADE_LICENSE',
        expiryDate,
        daysUntilExpiry: Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24)),
      });
    } else if (expiryDate <= sixtyDays) {
      alerts.push({
        type: 'EXPIRING_LICENSE',
        severity: 'MEDIUM',
        message: `Trade License expires in ${Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24))} days`,
        expiryDate,
      });
      expiringDocuments.push({
        type: 'TRADE_LICENSE',
        expiryDate,
        daysUntilExpiry: Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24)),
      });
    }
  }

  // Check VAT Tax Periods and generate recurring alerts
  if (client.businessInfo?.vatTaxPeriods && client.businessInfo.vatTaxPeriods.length > 0) {
    const vatTaxPeriods = client.businessInfo.vatTaxPeriods;

    // VAT returns are typically due 28 days after the period ends
    const vatFilingDaysAfterPeriod = 28;

    // Sort periods by start date
    const sortedPeriods = [...vatTaxPeriods].sort((a, b) =>
      new Date(a.startDate) - new Date(b.startDate)
    );

    // Find the next upcoming tax period due date
    let nextDueDate = null;
    let nextPeriod = null;

    // First, check if any current period's due date is in the future
    for (const period of sortedPeriods) {
      const periodEndDate = new Date(period.endDate);
      const dueDate = new Date(periodEndDate);
      dueDate.setDate(dueDate.getDate() + vatFilingDaysAfterPeriod);

      // Check if this period's due date is in the future
      if (dueDate > now) {
        if (!nextDueDate || dueDate < nextDueDate) {
          nextDueDate = dueDate;
          nextPeriod = period;
        }
      }
    }

    // If no future period found, calculate the next recurring period
    if (!nextDueDate && sortedPeriods.length > 0) {
      // Find which period we're currently in or just passed
      let currentPeriodIndex = -1;
      for (let i = 0; i < sortedPeriods.length; i++) {
        const periodStart = new Date(sortedPeriods[i].startDate);
        const periodEnd = new Date(sortedPeriods[i].endDate);
        if (now >= periodStart && now <= periodEnd) {
          currentPeriodIndex = i;
          break;
        }
      }

      // If not in any period, find the most recent one
      if (currentPeriodIndex === -1) {
        for (let i = sortedPeriods.length - 1; i >= 0; i--) {
          const periodEnd = new Date(sortedPeriods[i].endDate);
          if (periodEnd < now) {
            currentPeriodIndex = i;
            break;
          }
        }
      }

      // Calculate next period in sequence
      let nextPeriodIndex = (currentPeriodIndex + 1) % sortedPeriods.length;
      const basePeriod = sortedPeriods[nextPeriodIndex];

      // Calculate how many years to add based on which cycle we're in
      const basePeriodStart = new Date(basePeriod.startDate);
      const basePeriodEnd = new Date(basePeriod.endDate);
      const latestPeriodEnd = new Date(sortedPeriods[sortedPeriods.length - 1].endDate);

      // If we've passed all periods, move to next year
      let yearOffset = 0;
      if (now > latestPeriodEnd) {
        yearOffset = Math.floor((now - latestPeriodEnd) / (365 * 24 * 60 * 60 * 1000)) + 1;
      } else if (currentPeriodIndex >= 0 && nextPeriodIndex <= currentPeriodIndex) {
        // We've wrapped around to the beginning of the cycle, so add a year
        yearOffset = 1;
      }

      const nextPeriodStart = new Date(basePeriodStart);
      nextPeriodStart.setFullYear(nextPeriodStart.getFullYear() + yearOffset);

      const nextPeriodEnd = new Date(basePeriodEnd);
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + yearOffset);

      nextDueDate = new Date(nextPeriodEnd);
      nextDueDate.setDate(nextDueDate.getDate() + vatFilingDaysAfterPeriod);

      nextPeriod = {
        startDate: nextPeriodStart,
        endDate: nextPeriodEnd,
      };
    }

    if (nextDueDate) {
      const daysUntilDue = Math.floor((nextDueDate - now) / (1000 * 60 * 60 * 24));

      // Prioritize upcoming alerts - only show overdue if very recent (within 7 days)
      // Otherwise focus on upcoming alerts
      if (daysUntilDue < 0 && daysUntilDue >= -7) {
        // Only show overdue if within last 7 days
        alerts.push({
          type: 'VAT_RETURN_OVERDUE',
          severity: 'CRITICAL',
          message: `VAT return is overdue. Period: ${formatDateDDMMYYYY(nextPeriod.startDate)} - ${formatDateDDMMYYYY(nextPeriod.endDate)}`,
          dueDate: nextDueDate,
          period: nextPeriod,
          daysOverdue: Math.abs(daysUntilDue),
        });
      } else if (daysUntilDue >= 0 && daysUntilDue <= 30) {
        // Show upcoming alerts up to 30 days ahead
        let severity = 'MEDIUM';
        if (daysUntilDue <= 7) {
          severity = 'CRITICAL';
        } else if (daysUntilDue <= 14) {
          severity = 'HIGH';
        }

        alerts.push({
          type: 'VAT_RETURN_DUE',
          severity: severity,
          message: `VAT return due in ${daysUntilDue} day(s). Period: ${formatDateDDMMYYYY(nextPeriod.startDate)} - ${formatDateDDMMYYYY(nextPeriod.endDate)}`,
          dueDate: nextDueDate,
          period: nextPeriod,
          daysUntilDue,
        });
      }
    }
  } else if (client.businessInfo?.vatReturnCycle) {
    // Fallback to cycle-based alerts if tax periods not available
    const cycle = client.businessInfo.vatReturnCycle;
    if (cycle === 'MONTHLY' || cycle === 'QUARTERLY') {
      // Generate alert based on cycle (simplified - would need more logic for exact dates)
      alerts.push({
        type: 'VAT_RETURN_DUE',
        severity: 'MEDIUM',
        message: `VAT return cycle: ${cycle}. Please check tax periods for exact due dates.`,
        cycle,
      });
    }
  }

  // Check VAT/Corporate Tax due dates
  if (client.businessInfo?.corporateTaxDueDate) {
    const dueDate = new Date(client.businessInfo.corporateTaxDueDate);
    const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
    // Only show upcoming alerts (up to 30 days ahead) or very recent overdue (within 7 days)
    if ((daysUntilDue >= 0 && daysUntilDue <= 30) || (daysUntilDue < 0 && daysUntilDue >= -7)) {
      let severity = 'MEDIUM';
      if (daysUntilDue <= 7) {
        severity = daysUntilDue < 0 ? 'CRITICAL' : 'HIGH';
      } else if (daysUntilDue <= 14) {
        severity = 'HIGH';
      }

      alerts.push({
        type: 'TAX_DUE_DATE',
        severity: severity,
        message: `Corporate Tax due date: ${formatDateDDMMYYYY(dueDate)}`,
        dueDate,
        daysUntilDue: daysUntilDue < 0 ? Math.abs(daysUntilDue) : daysUntilDue,
      });
    }
  }

  // Check Emirates ID expiry for partners and managers
  [...(client.partners || []), ...(client.managers || [])].forEach((person) => {
    if (person.emiratesId?.expiryDate) {
      const expiryDate = new Date(person.emiratesId.expiryDate);
      if (expiryDate < now) {
        alerts.push({
          type: 'EXPIRED_EMIRATES_ID',
          severity: 'HIGH',
          message: `Emirates ID expired for ${person.name}`,
          personId: person._id,
          personName: person.name,
          expiryDate,
        });
      } else if (expiryDate <= ninetyDays) {
        alerts.push({
          type: 'EXPIRING_EMIRATES_ID',
          severity: 'MEDIUM',
          message: `Emirates ID expiring soon for ${person.name}`,
          personId: person._id,
          personName: person.name,
          expiryDate,
          daysUntilExpiry: Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24)),
        });
      }
    }

    if (person.passport?.expiryDate) {
      const expiryDate = new Date(person.passport.expiryDate);
      if (expiryDate < now) {
        alerts.push({
          type: 'EXPIRED_PASSPORT',
          severity: 'HIGH',
          message: `Passport expired for ${person.name}`,
          personId: person._id,
          personName: person.name,
          expiryDate,
        });
      } else if (expiryDate <= ninetyDays) {
        alerts.push({
          type: 'EXPIRING_PASSPORT',
          severity: 'MEDIUM',
          message: `Passport expiring soon for ${person.name}`,
          personId: person._id,
          personName: person.name,
          expiryDate,
          daysUntilExpiry: Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24)),
        });
      }
    }
  });

  // Note: AI-extracted field verification removed - document verification is sufficient

  // Calculate overall compliance score
  const totalRequiredDocs = requiredDocumentCategories.length;
  const verifiedDocs = requiredDocumentCategories.filter((cat) => {
    const doc = client.documents.find((d) => d.category === cat);
    return doc && doc.uploadStatus === 'VERIFIED';
  }).length;

  const complianceScore = totalRequiredDocs > 0 ? (verifiedDocs / totalRequiredDocs) * 100 : 0;
  const hasCriticalAlerts = alerts.some((alert) => alert.severity === 'CRITICAL');
  const hasHighAlerts = alerts.some((alert) => alert.severity === 'HIGH');

  return {
    complianceScore: Math.round(complianceScore),
    status: hasCriticalAlerts ? 'CRITICAL' : hasHighAlerts ? 'WARNING' : 'COMPLIANT',
    missingDocuments,
    expiringDocuments,
    alerts: alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

      // First sort by severity
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;

      // Then prioritize upcoming alerts over overdue ones
      const aDate = a.dueDate || a.expiryDate;
      const bDate = b.dueDate || b.expiryDate;

      if (aDate && bDate) {
        const aDays = a.daysUntilDue !== undefined ? a.daysUntilDue :
          (a.daysUntilExpiry !== undefined ? a.daysUntilExpiry :
            Math.floor((new Date(aDate) - now) / (1000 * 60 * 60 * 24)));
        const bDays = b.daysUntilDue !== undefined ? b.daysUntilDue :
          (b.daysUntilExpiry !== undefined ? b.daysUntilExpiry :
            Math.floor((new Date(bDate) - now) / (1000 * 60 * 60 * 24)));

        // Prioritize upcoming (positive days) over overdue (negative days)
        if (aDays >= 0 && bDays < 0) return -1;
        if (aDays < 0 && bDays >= 0) return 1;

        // If both are upcoming or both overdue, sort by days (soonest first)
        return aDays - bDays;
      }

      return 0;
    }),
    lastUpdated: new Date(),
  };
};

