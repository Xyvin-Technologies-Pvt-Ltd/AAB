import { useState, useEffect } from 'react';
import { Button } from '@/ui/button';
import { X, Search, Building2, Package, User, AlertCircle } from 'lucide-react';
import { SelectSearch } from '@/ui/select-search';

export const TaskFilterDrawer = ({ open, onOpenChange, filters, onFilterChange, clients, packages, employees }) => {
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
      search: '',
      clientId: '',
      packageId: '',
      assignedTo: '',
      priority: [],
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    // If client changes, clear package filter
    if (key === 'clientId') {
      newFilters.packageId = '';
    }
    setLocalFilters(newFilters);
  };

  const togglePriority = (priority) => {
    const currentPriority = localFilters.priority || [];
    const newPriority = currentPriority.includes(priority)
      ? currentPriority.filter((p) => p !== priority)
      : [...currentPriority, priority];
    handleFilterChange('priority', newPriority);
  };

  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const priorityColors = {
    URGENT: 'bg-red-100 text-red-800 border-red-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    LOW: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const hasActiveFilters =
    localFilters.search ||
    localFilters.clientId ||
    localFilters.packageId ||
    localFilters.assignedTo ||
    (localFilters.priority && localFilters.priority.length > 0);

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Filter Tasks</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Search</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={localFilters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Building2 className="h-4 w-4 inline mr-1" />
              Client
            </label>
            <SelectSearch
              options={clients}
              value={localFilters.clientId || ''}
              onChange={(value) => handleFilterChange('clientId', value)}
              placeholder="All Clients"
              searchPlaceholder="Search clients..."
              emptyMessage="No clients found"
            />
          </div>

          {/* Package Filter */}
          {localFilters.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Package className="h-4 w-4 inline mr-1" />
                Package
              </label>
              <SelectSearch
                options={packages.filter(
                  (pkg) => pkg.clientId?._id === localFilters.clientId || pkg.clientId === localFilters.clientId
                )}
                value={localFilters.packageId || ''}
                onChange={(value) => handleFilterChange('packageId', value)}
                placeholder="All Packages"
                searchPlaceholder="Search packages..."
                emptyMessage="No packages found"
              />
            </div>
          )}

          {/* Assignee Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <User className="h-4 w-4 inline mr-1" />
              Assignee
            </label>
            <SelectSearch
              options={employees}
              value={localFilters.assignedTo || ''}
              onChange={(value) => handleFilterChange('assignedTo', value)}
              placeholder="All Assignees"
              searchPlaceholder="Search employees..."
              emptyMessage="No employees found"
            />
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Priority
            </label>
            <div className="flex flex-wrap gap-1.5">
              {priorities.map((priority) => {
                const isSelected = (localFilters.priority || []).includes(priority);
                return (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => togglePriority(priority)}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border transition-all ${
                      isSelected
                        ? `${priorityColors[priority]} border-current shadow-sm`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {priority}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={handleClear} className="flex-1" disabled={!hasActiveFilters}>
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

