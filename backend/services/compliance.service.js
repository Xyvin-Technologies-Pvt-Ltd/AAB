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

  // Check VAT/Corporate Tax due dates
  if (client.businessInfo?.corporateTaxDueDate) {
    const dueDate = new Date(client.businessInfo.corporateTaxDueDate);
    if (dueDate <= thirtyDays) {
      alerts.push({
        type: 'TAX_DUE_DATE',
        severity: 'HIGH',
        message: `Corporate Tax due date approaching: ${dueDate.toLocaleDateString()}`,
        dueDate,
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
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    lastUpdated: new Date(),
  };
};

