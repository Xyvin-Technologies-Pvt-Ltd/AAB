import { useState } from "react";
import { Search, X, Filter, Building2, Package, User, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/ui/button";
import { SelectSearch } from "@/ui/select-search";

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

  const priorityColors = {
    URGENT: "bg-red-100 text-red-800 border-red-200",
    HIGH: "bg-orange-100 text-orange-800 border-orange-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
    LOW: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded-lg">
            <Filter className="h-4 w-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="ml-2 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] font-semibold rounded-full">
              {Object.keys(filters).filter((key) => {
                if (key === "priority") return filters[key]?.length > 0;
                return filters[key];
              }).length}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="h-7 px-2 text-xs hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Filters Grid */}
      <div className="space-y-2.5">
        {/* Client Filter */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
            <Building2 className="h-3 w-3 inline mr-1" />
            Client
          </label>
          <SelectSearch
            options={clients}
            value={filters.clientId}
            onChange={(value) => handleFilterChange("clientId", value)}
            placeholder="All Clients"
            searchPlaceholder="Search clients..."
            emptyMessage="No clients found"
            className="text-xs"
          />
        </div>

        {/* Package Filter */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
            <Package className="h-3 w-3 inline mr-1" />
            Package
          </label>
          <SelectSearch
            options={packages.filter(
              (pkg) => !filters.clientId || pkg.clientId === filters.clientId
            )}
            value={filters.packageId}
            onChange={(value) => handleFilterChange("packageId", value)}
            placeholder="All Packages"
            searchPlaceholder="Search packages..."
            emptyMessage="No packages found"
            disabled={!filters.clientId}
            className="text-xs"
          />
        </div>

        {/* Assignee Filter */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
            <User className="h-3 w-3 inline mr-1" />
            Assignee
          </label>
          <SelectSearch
            options={employees}
            value={filters.assignedTo}
            onChange={(value) => handleFilterChange("assignedTo", value)}
            placeholder="All Assignees"
            searchPlaceholder="Search employees..."
            emptyMessage="No employees found"
            className="text-xs"
          />
        </div>

        {/* Priority Filter */}
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            <AlertCircle className="h-3 w-3 inline mr-1" />
            Priority
          </label>
          <div className="flex flex-wrap gap-1.5">
            {priorities.map((priority) => {
              const isSelected = filters.priority.includes(priority);
              return (
                <button
                  key={priority}
                  type="button"
                  onClick={() => togglePriority(priority)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-md border transition-all ${
                    isSelected
                      ? `${priorityColors[priority]} border-current shadow-sm scale-105`
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                  }`}
                >
                  {priority}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
