import { useState, useEffect } from 'react';
import { Button } from '@/ui/button';
import { X } from 'lucide-react';

export const TimeFilterDrawer = ({ open, onOpenChange, filters, onFilterChange, employees, clients, packages, isEmployee }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleClear = () => {
    const clearedFilters = {
      employeeId: '',
      clientId: '',
      packageId: '',
      startDate: '',
      endDate: '',
      isMiscellaneous: null,
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 w-full sm:max-w-sm bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Filter Time Entries</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!isEmployee && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Employee</label>
              <select
                value={localFilters.employeeId || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, employeeId: e.target.value })}
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
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Client</label>
            <select
              value={localFilters.clientId || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, clientId: e.target.value, packageId: '' })}
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

          {localFilters.clientId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Package</label>
              <select
                value={localFilters.packageId || ''}
                onChange={(e) => setLocalFilters({ ...localFilters, packageId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Packages</option>
                {packages
                  .filter((pkg) => pkg.clientId?._id === localFilters.clientId || pkg.clientId === localFilters.clientId)
                  .map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
            <input
              type="date"
              value={localFilters.startDate || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
            <input
              type="date"
              value={localFilters.endDate || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
            <select
              value={localFilters.isMiscellaneous === null ? '' : localFilters.isMiscellaneous ? 'misc' : 'task'}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  isMiscellaneous: e.target.value === '' ? null : e.target.value === 'misc',
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Types</option>
              <option value="task">Task Entries</option>
              <option value="misc">Miscellaneous</option>
            </select>
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

