import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { analyticsApi } from "@/api/analytics";
import { employeesApi } from "@/api/employees";
import { formatCurrency } from "@/utils/currencyFormat";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { CostRevenueChart } from "@/components/charts/CostRevenueChart";
import { ArrowLeft, Filter, X } from "lucide-react";
import { LoaderWithText } from "@/components/Loader";
import { Avatar } from "@/components/Avatar";

export const PackageAnalytics = () => {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    employeeId: "",
    taskId: "",
    startDate: "",
    endDate: "",
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["analytics", "package", packageId, filters],
    queryFn: () => analyticsApi.getPackageAnalytics(packageId, filters),
    enabled: !!packageId,
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.getAll({ limit: 10000 }),
  });

  const employees = employeesData?.data?.employees || [];
  const analytics = analyticsData?.data || {};

  const handleClearFilters = () => {
    setFilters({
      employeeId: "",
      taskId: "",
      startDate: "",
      endDate: "",
    });
  };

  const activeFilterCount = Object.values(filters).filter((v) => v).length;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="py-8">
            <LoaderWithText text="Loading package analytics..." />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!analytics.package) {
    return (
      <AppLayout>
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center py-8 text-gray-500">
            Package not found
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/analytics")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{analytics.package.name}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {analytics.package.clientName}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employee
                </label>
                <select
                  value={filters.employeeId}
                  onChange={(e) =>
                    setFilters({ ...filters, employeeId: e.target.value })
                  }
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
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
            <p className="text-base font-semibold">
              {formatCurrency(analytics.summary?.revenue || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Total Cost</p>
            <p className="text-base font-semibold">
              {formatCurrency(analytics.summary?.cost || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Total Profit</p>
            <p
              className={`text-base font-semibold ${
                (analytics.summary?.profit || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(analytics.summary?.profit || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Profit Margin</p>
            <p
              className={`text-base font-semibold ${
                (analytics.summary?.margin || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {(analytics.summary?.margin || 0).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Total Hours</p>
            <p className="text-base font-semibold">
              {(analytics.summary?.totalHours || 0).toFixed(1)} hrs
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <p className="text-xs text-gray-500 mb-1">Tasks</p>
            <p className="text-base font-semibold">
              {analytics.summary?.taskCount || 0}
            </p>
          </div>
        </div>

        {/* Charts Side by Side */}
        {analytics.monthlyTrends && analytics.monthlyTrends.length > 0 && (
          <div
            className={`grid grid-cols-1 ${
              analytics.package.type === "RECURRING"
                ? "lg:grid-cols-2"
                : "lg:grid-cols-1"
            } gap-6 mb-6`}
          >
            {/* Monthly Trends - Only for recurring packages */}
            {analytics.package.type === "RECURRING" && (
              <div className="bg-white rounded-lg shadow p-5">
                <h2 className="text-lg font-semibold mb-4">Monthly Trends</h2>
                <MonthlyTrendChart data={analytics.monthlyTrends} />
              </div>
            )}
            {/* Cost vs Revenue Analytics */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold mb-4">Cost vs Revenue</h2>
              <CostRevenueChart data={analytics.monthlyTrends} />
            </div>
          </div>
        )}

        {/* Top Employees and Breakdowns Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Employees by Task Count */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-3">
              Top 3 Employees by Tasks
            </h2>
            {analytics.topEmployeesByTasks &&
            analytics.topEmployeesByTasks.length > 0 ? (
              <div className="space-y-2">
                {analytics.topEmployeesByTasks.map((emp, idx) => (
                  <div
                    key={emp.employeeId}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-gray-500">
                        {emp.taskCount} tasks ({emp.percentage}%)
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data available</p>
            )}
          </div>

          {/* Top Employees by Time */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold mb-3">
              Top 3 Employees by Time
            </h2>
            {analytics.topEmployeesByTime &&
            analytics.topEmployeesByTime.length > 0 ? (
              <div className="space-y-2">
                {analytics.topEmployeesByTime.map((emp, idx) => (
                  <div
                    key={emp.employeeId}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded"
                  >
                    <div>
                      <p className="text-sm font-medium">{emp.name}</p>
                      <p className="text-xs text-gray-500">
                        {emp.hours} hrs ({emp.percentage}%) •{" "}
                        {formatCurrency(emp.cost)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {idx + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No data available</p>
            )}
          </div>
        </div>

        {/* Employee and Task Breakdowns Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Employee Breakdown */}
          {analytics.employeeBreakdown &&
            analytics.employeeBreakdown.length > 0 && (
              <div className="bg-white rounded-lg shadow p-5">
                <h2 className="text-lg font-semibold mb-3">
                  Employee Breakdown
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase"></th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                          Employee
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                          Hours
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                          Cost
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                          Tasks
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analytics.employeeBreakdown.map((emp) => (
                        <tr key={emp.employeeId}>
                          <td className="px-3 py-2 text-sm">
                            <Avatar name={emp.name} size="sm" />
                          </td>
                          <td className="px-3 py-2 text-sm">{emp.name}</td>
                          <td className="px-3 py-2 text-sm">{emp.hours} hrs</td>
                          <td className="px-3 py-2 text-sm">
                            {formatCurrency(emp.cost)}
                          </td>
                          <td className="px-3 py-2 text-sm">{emp.taskCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Task Breakdown */}
          {analytics.taskBreakdown && analytics.taskBreakdown.length > 0 && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold mb-3">Task Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase"></th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                        Task
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                        Hours
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase">
                        Cost
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.taskBreakdown.map((task) => (
                      <tr key={task.taskId}>
                        <td className="px-3 py-2 text-sm">
                          <Avatar name={task.name} size="sm" />
                        </td>
                        <td className="px-3 py-2 text-sm">{task.name}</td>
                        <td className="px-3 py-2 text-sm">{task.hours} hrs</td>
                        <td className="px-3 py-2 text-sm">
                          {formatCurrency(task.cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
