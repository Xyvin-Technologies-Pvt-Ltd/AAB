import Client from '../client/client.model.js';
import Employee from '../employee/employee.model.js';
import Task from '../task/task.model.js';
import TimeEntry from '../timeEntry/timeEntry.model.js';
import Invoice from '../invoice/invoice.model.js';
import Package from '../package/package.model.js';
import logger from '../../helpers/logger.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Escape special regex characters to prevent ReDoS attacks.
 */
const escapeRegex = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Apply role-based data scoping to queries.
 * - ADMIN/DIRECTOR: No restrictions
 * - MANAGER: Restrict to their team (managedBy)
 * - EMPLOYEE: Restrict to their own data (employeeId)
 */
const applyRBACFilter = (query, user, entityType = 'client') => {
  if (user.role === 'ADMIN' || user.role === 'DIRECTOR') {
    return query; // No restrictions
  }

  if (user.role === 'MANAGER' && user.employeeId) {
    // Managers see their team's data
    if (entityType === 'employee') {
      query.$or = [
        { _id: user.employeeId },
        { managedBy: user.employeeId },
      ];
    }
    // For other entities, we'd need to join through employee relationships
    // For now, allow managers to see all clients/tasks but restrict employee-specific queries
  }

  if (user.role === 'EMPLOYEE' && user.employeeId) {
    // Employees only see their own data
    if (entityType === 'employee') {
      query._id = user.employeeId;
    } else if (entityType === 'timeEntry' || entityType === 'task') {
      query.employeeId = user.employeeId;
    }
  }

  return query;
};

const resolveClientId = async (clientId, clientName) => {
  if (clientId) return clientId;
  if (clientName) {
    const sanitized = escapeRegex(clientName);
    const c = await Client.findOne({ name: { $regex: sanitized, $options: 'i' } }).lean();
    return c?._id?.toString() || null;
  }
  return null;
};

const resolveEmployeeId = async (employeeId, employeeName) => {
  if (employeeId) return employeeId;
  if (employeeName) {
    const sanitized = escapeRegex(employeeName);
    const e = await Employee.findOne({ name: { $regex: sanitized, $options: 'i' } }).lean();
    return e?._id?.toString() || null;
  }
  return null;
};

// ─── Tool Implementations ───────────────────────────────────────────────────

