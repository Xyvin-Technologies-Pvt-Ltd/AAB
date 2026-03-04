import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { analyticsApi } from "@/api/analytics";
import { formatCurrency } from "@/utils/currencyFormat";
import { Button } from "@/ui/button";
import { LoaderWithText } from "@/components/Loader";
import { Avatar } from "@/components/Avatar";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { StatCard } from "@/components/StatCard";
import { useAuthStore } from "@/store/authStore";
import { TrendingUp, DollarSign, TrendingDown, Percent } from "lucide-react";

export const Analytics = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("clients");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;
  const [viewMode, setViewMode] = useState("all");

  const isEmployee = user?.role === "EMPLOYEE";
  // Employees only see Employee Utilization; treat their view as that tab
  const effectiveTab = isEmployee ? "employees" : activeTab;

  const apiParams = useMemo(() => {
    const base = { page, limit, search };
    if (user?.role === "ADMIN") {
      base.viewMode = viewMode;
    }
    return base;
  }, [page, limit, search, user?.role, viewMode]);

  const allApiParams = useMemo(() => {
    const base = { page: 1, limit: 500, search };
    if (user?.role === "ADMIN") {
      base.viewMode = viewMode;
    }
    return base;
  }, [search, user?.role, viewMode]);

  const { data: clientData, isLoading: clientsLoading } = useQuery({
    queryKey: ["analytics", "clients", page, search, viewMode],
    queryFn: () =>
      analyticsApi.getClientProfitability({ ...apiParams, page, limit }),
    enabled: !isEmployee,
  });

  const { data: employeeData, isLoading: employeesLoading } = useQuery({
    queryKey: ["analytics", "employees", page, search, viewMode],
    queryFn: () =>
      analyticsApi.getEmployeeUtilization({ ...apiParams, page, limit }),
  });

  // Fetch all client data for KPI calculations (without pagination)
  const { data: allClientsData, isLoading: allClientsLoading } = useQuery({
    queryKey: ["analytics", "clients", "all", search, viewMode],
    queryFn: () => analyticsApi.getClientProfitability(allApiParams),
    enabled: !isEmployee && effectiveTab === "clients",
  });

  const clientsList =
    clientData?.data?.results ??
    (Array.isArray(clientData?.data) ? clientData.data : []);
  const clientsPagination = clientData?.data?.pagination;
  const employeesList =
    employeeData?.data?.results ??
    (Array.isArray(employeeData?.data) ? employeeData.data : []);
  const employeesPagination = employeeData?.data?.pagination;

  // Calculate KPI metrics for clients tab
  const kpiMetrics = useMemo(() => {
    if (effectiveTab === "clients") {
      const allClientsList =
        allClientsData?.data?.results ??
        (Array.isArray(allClientsData?.data) ? allClientsData.data : []);

      const totalRevenue = allClientsList.reduce((sum, client) => {
        return sum + (client.totalCycleRevenue || client.totalRevenue || 0);
      }, 0);
      const totalCost = allClientsList.reduce((sum, client) => {
        return sum + (client.totalCycleCost || client.totalCost || 0);
      }, 0);
      const totalProfit = totalRevenue - totalCost;
      const overallMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return { totalRevenue, totalCost, totalProfit, overallMargin, isLoading: allClientsLoading };
    }
    return { totalRevenue: 0, totalCost: 0, totalProfit: 0, overallMargin: 0, isLoading: false };
  }, [effectiveTab, allClientsData, allClientsLoading]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1); // Reset to first page when search changes
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Analytics</h1>
          {user?.role === "ADMIN" && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "my" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("my")}
              >
                My Analytics
              </Button>
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("all")}
              >
                See All
              </Button>
            </div>
          )}
        </div>

        {/* KPI Cards - shown on clients tab */}
        {effectiveTab === "clients" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Overall Profitability"
              value={formatCurrency(kpiMetrics.totalProfit)}
              icon={kpiMetrics.totalProfit >= 0 ? TrendingUp : TrendingDown}
              gradient={
                kpiMetrics.totalProfit >= 0
                  ? "bg-gradient-to-br from-green-500 to-green-600"
                  : "bg-gradient-to-br from-red-500 to-red-600"
              }
              isLoading={kpiMetrics.isLoading}
            />
            <StatCard
              title="Client Profitability"
              value={formatCurrency(kpiMetrics.totalProfit)}
              icon={DollarSign}
              gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
              isLoading={kpiMetrics.isLoading}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(kpiMetrics.totalRevenue)}
              icon={DollarSign}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
              isLoading={kpiMetrics.isLoading}
            />
            <StatCard
              title="Profit Margin"
              value={`${kpiMetrics.overallMargin.toFixed(1)}%`}
              icon={Percent}
              gradient="bg-gradient-to-br from-purple-500 to-purple-600"
              isLoading={kpiMetrics.isLoading}
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {!isEmployee && (
                <button
                  onClick={() => {
                    setActiveTab("clients");
                    setPage(1);
                    setSearch("");
                  }}
                  className={`py-3 px-4 text-xs font-medium border-b-2 ${
                    activeTab === "clients"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Client Profitability
                </button>
              )}
              <button
                onClick={() => {
                  setActiveTab("employees");
                  setPage(1);
                  setSearch("");
                }}
                className={`py-3 px-4 text-xs font-medium border-b-2 ${
                  effectiveTab === "employees"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Employee Utilization
              </button>
            </nav>
          </div>

          <div className="p-4">
            {/* Search Input */}
            <div className="mb-4">
              <SearchInput
                value={search}
                onChange={handleSearchChange}
                placeholder={
                  effectiveTab === "clients"
                    ? "Search clients..."
                    : "Search employees..."
                }
              />
            </div>

            {effectiveTab === "clients" && (
              <div>
                {clientsLoading ? (
                  <div className="py-8">
                    <LoaderWithText text="Loading clients..." />
                  </div>
                ) : clientsList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No data available
                    {clientData?.error && (
                      <div className="mt-2 text-xs text-red-500">
                        Error: {clientData.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider"></th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Client
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Packages
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Revenue (Overall)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Cost (Overall)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Profit (Overall)
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Margin %
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {clientsList.map((client) => {
                            // Calculate overall totals
                            const overallRevenue =
                              client.totalCycleRevenue ||
                              client.totalRevenue ||
                              0;
                            const overallCost =
                              client.totalCycleCost || client.totalCost || 0;
                            const overallProfit = overallRevenue - overallCost;
                            const overallMargin =
                              overallRevenue > 0
                                ? (overallProfit / overallRevenue) * 100
                                : 0;

                            return (
                              <tr
                                key={client.clientId}
                                onClick={() =>
                                  navigate(
                                    `/analytics/client/${client.clientId}`
                                  )
                                }
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <Avatar name={client.clientName} size="sm" />
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                  {client.clientName}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                  {client.packagesCount || 0}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(overallRevenue)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(overallCost)}
                                </td>
                                <td
                                  className={`px-3 py-2 whitespace-nowrap text-xs font-medium ${
                                    overallProfit >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {formatCurrency(overallProfit)}
                                </td>
                                <td
                                  className={`px-3 py-2 whitespace-nowrap text-xs font-medium ${
                                    overallMargin >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {overallMargin.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {clientsPagination && (
                      <Pagination
                        pagination={clientsPagination}
                        onPageChange={setPage}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {effectiveTab === "employees" && (
              <div>
                {employeesLoading ? (
                  <div className="py-8">
                    <LoaderWithText text="Loading employees..." />
                  </div>
                ) : employeesList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No data available
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider"></th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Employee
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Monthly Salary
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Hourly Rate
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Hours Logged
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Utilization %
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                              Cost Contribution
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {employeesList.map((emp) => {
                            return (
                              <tr
                                key={emp.employeeId}
                                onClick={() =>
                                  navigate(
                                    `/analytics/employee/${emp.employeeId}`
                                  )
                                }
                                className="hover:bg-gray-50 cursor-pointer transition-colors"
                              >
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <Avatar name={emp.employeeName} size="sm" />
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                                  {emp.employeeName}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(emp.monthlyCost)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                  {formatCurrency(emp.hourlyCost)}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                  {(emp.hoursLogged || 0).toFixed(1)} hrs
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full ${
                                          emp.utilizationRate >= 80
                                            ? "bg-green-600"
                                            : emp.utilizationRate >= 50
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                        }`}
                                        style={{
                                          width: `${Math.min(
                                            emp.utilizationRate || 0,
                                            100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-[10px]">
                                      {(emp.utilizationRate || 0).toFixed(1)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(emp.costContribution || 0)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {employeesPagination && (
                      <Pagination
                        pagination={employeesPagination}
                        onPageChange={setPage}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
