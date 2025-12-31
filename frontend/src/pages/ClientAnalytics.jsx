import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { analyticsApi } from '@/api/analytics';
import { employeesApi } from '@/api/employees';
import { packagesApi } from '@/api/packages';
import { formatCurrency } from '@/utils/currencyFormat';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { MonthlyTrendChart } from '@/components/charts/MonthlyTrendChart';
import { ArrowLeft, Filter, X } from 'lucide-react';
import { LoaderWithText } from '@/components/Loader';
import { Avatar } from '@/components/Avatar';
import { Pagination } from '@/components/Pagination';
import { SearchInput } from '@/components/SearchInput';

export const ClientAnalytics = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: '',
    packageId: '',
    packageType: '',
    startDate: '',
    endDate: '',
  });
  const [packageSearch, setPackageSearch] = useState('');
  const [packagePage, setPackagePage] = useState(1);
  const packageLimit = 5;

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', 'client', clientId, filters],
    queryFn: () => analyticsApi.getClientAnalytics(clientId, filters),
    enabled: !!clientId,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ limit: 10000 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.getAll({ limit: 10000 }),
  });

  const employees = employeesData?.data?.employees || [];
  const packages = (packagesData?.data?.packages || []).filter((pkg) => pkg.clientId === clientId || pkg.clientId?._id === clientId);
  const analytics = analyticsData?.data || {};

  const handleClearFilters = () => {
    setFilters({
      employeeId: '',
      packageId: '',
      packageType: '',
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
            <LoaderWithText text="Loading client analytics..." />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!analytics.client) {
    return (
      <AppLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-8 text-gray-500">Client not found</div>
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
              <h1 className="text-3xl font-bold">{analytics.client.name}</h1>
              <p className="text-sm text-gray-500 mt-1">Client Analytics</p>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={filters.employeeId}
                  onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Type</label>
                <select
                  value={filters.packageType}
                  onChange={(e) => setFilters({ ...filters, packageType: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="">All Types</option>
                  <option value="RECURRING">Recurring</option>
                  <option value="ONE_TIME">One Time</option>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
            <p className="text-base font-semibold">{formatCurrency(analytics.summary?.totalRevenue || 0)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Total Cost</p>
            <p className="text-base font-semibold">{formatCurrency(analytics.summary?.totalCost || 0)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Total Profit</p>
            <p className={`text-base font-semibold ${(analytics.summary?.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(analytics.summary?.totalProfit || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Margin</p>
            <p className={`text-base font-semibold ${(analytics.summary?.margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(analytics.summary?.margin || 0).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Packages</p>
            <p className="text-base font-semibold">{analytics.summary?.packagesCount || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Total Hours</p>
            <p className="text-base font-semibold">{(analytics.summary?.totalHours || 0).toFixed(1)} hrs</p>
          </div>
        </div>

        {/* Monthly Trends */}
        {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 && (
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Trends</h2>
            <MonthlyTrendChart data={analytics.monthlyTrends} />
          </div>
        )}

        {/* Package Breakdown and Top Packages Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Package Breakdown */}
          {analytics.packageBreakdown && analytics.packageBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold mb-3">Package Breakdown</h2>
              
              {/* Search */}
              <div className="mb-3">
                <SearchInput
                  value={packageSearch}
                  onChange={(value) => {
                    setPackageSearch(value);
                    setPackagePage(1);
                  }}
                  placeholder="Search packages..."
                />
              </div>

              {/* Client-side filtering and pagination */}
              {(() => {
                const filteredPackages = analytics.packageBreakdown.filter((pkg) => {
                  if (!packageSearch) return true;
                  const searchLower = packageSearch.toLowerCase();
                  return (
                    pkg.name?.toLowerCase().includes(searchLower) ||
                    pkg.type?.toLowerCase().includes(searchLower)
                  );
                });
                
                const packageTotal = filteredPackages.length;
                const packageSkip = (packagePage - 1) * packageLimit;
                const paginatedPackages = filteredPackages.slice(packageSkip, packageSkip + packageLimit);
                const packagePagination = {
                  page: packagePage,
                  limit: packageLimit,
                  total: packageTotal,
                  pages: Math.ceil(packageTotal / packageLimit),
                };

                return (
                  <>
                    <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase"></th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Package</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Type</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Revenue</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Cost</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Profit</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedPackages.map((pkg) => (
                      <tr
                        key={pkg.packageId}
                        onClick={() => navigate(`/analytics/package/${pkg.packageId}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-3 py-2 text-sm">
                          <Avatar
                            name={pkg.name}
                            size="sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium">{pkg.name}</td>
                        <td className="px-3 py-2 text-sm">
                          <Badge variant={pkg.type === 'RECURRING' ? 'default' : 'secondary'} className="text-xs">
                            {pkg.type === 'RECURRING' ? 'Recurring' : 'One Time'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-sm">{formatCurrency(pkg.revenue)}</td>
                        <td className="px-3 py-2 text-sm">{formatCurrency(pkg.cost)}</td>
                        <td className={`px-3 py-2 text-sm font-medium ${pkg.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(pkg.profit)}
                        </td>
                        <td className={`px-3 py-2 text-sm font-medium ${pkg.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {pkg.margin.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {packagePagination.pages > 1 && (
                <div className="mt-3">
                  <Pagination
                    pagination={packagePagination}
                    onPageChange={setPackagePage}
                  />
                </div>
              )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Top Packages */}
          {analytics.topPackages && analytics.topPackages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold mb-3">Top Packages by Profitability</h2>
              <div className="space-y-2">
                {analytics.topPackages.map((pkg, idx) => (
                  <div key={pkg.packageId} className="flex items-center justify-between p-2.5 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium">{pkg.name}</p>
                      <p className="text-xs text-gray-500">
                        Profit: {formatCurrency(pkg.profit)} • Margin: {pkg.margin.toFixed(1)}%
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{idx + 1}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Employees */}
        {analytics.topEmployees && analytics.topEmployees.length > 0 && (
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-3">Top Employees</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Employee</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Hours</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Tasks</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.topEmployees.map((emp) => (
                    <tr key={emp.employeeId}>
                      <td className="px-3 py-2 text-sm font-medium">{emp.name}</td>
                      <td className="px-3 py-2 text-sm">{emp.hours} hrs</td>
                      <td className="px-3 py-2 text-sm">{emp.tasks}</td>
                      <td className="px-3 py-2 text-sm">{formatCurrency(emp.cost)}</td>
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