export const executeSearchClients = async (args, user) => {
  try {
    const { search, status, emirate, vatReturnCycle, hasComplianceIssues, limit = 20 } = args;
    let query = {};

    if (search) query.name = { $regex: escapeRegex(search), $options: 'i' };
    if (status) query.status = status;
    if (emirate) query['businessInfo.emirate'] = { $regex: escapeRegex(emirate), $options: 'i' };
    if (vatReturnCycle) query['businessInfo.vatReturnCycle'] = vatReturnCycle;

    // Apply RBAC filtering
    query = applyRBACFilter(query, user, 'client');

    let clients = await Client.find(query)
      .select('name nameArabic status businessInfo.emirate businessInfo.vatReturnCycle compliance documents')
      .limit(limit)
      .lean();

    if (hasComplianceIssues) {
      const now = new Date();
      clients = clients.filter((c) => {
        const docs = c.documents || [];
        return docs.some((d) => {
          const expiry =
            d.extractedData?.licenseExpiryDate?.value ||
            d.extractedData?.taxPeriods?.value?.[0]?.endDate;
          if (!expiry) return false;
          return new Date(expiry) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        });
      });
    }

    return {
      count: clients.length,
      clients: clients.map((c) => ({
        id: c._id,
        name: c.name,
        nameArabic: c.nameArabic,
        status: c.status,
        emirate: c.businessInfo?.emirate,
        vatReturnCycle: c.businessInfo?.vatReturnCycle,
        documentCount: (c.documents || []).length,
      })),
    };
  } catch (err) {
    logger.error('Tool error: search_clients', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetClientDetails = async (args, user) => {
  try {
    const { clientId, clientName } = args;
    const resolvedId = await resolveClientId(clientId, clientName);

    if (!resolvedId) {
      return { error: 'Client not found. Please provide a valid client ID or name.' };
    }

    let query = { _id: resolvedId };
    query = applyRBACFilter(query, user, 'client');

    const client = await Client.findOne(query)
      .populate('managers.linkedPartnerId')
      .lean();

    if (!client) return { error: 'Client not found or access denied.' };

    const packages = await Package.find({ clientId: resolvedId }).lean();
    const openTasks = await Task.countDocuments({ clientId: resolvedId, status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const documentSummary = (client.documents || []).map((d) => {
      const expiryDate =
        d.extractedData?.licenseExpiryDate?.value ||
        d.extractedData?.expiryDate?.value;
      let expiryStatus = null;
      if (expiryDate) {
        const exp = new Date(expiryDate);
        if (exp < now) expiryStatus = 'EXPIRED';
        else if (exp < thirtyDaysFromNow) expiryStatus = 'EXPIRING_SOON';
        else expiryStatus = 'VALID';
      }
      return {
        category: d.category,
        name: d.name,
        uploadStatus: d.uploadStatus,
        processingStatus: d.processingStatus,
        expiryDate: expiryDate || null,
        expiryStatus,
      };
    });

    return {
      id: client._id,
      name: client.name,
      nameArabic: client.nameArabic,
      status: client.status,
      businessInfo: {
        emirate: client.businessInfo?.emirate,
        address: client.businessInfo?.address,
        trn: client.businessInfo?.trn,
        ctrn: client.businessInfo?.ctrn,
        vatReturnCycle: client.businessInfo?.vatReturnCycle,
        licenseNumber: client.businessInfo?.licenseNumber,
        licenseStartDate: client.businessInfo?.licenseStartDate,
        licenseExpiryDate: client.businessInfo?.licenseExpiryDate,
      },
      contactPerson: client.contactPerson,
      email: client.email,
      phone: client.phone,
      partners: (client.partners || []).map((p) => ({
        name: p.name,
        role: p.role,
      })),
      managers: (client.managers || []).map((m) => ({
        name: m.name,
        role: m.role,
      })),
      packages: packages.map((p) => ({
        id: p._id,
        name: p.name,
        type: p.type,
        status: p.status,
        contractValue: p.contractValue,
        billingFrequency: p.billingFrequency,
      })),
      documents: documentSummary,
      openTaskCount: openTasks,
    };
  } catch (err) {
    logger.error('Tool error: get_client_details', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetComplianceStatus = async (args, user) => {
  try {
    const { clientId, daysAhead = 30, includeExpired = true } = args;
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    let query = clientId ? { _id: clientId } : {};
    query = applyRBACFilter(query, user, 'client');
    
    const clients = await Client.find(query)
      .select('name businessInfo documents')
      .lean();

    const complianceIssues = [];

    for (const client of clients) {
      const issues = [];

      // Check trade license expiry
      const tradeLic = (client.documents || []).find((d) => d.category === 'TRADE_LICENSE');
      if (tradeLic) {
        const expiry = tradeLic.extractedData?.licenseExpiryDate?.value;
        if (expiry) {
          const expDate = new Date(expiry);
          if ((includeExpired && expDate < now) || (expDate >= now && expDate <= futureDate)) {
            issues.push({
              type: 'TRADE_LICENSE_EXPIRY',
              severity: expDate < now ? 'EXPIRED' : 'EXPIRING_SOON',
              expiryDate: expiry,
              daysUntilExpiry: Math.ceil((expDate - now) / (1000 * 60 * 60 * 24)),
            });
          }
        }
      } else {
        issues.push({ type: 'TRADE_LICENSE_MISSING', severity: 'WARNING' });
      }

      // Check VAT certificate and upcoming filing
      const vatCert = (client.documents || []).find((d) => d.category === 'VAT_CERTIFICATE');
      if (vatCert) {
        const taxPeriods = vatCert.extractedData?.taxPeriods?.value || [];
        const currentPeriod = taxPeriods.find((p) => {
          const end = new Date(p.endDate);
          return end >= now && end <= futureDate;
        });
        if (currentPeriod) {
          issues.push({
            type: 'VAT_FILING_DUE',
            severity: 'INFO',
            periodEndDate: currentPeriod.endDate,
            vatReturnCycle: client.businessInfo?.vatReturnCycle,
          });
        }
      }

      // Check corporate tax
      const corpTax = client.businessInfo?.corporateTaxDueDate;
      if (corpTax) {
        const dueDate = new Date(corpTax);
        if ((includeExpired && dueDate < now) || (dueDate >= now && dueDate <= futureDate)) {
          issues.push({
            type: 'CORPORATE_TAX_DUE',
            severity: dueDate < now ? 'OVERDUE' : 'DUE_SOON',
            dueDate: corpTax,
          });
        }
      }

      // Check Emirates IDs and passports expiry
      const idDocs = (client.documents || []).filter((d) =>
        ['EMIRATES_ID_PARTNER', 'EMIRATES_ID_MANAGER', 'PASSPORT_PARTNER', 'PASSPORT_MANAGER'].includes(d.category)
      );
      for (const doc of idDocs) {
        const expiry = doc.extractedData?.expiryDate?.value;
        if (expiry) {
          const expDate = new Date(expiry);
          if ((includeExpired && expDate < now) || (expDate >= now && expDate <= futureDate)) {
            issues.push({
              type: `${doc.category}_EXPIRY`,
              severity: expDate < now ? 'EXPIRED' : 'EXPIRING_SOON',
              documentName: doc.name,
              expiryDate: expiry,
            });
          }
        }
      }

      if (issues.length > 0) {
        complianceIssues.push({
          clientId: client._id,
          clientName: client.name,
          issueCount: issues.length,
          issues,
        });
      }
    }

    return {
      totalClientsChecked: clients.length,
      clientsWithIssues: complianceIssues.length,
      summary: complianceIssues,
    };
  } catch (err) {
    logger.error('Tool error: get_compliance_status', { error: err.message });
    return { error: err.message };
  }
};

export const executeSearchTasks = async (args, user) => {
  try {
    const {
      status, clientId, clientName, assignedToEmployeeId, assignedToName,
      priority, isOverdue, dueBefore, dueAfter, search, limit = 20,
    } = args;

    const resolvedClientId = await resolveClientId(clientId, clientName);
    const resolvedEmployeeId = await resolveEmployeeId(assignedToEmployeeId, assignedToName);

    const query = {};
    if (status) query.status = status;
    if (resolvedClientId) query.clientId = resolvedClientId;
    if (resolvedEmployeeId) query.assignedTo = resolvedEmployeeId;
    if (priority) query.priority = priority;
    if (search) query.name = { $regex: search, $options: 'i' };

    const now = new Date();
    if (isOverdue) {
      query.dueDate = { $lt: now };
      query.status = { $nin: ['DONE', 'ARCHIVED'] };
    } else {
      if (dueBefore || dueAfter) {
        query.dueDate = {};
        if (dueBefore) query.dueDate.$lt = new Date(dueBefore);
        if (dueAfter) query.dueDate.$gt = new Date(dueAfter);
      }
    }

    // EMPLOYEE role: only their tasks
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      query.assignedTo = user.employeeId;
    }

    const tasks = await Task.find(query)
      .populate('clientId', 'name')
      .populate('assignedTo', 'name')
      .sort({ dueDate: 1, priority: -1 })
      .limit(limit)
      .lean();

    return {
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t._id,
        name: t.name,
        status: t.status,
        priority: t.priority,
        client: t.clientId?.name,
        assignedTo: (t.assignedTo || []).map((e) => e.name),
        dueDate: t.dueDate,
        category: t.category,
        isOverdue: t.dueDate ? new Date(t.dueDate) < now && !['DONE', 'ARCHIVED'].includes(t.status) : false,
      })),
    };
  } catch (err) {
    logger.error('Tool error: search_tasks', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetEmployeeWorkload = async (args, user) => {
  try {
    const { employeeId, employeeName, startDate, endDate } = args;
    const resolvedId = await resolveEmployeeId(employeeId, employeeName);

    let employeeQuery = resolvedId ? { _id: resolvedId } : { isActive: true };
    employeeQuery = applyRBACFilter(employeeQuery, user, 'employee');
    
    const employees = await Employee.find(employeeQuery)
      .select('name designation hourlyRate monthlyCost monthlyWorkingHours isActive')
      .lean();

    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : now;

    const employeeIds = employees.map((e) => e._id);

    // Optimized: Single aggregation for all time entries
    const timeAggregation = await TimeEntry.aggregate([
      {
        $match: {
          employeeId: { $in: employeeIds },
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$employeeId',
          totalMinutes: { $sum: '$minutesSpent' },
        },
      },
    ]);

    // Optimized: Single aggregation for all active tasks
    const taskAggregation = await Task.aggregate([
      {
        $match: {
          assignedTo: { $in: employeeIds },
          status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW'] },
        },
      },
      {
        $group: {
          _id: '$assignedTo',
          count: { $sum: 1 },
        },
      },
    ]);

    // Build lookup maps
    const timeMap = {};
    timeAggregation.forEach((t) => {
      timeMap[t._id.toString()] = t.totalMinutes;
    });

    const taskMap = {};
    taskAggregation.forEach((t) => {
      taskMap[t._id.toString()] = t.count;
    });

    // Combine results
    const workloads = employees.map((emp) => {
      const empId = emp._id.toString();
      const totalMinutes = timeMap[empId] || 0;
      const totalHours = totalMinutes / 60;
      const activeTasks = taskMap[empId] || 0;
      const monthlyCapacityHours = emp.monthlyWorkingHours || 160;
      const utilizationPct = Math.round((totalHours / monthlyCapacityHours) * 100);

      return {
        id: emp._id,
        name: emp.name,
        designation: emp.designation,
        hoursLogged: Math.round(totalHours * 10) / 10,
        monthlyCapacity: monthlyCapacityHours,
        utilizationPercent: utilizationPct,
        activeTasks,
        isOverUtilized: utilizationPct > 100,
      };
    });

    return {
      period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
      employees: workloads,
      overUtilized: workloads.filter((e) => e.isOverUtilized).map((e) => e.name),
    };
  } catch (err) {
    logger.error('Tool error: get_employee_workload', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetInvoiceSummary = async (args, user) => {
  try {
    const { clientId, status, startDate, endDate } = args;
    let query = {};
    if (clientId) query.clientId = clientId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    // Apply RBAC filtering (invoices are client-related)
    query = applyRBACFilter(query, user, 'invoice');

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name')
      .lean();

    const stats = {
      total: invoices.length,
      totalAmount: 0,
      byStatus: { DRAFT: 0, SENT: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 },
      byStatusAmount: { DRAFT: 0, SENT: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 },
    };

    invoices.forEach((inv) => {
      stats.totalAmount += inv.total || 0;
      if (stats.byStatus[inv.status] !== undefined) {
        stats.byStatus[inv.status]++;
        stats.byStatusAmount[inv.status] += inv.total || 0;
      }
    });

    const recentInvoices = invoices
      .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate))
      .slice(0, 10)
      .map((inv) => ({
        invoiceNumber: inv.invoiceNumber,
        client: inv.clientId?.name,
        total: inv.total,
        status: inv.status,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
      }));

    return {
      summary: stats,
      recentInvoices,
      outstandingAmount: stats.byStatusAmount.SENT + stats.byStatusAmount.OVERDUE,
    };
  } catch (err) {
    logger.error('Tool error: get_invoice_summary', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetTimeEntries = async (args, user) => {
  try {
    const { employeeId, employeeName, clientId, clientName, startDate, endDate, limit = 20 } = args;

    const resolvedEmployeeId = await resolveEmployeeId(employeeId, employeeName);
    const resolvedClientId = await resolveClientId(clientId, clientName);

    const query = {};
    if (resolvedEmployeeId) query.employeeId = resolvedEmployeeId;
    if (resolvedClientId) query.clientId = resolvedClientId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (user.role === 'EMPLOYEE' && user.employeeId) {
      query.employeeId = user.employeeId;
    }

    const entries = await TimeEntry.find(query)
      .populate('employeeId', 'name')
      .populate('clientId', 'name')
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    const totalMinutes = entries.reduce((s, e) => s + (e.minutesSpent || 0), 0);

    return {
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      entryCount: entries.length,
      entries: entries.map((e) => ({
        id: e._id,
        employee: e.employeeId?.name,
        client: e.clientId?.name,
        date: e.date,
        hours: Math.round(((e.minutesSpent || 0) / 60) * 10) / 10,
        description: e.description,
      })),
    };
  } catch (err) {
    logger.error('Tool error: get_time_entries', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetDashboardStats = async (args, user) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeClients, totalEmployees, activePackages, pendingTasks, overdueTasks,
      monthlyHoursResult, overdueInvoices] = await Promise.all([
      Client.countDocuments({ status: 'ACTIVE' }),
      Employee.countDocuments({ isActive: true }),
      Package.countDocuments({ status: 'ACTIVE' }),
      Task.countDocuments({ status: { $in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } }),
      Task.countDocuments({ status: { $nin: ['DONE', 'ARCHIVED'] }, dueDate: { $lt: now } }),
      TimeEntry.aggregate([
        { $match: { date: { $gte: monthStart } } },
        { $group: { _id: null, totalMinutes: { $sum: '$minutesSpent' } } },
      ]),
      Invoice.countDocuments({ status: 'OVERDUE' }),
    ]);

    const monthlyHours = monthlyHoursResult[0]?.totalMinutes
      ? Math.round(monthlyHoursResult[0].totalMinutes / 60)
      : 0;

    // Optimized: Compliance issues count using aggregation
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const complianceAggregation = await Client.aggregate([
      { $unwind: { path: '$documents', preserveNullAndEmptyArrays: false } },
      { $match: { 'documents.category': 'TRADE_LICENSE' } },
      {
        $project: {
          expiryDate: '$documents.extractedData.licenseExpiryDate.value',
        },
      },
      {
        $match: {
          expiryDate: { $exists: true, $lte: thirtyDaysFromNow },
        },
      },
      { $count: 'count' },
    ]);
    const complianceIssueCount = complianceAggregation[0]?.count || 0;

    return {
      activeClients,
      totalEmployees,
      activePackages,
      pendingTasks,
      overdueTasks,
      monthlyHoursLogged: monthlyHours,
      overdueInvoices,
      complianceAlertsNext30Days: complianceIssueCount,
      asOf: now.toISOString(),
    };
  } catch (err) {
    logger.error('Tool error: get_dashboard_stats', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetAnalytics = async (args, user) => {
  try {
    const { analyticsType: type, clientId, employeeId, startDate, endDate, limit = 10 } = args;
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = endDate ? new Date(endDate) : now;

    if (type === 'package') {
      let query = clientId ? { clientId } : {};
      query = applyRBACFilter(query, user, 'package');
      
      const packages = await Package.find(query)
        .populate('clientId', 'name')
        .limit(limit)
        .lean();

      const packageIds = packages.map((p) => p._id);

      // Optimized: Single aggregation for all package time entries
      const teMatch = { 
        packageId: { $in: packageIds }, 
        date: { $gte: start, $lte: end } 
      };
      if (employeeId) teMatch.employeeId = employeeId;

      const timeAggregation = await TimeEntry.aggregate([
        { $match: teMatch },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$packageId',
            totalMinutes: { $sum: '$minutesSpent' },
            totalCost: {
              $sum: {
                $multiply: [
                  { $divide: ['$minutesSpent', 60] },
                  { $ifNull: ['$employee.hourlyRate', 0] },
                ],
              },
            },
          },
        },
      ]);

      const timeMap = {};
      timeAggregation.forEach((t) => {
        timeMap[t._id.toString()] = {
          totalMinutes: t.totalMinutes,
          totalCost: t.totalCost,
        };
      });

      const results = packages.map((pkg) => {
        const pkgId = pkg._id.toString();
        const data = timeMap[pkgId] || { totalMinutes: 0, totalCost: 0 };
        const totalHours = data.totalMinutes / 60;

        const monthlyRevenue =
          pkg.billingFrequency === 'MONTHLY' ? pkg.contractValue :
          pkg.billingFrequency === 'QUARTERLY' ? pkg.contractValue / 3 :
          pkg.billingFrequency === 'YEARLY' ? pkg.contractValue / 12 : 0;

        return {
          packageId: pkg._id,
          packageName: pkg.name,
          client: pkg.clientId?.name,
          type: pkg.type,
          contractValue: pkg.contractValue,
          monthlyRevenue: Math.round(monthlyRevenue),
          hoursLogged: Math.round(totalHours * 10) / 10,
          estimatedCost: Math.round(data.totalCost),
          profit: Math.round(monthlyRevenue - data.totalCost),
        };
      });

      return { type: 'package', period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }, data: results };
    }

    if (type === 'client') {
      let query = clientId ? { _id: clientId } : {};
      query = applyRBACFilter(query, user, 'client');
      
      const clients = await Client.find(query)
        .limit(limit)
        .lean();

      const clientIds = clients.map((c) => c._id);

      // Optimized: Aggregate packages per client
      const packageAggregation = await Package.aggregate([
        { $match: { clientId: { $in: clientIds }, status: 'ACTIVE' } },
        {
          $group: {
            _id: '$clientId',
            count: { $sum: 1 },
            packages: { $push: { billingFrequency: '$billingFrequency', contractValue: '$contractValue' } },
          },
        },
      ]);

      const packageMap = {};
      packageAggregation.forEach((p) => {
        packageMap[p._id.toString()] = p;
      });

      // Optimized: Aggregate time entries per client
      const timeAggregation = await TimeEntry.aggregate([
        {
          $match: {
            clientId: { $in: clientIds },
            date: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$clientId',
            totalCost: {
              $sum: {
                $multiply: [
                  { $divide: ['$minutesSpent', 60] },
                  { $ifNull: ['$employee.hourlyRate', 0] },
                ],
              },
            },
          },
        },
      ]);

      const timeMap = {};
      timeAggregation.forEach((t) => {
        timeMap[t._id.toString()] = t.totalCost;
      });

      const results = clients.map((c) => {
        const cId = c._id.toString();
        const pkgData = packageMap[cId];
        const packages = pkgData?.packages || [];
        
        const totalRevenue = packages.reduce((s, p) => {
          const monthly =
            p.billingFrequency === 'MONTHLY' ? p.contractValue :
            p.billingFrequency === 'QUARTERLY' ? p.contractValue / 3 :
            p.billingFrequency === 'YEARLY' ? p.contractValue / 12 : 0;
          return s + monthly;
        }, 0);

        const cost = timeMap[cId] || 0;

        return {
          clientId: c._id,
          clientName: c.name,
          activePackages: pkgData?.count || 0,
          monthlyRevenue: Math.round(totalRevenue),
          estimatedCost: Math.round(cost),
          profit: Math.round(totalRevenue - cost),
        };
      });

      return { type: 'client', data: results };
    }

    if (type === 'employee') {
      let query = employeeId ? { _id: employeeId } : { isActive: true };
      query = applyRBACFilter(query, user, 'employee');
      
      const employees = await Employee.find(query)
        .limit(limit)
        .lean();

      const employeeIds = employees.map((e) => e._id);

      // Optimized: Single aggregation for time entries
      const timeAggregation = await TimeEntry.aggregate([
        {
          $match: {
            employeeId: { $in: employeeIds },
            date: { $gte: start, $lte: end },
          },
        },
        {
          $lookup: {
            from: 'employees',
            localField: 'employeeId',
            foreignField: '_id',
            as: 'employee',
          },
        },
        { $unwind: '$employee' },
        {
          $group: {
            _id: '$employeeId',
            totalMinutes: { $sum: '$minutesSpent' },
            totalCost: {
              $sum: {
                $multiply: [
                  { $divide: ['$minutesSpent', 60] },
                  '$employee.hourlyRate',
                ],
              },
            },
          },
        },
      ]);

      const timeMap = {};
      timeAggregation.forEach((t) => {
        timeMap[t._id.toString()] = {
          totalMinutes: t.totalMinutes,
          totalCost: t.totalCost,
        };
      });

      const results = employees.map((emp) => {
        const empId = emp._id.toString();
        const data = timeMap[empId] || { totalMinutes: 0, totalCost: 0 };
        const totalHours = data.totalMinutes / 60;
        const capacity = emp.monthlyWorkingHours || 160;
        const utilization = Math.round((totalHours / capacity) * 100);

        return {
          employeeId: emp._id,
          name: emp.name,
          designation: emp.designation,
          hoursLogged: Math.round(totalHours * 10) / 10,
          capacity,
          utilizationPercent: utilization,
          revenue: Math.round((emp.hourlyRate || 0) * totalHours),
        };
      });

      return { type: 'employee', data: results };
    }

    return { error: 'Invalid analytics type' };
  } catch (err) {
    logger.error('Tool error: get_analytics', { error: err.message });
    return { error: err.message };
  }
};

export const executeSearchEmployees = async (args, user) => {
  try {
    const { search, isActive, limit = 20 } = args;
    let query = {};
    if (search) {
      const sanitized = escapeRegex(search);
      query.$or = [
        { name: { $regex: sanitized, $options: 'i' } },
        { designation: { $regex: sanitized, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) query.isActive = isActive;

    // Apply RBAC filtering
    query = applyRBACFilter(query, user, 'employee');

    const employees = await Employee.find(query).limit(limit).lean();

    return {
      count: employees.length,
      employees: employees.map((e) => ({
        id: e._id,
        name: e.name,
        designation: e.designation,
        hourlyRate: e.hourlyRate,
        monthlyWorkingHours: e.monthlyWorkingHours,
        isActive: e.isActive,
      })),
    };
  } catch (err) {
    logger.error('Tool error: search_employees', { error: err.message });
    return { error: err.message };
  }
};

export const executeGetPackages = async (args, user) => {
  try {
    const { clientId, clientName, status, type, limit = 20 } = args;
    const resolvedClientId = await resolveClientId(clientId, clientName);

    let query = {};
    if (resolvedClientId) query.clientId = resolvedClientId;
    if (status) query.status = status;
    if (type) query.type = type;

    // Apply RBAC filtering
    query = applyRBACFilter(query, user, 'package');

    const packages = await Package.find(query)
      .populate('clientId', 'name')
      .limit(limit)
      .lean();

    return {
      count: packages.length,
      packages: packages.map((p) => ({
        id: p._id,
        name: p.name,
        client: p.clientId?.name,
        type: p.type,
        status: p.status,
        billingFrequency: p.billingFrequency,
        contractValue: p.contractValue,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
    };
  } catch (err) {
    logger.error('Tool error: get_packages', { error: err.message });
    return { error: err.message };
  }
};

// ─── Write Tools ────────────────────────────────────────────────────────────

export const executeCreateTask = async (args, user) => {
  try {
    const { name, clientId, packageId, description, category, priority, dueDate, assignedTo, confirmed } = args;

    if (!confirmed) {
      return { error: 'Task creation requires user confirmation (confirmed: true).' };
    }

    const task = await Task.create({
      name,
      clientId,
      packageId,
      description,
      category,
      priority: priority || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedTo: assignedTo || [],
    });

    return {
      success: true,
      taskId: task._id,
      name: task.name,
      status: task.status,
      message: `Task "${name}" created successfully.`,
    };
  } catch (err) {
    logger.error('Tool error: create_task', { error: err.message });
    return { error: err.message };
  }
};

export const executeCreateBulkTasks = async (args, user) => {
  try {
    const { taskTemplate, clientIds, confirmed } = args;

    if (!confirmed) {
      return { error: 'Bulk task creation requires user confirmation.' };
    }

    const created = [];
    const failed = [];

    for (const cId of clientIds) {
      const pkg = await Package.findOne({ clientId: cId, status: 'ACTIVE' }).lean();
      if (!pkg) {
        failed.push({ clientId: cId, reason: 'No active package found' });
        continue;
      }

      try {
        const task = await Task.create({
          ...taskTemplate,
          clientId: cId,
          packageId: pkg._id,
          dueDate: taskTemplate.dueDate ? new Date(taskTemplate.dueDate) : undefined,
          priority: taskTemplate.priority || 'MEDIUM',
        });
        created.push({ clientId: cId, taskId: task._id });
      } catch (e) {
        failed.push({ clientId: cId, reason: e.message });
      }
    }

    return {
      success: true,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    };
  } catch (err) {
    logger.error('Tool error: create_bulk_tasks', { error: err.message });
    return { error: err.message };
  }
};

export const executeUpdateTaskStatus = async (args, user) => {
  try {
    const { taskId, status, confirmed } = args;

    if (!confirmed) {
      return { error: 'Task status update requires user confirmation.' };
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      { status, ...(status === 'DONE' ? { doneAt: new Date() } : {}) },
      { new: true }
    ).lean();

    if (!task) return { error: 'Task not found.' };

    return {
      success: true,
      taskId,
      newStatus: status,
      message: `Task status updated to ${status}.`,
    };
  } catch (err) {
    logger.error('Tool error: update_task_status', { error: err.message });
    return { error: err.message };
  }
};

export const executeCreateInvoiceDraft = async (args, user) => {
  try {
    const { clientId, notes, dueDate, confirmed } = args;

    if (!confirmed) {
      return { error: 'Invoice creation requires user confirmation.' };
    }

    const unbilledEntries = await TimeEntry.find({
      clientId,
      invoiceId: null,
    })
      .populate('employeeId', 'name hourlyRate')
      .lean();

    if (unbilledEntries.length === 0) {
      return { error: 'No unbilled time entries found for this client.' };
    }

    const lineItems = [];
    let subtotal = 0;

    const entriesByEmployee = {};
    unbilledEntries.forEach((e) => {
      const empId = e.employeeId?._id?.toString() || 'unknown';
      if (!entriesByEmployee[empId]) {
        entriesByEmployee[empId] = { name: e.employeeId?.name || 'Unknown', rate: e.employeeId?.hourlyRate || 0, minutes: 0 };
      }
      entriesByEmployee[empId].minutes += e.minutesSpent || 0;
    });

    Object.values(entriesByEmployee).forEach((emp) => {
      const hours = emp.minutes / 60;
      const amount = Math.round(hours * emp.rate * 100) / 100;
        lineItems.push({ description: `Professional services - ${emp.name}`, quantity: Math.round(hours * 10) / 10, rate: emp.rate, amount });
        subtotal += amount;
    });

    const taxRate = 5;
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 }).lean();
    const nextNum = lastInvoice?.invoiceNumber
      ? `INV-${String(parseInt(lastInvoice.invoiceNumber.split('-')[1] || '0') + 1).padStart(4, '0')}`
      : 'INV-0001';

    const invoice = await Invoice.create({
      invoiceNumber: nextNum,
      clientId,
      timeEntries: unbilledEntries.map((e) => e._id),
      lineItems,
      subtotal,
      taxRate,
      taxAmount,
      total,
      discount: 0,
      status: 'DRAFT',
      issueDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes,
      createdBy: user._id,
    });

    return {
      success: true,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      subtotal,
      taxAmount,
      total,
      lineItems,
      unbilledEntriesCount: unbilledEntries.length,
      message: `Draft invoice ${invoice.invoiceNumber} created for ${formatCurrency(total)}.`,
    };
  } catch (err) {
    logger.error('Tool error: create_invoice_draft', { error: err.message });
    return { error: err.message };
  }
};

const formatCurrency = (amount) => `AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export const executeTool = async (toolName, toolArgs, user) => {
  switch (toolName) {
    case 'search_clients':         return executeSearchClients(toolArgs, user);
    case 'get_client_details':     return executeGetClientDetails(toolArgs, user);
    case 'get_compliance_status':  return executeGetComplianceStatus(toolArgs, user);
    case 'search_tasks':           return executeSearchTasks(toolArgs, user);
    case 'get_employee_workload':  return executeGetEmployeeWorkload(toolArgs, user);
    case 'get_invoice_summary':    return executeGetInvoiceSummary(toolArgs, user);
    case 'get_time_entries':       return executeGetTimeEntries(toolArgs, user);
    case 'get_dashboard_stats':    return executeGetDashboardStats(toolArgs, user);
    case 'get_analytics':          return executeGetAnalytics(toolArgs, user);
    case 'search_employees':       return executeSearchEmployees(toolArgs, user);
    case 'get_packages':           return executeGetPackages(toolArgs, user);
    case 'create_task':            return executeCreateTask(toolArgs, user);
    case 'create_bulk_tasks':      return executeCreateBulkTasks(toolArgs, user);
    case 'update_task_status':     return executeUpdateTaskStatus(toolArgs, user);
    case 'create_invoice_draft':   return executeCreateInvoiceDraft(toolArgs, user);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};
