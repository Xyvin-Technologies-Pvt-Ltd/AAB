import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { analyticsApi } from '@/api/analytics';
import { clientsApi } from '@/api/clients';
import { packagesApi } from '@/api/packages';
import { formatCurrency } from '@/utils/currencyFormat';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { UtilizationChart } from '@/components/charts/UtilizationChart';
import { TimeDistributionChart } from '@/components/charts/TimeDistributionChart';
import { ArrowLeft, Filter, X } from 'lucide-react';
import { LoaderWithText } from '@/components/Loader';

export const EmployeeAnalytics = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    clientId: '',
    packageId: '',
    startDate: '',
    endDate: '',
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', 'employee', employeeId, filters],
    queryFn: () => analyticsApi.getEmployeeAnalytics(employeeId, filters),
    enabled: !!employeeId,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll({ limit: 10000 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll({ limit: 10000 }),
  });

  const clients = clientsData?.data?.clients || [];
  const packages = packagesData?.data?.packages || [];
  const analytics = analyticsData?.data || {};

  const handleClearFilters = () => {
    setFilters({
      clientId: '',
      packageId: '',
      startDate: '',
      endDate: '',
    });
  };

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="py-8">
            <LoaderWithText text="Loading employee analytics..." />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!analytics.employee) {
    return (
      <AppLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-8 text-gray-500">Employee not found</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{analytics.employee.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Employee Analytics</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Filters</h3>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Clear All
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={filters.clientId}
                  onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
                <select
                  value={filters.packageId}
                  onChange={(e) => setFilters({ ...filters, packageId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Packages</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Monthly Salary</p>
            <p className="text-base font-semibold">{formatCurrency(analytics.employee.monthlyCost)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Hourly Rate</p>
            <p className="text-base font-semibold">{formatCurrency(analytics.employee.hourlyRate)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Hours Logged</p>
            <p className="text-base font-semibold">{(analytics.summary?.totalHours || 0).toFixed(1)} hrs</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Utilization %</p>
            <p className="text-base font-semibold">{(analytics.summary?.utilizationRate || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Cost Contribution</p>
            <p className="text-base font-semibold">{formatCurrency(analytics.summary?.costContribution || 0)}</p>
          </div>
        </div>

        {/* Salary vs Earned Analysis */}
        {analytics.salaryVsEarned && (
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">Salary vs Earnings</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500 mb-1">Monthly Salary</p>
                <p className="text-xl font-semibold">{formatCurrency(analytics.salaryVsEarned.monthlySalary)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500 mb-1">Cost Based on Hours</p>
                <p className="text-xl font-semibold">{formatCurrency(analytics.salaryVsEarned.costBasedOnHours)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-500 mb-1">Ratio</p>
                <p className="text-xl font-semibold">{analytics.salaryVsEarned.ratio.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Side by Side */}
        {(analytics.monthlyTrends && analytics.monthlyTrends.length > 0) || (analytics.timeDistribution && analytics.timeDistribution.length > 0) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Utilization Trend */}
            {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 && (
              <div className="bg-white rounded-lg shadow p-5">
                <h2 className="text-lg font-semibold mb-4">Monthly Utilization</h2>
                <UtilizationChart data={analytics.monthlyTrends} />
              </div>
            )}

            {/* Time Distribution */}
            {analytics.timeDistribution && analytics.timeDistribution.length > 0 && (
              <div className="bg-white rounded-lg shadow p-5">
                <h2 className="text-lg font-semibold mb-4">Time by Client</h2>
                <TimeDistributionChart data={analytics.timeDistribution} />
              </div>
            )}
          </div>
        ) : null}

        {/* Work Breakdown - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Clients */}
          {analytics.topClients && analytics.topClients.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold mb-3">Top Clients</h2>
              <div className="space-y-2">
                {analytics.topClients.map((client, idx) => (
                  <div key={client.clientId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-gray-500">
                        {client.hours} hrs • {client.tasks} tasks • {formatCurrency(client.cost)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Packages */}
          {analytics.topPackages && analytics.topPackages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold mb-3">Top Packages</h2>
              <div className="space-y-2">
                {analytics.topPackages.map((pkg, idx) => (
                  <div key={pkg.packageId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{pkg.name}</p>
                      <p className="text-xs text-gray-500">
                        {pkg.hours} hrs • {pkg.tasks} tasks • {formatCurrency(pkg.cost)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Tasks */}
          {analytics.topTasks && analytics.topTasks.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold mb-3">Top Tasks</h2>
              <div className="space-y-2">
                {analytics.topTasks.map((task, idx) => (
                  <div key={task.taskId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{task.name}</p>
                      <p className="text-xs text-gray-500">
                        {task.hours} hrs • {formatCurrency(task.cost)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Time Log */}
        {analytics.detailedTimeLog && analytics.detailedTimeLog.length > 0 && (
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-3">Recent Time Entries</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Client</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Package</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Task</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Hours</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.detailedTimeLog.map((entry, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-sm">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-sm">{entry.clientName}</td>
                      <td className="px-3 py-2 text-sm">{entry.packageName}</td>
                      <td className="px-3 py-2 text-sm">{entry.taskName}</td>
                      <td className="px-3 py-2 text-sm">{entry.hours} hrs</td>
                      <td className="px-3 py-2 text-sm">{formatCurrency(entry.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

