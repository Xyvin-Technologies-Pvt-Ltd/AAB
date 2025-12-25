import { useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { Button } from "@/ui/button";

export const AdvancedFilters = ({
  clients = [],
  packages = [],
  employees = [],
  onFilterChange,
  initialFilters = {},
}) => {
  const [filters, setFilters] = useState({
    search: initialFilters.search || "",
    clientId: initialFilters.clientId || "",
    packageId: initialFilters.packageId || "",
    assignedTo: initialFilters.assignedTo || "",
    priority: initialFilters.priority || [],
    ...initialFilters,
  });

  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    // If client changes, clear package filter
    if (key === "clientId") {
      newFilters.packageId = "";
    }
    setFilters(newFilters);
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  const togglePriority = (priority) => {
    const newPriority = filters.priority.includes(priority)
      ? filters.priority.filter((p) => p !== priority)
      : [...filters.priority, priority];
    handleFilterChange("priority", newPriority);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      clientId: "",
      packageId: "",
      assignedTo: "",
      priority: [],
    };
    setFilters(clearedFilters);
    if (onFilterChange) {
      onFilterChange(clearedFilters);
    }
  };

  const hasActiveFilters =
    filters.search ||
    filters.clientId ||
    filters.packageId ||
    filters.assignedTo ||
    filters.priority.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <select
            value={filters.clientId}
            onChange={(e) => handleFilterChange("clientId", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>

        {/* Package Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Package
          </label>
          <select
            value={filters.packageId}
            onChange={(e) => handleFilterChange("packageId", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={!filters.clientId}
          >
            <option value="">All Packages</option>
            {packages
              .filter(
                (pkg) => !filters.clientId || pkg.clientId === filters.clientId
              )
              .map((pkg) => (
                <option key={pkg._id} value={pkg._id}>
                  {pkg.name}
                </option>
              ))}
          </select>
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Assignee
          </label>
          <select
            value={filters.assignedTo}
            onChange={(e) => handleFilterChange("assignedTo", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">All Assignees</option>
            {employees.map((employee) => (
              <option key={employee._id} value={employee._id}>
                {employee.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Shows tasks assigned to this employee (may have other assignees)
          </p>
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <div className="flex flex-wrap gap-2">
            {priorities.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => togglePriority(priority)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  filters.priority.includes(priority)
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {priority}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
