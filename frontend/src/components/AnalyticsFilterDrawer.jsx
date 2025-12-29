import { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/ui/badge";

export const AnalyticsFilterDrawer = ({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  employees,
  clients,
  packages,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFilterChange(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const clearedFilters = {
      clientId: "",
      employeeId: "",
      packageId: "",
      packageType: "",
      billingFrequency: "",
      startDate: "",
      endDate: "",
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    // If client changes, clear package filter
    if (key === "clientId") {
      newFilters.packageId = "";
    }
    // If package type changes to ONE_TIME, clear billing frequency
    if (key === "packageType" && value === "ONE_TIME") {
      newFilters.billingFrequency = "";
    }
    setLocalFilters(newFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.clientId) count++;
    if (localFilters.employeeId) count++;
    if (localFilters.packageId) count++;
    if (localFilters.packageType) count++;
    if (localFilters.billingFrequency) count++;
    if (localFilters.startDate) count++;
    if (localFilters.endDate) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();
  const filteredPackages = localFilters.clientId
    ? packages.filter(
        (pkg) =>
          pkg.clientId?._id === localFilters.clientId ||
          pkg.clientId === localFilters.clientId
      )
    : packages;

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Filter Analytics
            </h2>
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-indigo-100 text-indigo-800"
              >
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Client
            </label>
            <select
              value={localFilters.clientId || ""}
              onChange={(e) => handleFilterChange("clientId", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Employee
            </label>
            <select
              value={localFilters.employeeId || ""}
              onChange={(e) => handleFilterChange("employeeId", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          {localFilters.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Package
              </label>
              <select
                value={localFilters.packageId || ""}
                onChange={(e) =>
                  handleFilterChange("packageId", e.target.value)
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Packages</option>
                {filteredPackages.map((pkg) => (
                  <option key={pkg._id} value={pkg._id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Package Type
            </label>
            <select
              value={localFilters.packageType || ""}
              onChange={(e) =>
                handleFilterChange("packageType", e.target.value)
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              <option value="RECURRING">Recurring</option>
              <option value="ONE_TIME">One Time</option>
            </select>
          </div>

          {localFilters.packageType === "RECURRING" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Billing Frequency
              </label>
              <select
                value={localFilters.billingFrequency || ""}
                onChange={(e) =>
                  handleFilterChange("billingFrequency", e.target.value)
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Frequencies</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={localFilters.startDate || ""}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={localFilters.endDate || ""}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Clear
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};
