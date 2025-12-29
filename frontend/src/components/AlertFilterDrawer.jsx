import { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/ui/badge";

export const AlertFilterDrawer = ({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  filterTypes,
  getTypeCount,
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleClear = () => {
    const clearedFilters = {
      type: "",
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = localFilters.type !== "";

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Filter Alerts</h2>
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
              Filter by Type
            </label>
            <div className="space-y-1.5">
              {filterTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() =>
                    setLocalFilters({ ...localFilters, type: type.value })
                  }
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                    localFilters.type === type.value
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                      : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <span className="font-medium">{type.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {type.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Info about month selection */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-900 mb-1">
                  Month Selection
                </p>
                <p className="text-[10px] text-blue-700">
                  Use the tabs above to switch between "This Month" and "Next
                  Month" views.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
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
        </div>
      </div>
    </div>
  );
};
