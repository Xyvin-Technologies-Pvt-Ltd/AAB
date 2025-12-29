import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { analyticsApi } from "@/api/analytics";
import { formatCurrency } from "@/utils/currencyFormat";
import { Badge } from "@/ui/badge";
import { LoaderWithText } from "@/components/Loader";
import { Avatar } from "@/components/Avatar";

export const Analytics = () => {
  const [activeTab, setActiveTab] = useState("packages");
  const navigate = useNavigate();

  // Analytics queries - no filters, show overall data since start
  const { data: packageData, isLoading: packagesLoading } = useQuery({
    queryKey: ["analytics", "packages", "overall"],
    queryFn: () => analyticsApi.getPackageProfitability({}),
  });

  const { data: clientData, isLoading: clientsLoading } = useQuery({
    queryKey: ["analytics", "clients", "overall"],
    queryFn: () => analyticsApi.getClientProfitability({}),
  });

  const { data: employeeData, isLoading: employeesLoading } = useQuery({
    queryKey: ["analytics", "employees", "overall"],
    queryFn: () => analyticsApi.getEmployeeUtilization({}),
  });

  const packagesList = packageData?.data || [];
  const clientsList = clientData?.data || [];
  const employeesList = employeeData?.data || [];

  return (
    <AppLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("packages")}
                className={`py-3 px-4 text-xs font-medium border-b-2 ${
                  activeTab === "packages"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Package Profitability
              </button>
              <button
                onClick={() => setActiveTab("clients")}
                className={`py-3 px-4 text-xs font-medium border-b-2 ${
                  activeTab === "clients"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Client Profitability
              </button>
              <button
                onClick={() => setActiveTab("employees")}
                className={`py-3 px-4 text-xs font-medium border-b-2 ${
                  activeTab === "employees"
                    ? "border-indigo-500 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Employee Utilization
              </button>
            </nav>
          </div>

          <div className="p-4">
            {activeTab === "packages" && (
              <div>
                {packagesLoading ? (
                  <div className="py-8">
                    <LoaderWithText text="Loading packages..." />
                  </div>
                ) : packagesList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            Package
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                            Type
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
                        {packagesList.map((pkg) => {
                          // Calculate overall totals since start
                          const overallRevenue =
                            pkg.totalCycleRevenue ||
                            pkg.cycleRevenue ||
                            pkg.revenue ||
                            0;
                          const overallCost =
                            pkg.totalCycleCost ||
                            pkg.cycleCost ||
                            pkg.cost ||
                            0;
                          const overallProfit = overallRevenue - overallCost;
                          const overallMargin =
                            overallRevenue > 0
                              ? (overallProfit / overallRevenue) * 100
                              : 0;

                          return (
                            <tr
                              key={pkg.packageId}
                              onClick={() =>
                                navigate(`/analytics/package/${pkg.packageId}`)
                              }
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Avatar
                                  name={pkg.packageName}
                                  size="sm"
                                />
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="text-xs font-medium text-gray-900">
                                  {pkg.packageName}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                                {pkg.clientName}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Badge
                                  variant={
                                    pkg.type === "RECURRING"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-[10px] px-1.5 py-0.5"
                                >
                                  {pkg.type === "RECURRING"
                                    ? "Recurring"
                                    : "One Time"}
                                </Badge>
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
                )}
              </div>
            )}

            {activeTab === "clients" && (
              <div>
                {clientsLoading ? (
                  <div className="py-8">
                    <LoaderWithText text="Loading clients..." />
                  </div>
                ) : clientsList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No data available
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                          </th>
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
                                navigate(`/analytics/client/${client.clientId}`)
                              }
                              className="hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                              <td className="px-3 py-2 whitespace-nowrap">
                                <Avatar
                                  name={client.clientName}
                                  size="sm"
                                />
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
                )}
              </div>
            )}

            {activeTab === "employees" && (
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
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                          </th>
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
                                <Avatar
                                  name={emp.employeeName}
                                  size="sm"
                                />
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
