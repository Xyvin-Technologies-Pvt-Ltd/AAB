import { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/ui/drawer";
import { Search, Calendar, Package, Building2 } from "lucide-react";
import { MultiSelect } from "@/ui/multi-select";

export const ClientFilterDrawer = ({
  open,
  onOpenChange,
  filters,
  onFilterChange,
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
      search: "",
      vatMonths: [],
      packageId: "",
      status: "",
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const handleFilterChange = (key, value) => {
    setLocalFilters({ ...localFilters, [key]: value });
  };

  const months = [
    { _id: "0", name: "January" },
    { _id: "1", name: "February" },
    { _id: "2", name: "March" },
    { _id: "3", name: "April" },
    { _id: "4", name: "May" },
    { _id: "5", name: "June" },
    { _id: "6", name: "July" },
    { _id: "7", name: "August" },
    { _id: "8", name: "September" },
    { _id: "9", name: "October" },
    { _id: "10", name: "November" },
    { _id: "11", name: "December" },
  ];

  const statuses = [
    { _id: "ACTIVE", name: "Active" },
    { _id: "INACTIVE", name: "Inactive" },
  ];

  // Get unique package names for filter
  const uniquePackages = packages
    ? Array.from(
        new Map(
          packages.map((pkg) => [
            pkg._id,
            {
              _id: pkg._id,
              name: pkg.name,
            },
          ])
        ).values()
      )
    : [];

  const hasActiveFilters =
    localFilters.search ||
    (localFilters.vatMonths && localFilters.vatMonths.length > 0) ||
    localFilters.packageId ||
    localFilters.status;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="flex flex-col h-full">
        <DrawerHeader className="px-4 py-3 border-b border-gray-200">
          <DrawerTitle className="text-lg font-semibold text-gray-900">
            Filter Clients
          </DrawerTitle>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={localFilters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* VAT Months Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Calendar className="h-4 w-4 inline mr-1" />
              VAT Return Months
            </label>
            <MultiSelect
              options={months}
              selected={localFilters.vatMonths || []}
              onChange={(selected) => handleFilterChange("vatMonths", selected)}
              placeholder="Select months..."
              searchPlaceholder="Search months..."
              emptyMessage="No months found"
            />
          </div>

          {/* Package Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Package className="h-4 w-4 inline mr-1" />
              Package Name
            </label>
            <select
              value={localFilters.packageId || ""}
              onChange={(e) => handleFilterChange("packageId", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Packages</option>
              {uniquePackages.map((pkg) => (
                <option key={pkg._id} value={pkg._id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Building2 className="h-4 w-4 inline mr-1" />
              Status
            </label>
            <select
              value={localFilters.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status._id} value={status._id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <DrawerFooter className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex-1"
            disabled={!hasActiveFilters}
          >
            Clear
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

