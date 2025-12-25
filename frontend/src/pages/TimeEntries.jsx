import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { timeEntriesApi } from '@/api/timeEntries';
import { employeesApi } from '@/api/employees';
import { clientsApi } from '@/api/clients';
import { packagesApi } from '@/api/packages';
import { tasksApi } from '@/api/tasks';
import { TimeTracker } from '@/components/TimeTracker';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/ui/button';
import { Card } from '@/ui/card';
import { Calendar, Filter, Table2, Grid } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

export const TimeEntries = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'weekly'
  const [filters, setFilters] = useState({
    employeeId: '',
    clientId: '',
    startDate: '',
    endDate: '',
  });
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['time-entries', filters],
    queryFn: () =>
      timeEntriesApi.getAll({
        limit: 1000,
        ...filters,
        employeeId: filters.employeeId || undefined,
        clientId: filters.clientId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeesApi.getAll({ limit: 100 }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll({ limit: 100 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ['packages', selectedClientId],
    queryFn: () => packagesApi.getAll({ clientId: selectedClientId, limit: 100 }),
    enabled: !!selectedClientId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', selectedPackageId],
    queryFn: () => tasksApi.getAll({ packageId: selectedPackageId, limit: 100 }),
    enabled: !!selectedPackageId,
  });

  const createMutation = useMutation({
    mutationFn: timeEntriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      setShowForm(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => timeEntriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      setShowForm(false);
      setEditingEntry(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: timeEntriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
    },
  });

  const resetForm = () => {
    setEditingEntry(null);
    setSelectedClientId('');
    setSelectedPackageId('');
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setSelectedClientId(entry.clientId?._id || entry.clientId);
    setSelectedPackageId(entry.packageId?._id || entry.packageId);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this time entry?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const hours = parseFloat(formData.get('hours')) || 0;
    const minutes = parseFloat(formData.get('minutes')) || 0;
    const totalMinutes = hours * 60 + minutes;

    const data = {
      employeeId: formData.get('employeeId'),
      clientId: formData.get('clientId'),
      packageId: formData.get('packageId'),
      taskId: formData.get('taskId'),
      date: formData.get('date'),
      minutesSpent: totalMinutes,
      description: formData.get('description'),
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const entries = entriesData?.data?.timeEntries || [];
  const employees = employeesData?.data?.employees || [];
  const clients = clientsData?.data?.clients || [];
  const packages = packagesData?.data?.packages || [];
  const tasks = tasksData?.data?.tasks || [];

  const isEmployee = user?.role === 'EMPLOYEE';
  const defaultEmployeeId = isEmployee && user?.employeeId ? user.employeeId : '';

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const totalHours = entries.reduce((sum, entry) => sum + entry.minutesSpent / 60, 0);

  const getEntriesForDay = (day) => {
    return entries.filter((entry) => isSameDay(new Date(entry.date), day));
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + direction * 7);
    setCurrentWeek(newWeek);
    setFilters({
      ...filters,
      startDate: format(startOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      endDate: format(endOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Entries</h1>
            <p className="text-gray-600 mt-1">Track and manage time entries</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === 'weekly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('weekly')}
              >
                <Grid className="h-4 w-4 mr-1" />
                Weekly
              </Button>
            </div>
            <Button onClick={() => setShowForm(true)}>Add Time Entry</Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-5 w-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Filters</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {!isEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                  <select
                    value={filters.employeeId}
                    onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={filters.clientId}
                  onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total: <span className="font-semibold">{totalHours.toFixed(2)} hours</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ employeeId: '', clientId: '', startDate: '', endDate: '' })}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {showForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">
              {editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee</label>
                <select
                  name="employeeId"
                  required
                  disabled={isEmployee}
                  defaultValue={editingEntry?.employeeId?._id || editingEntry?.employeeId || defaultEmployeeId}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Client</label>
                <select
                  name="clientId"
                  required
                  value={selectedClientId || editingEntry?.clientId?._id || editingEntry?.clientId || ''}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value);
                    setSelectedPackageId('');
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Client</option>
                  {clients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Package</label>
                <select
                  name="packageId"
                  required
                  value={selectedPackageId || editingEntry?.packageId?._id || editingEntry?.packageId || ''}
                  onChange={(e) => {
                    setSelectedPackageId(e.target.value);
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Task</label>
                <select
                  name="taskId"
                  required
                  defaultValue={editingEntry?.taskId?._id || editingEntry?.taskId}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Task</option>
                  {tasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={editingEntry?.date ? editingEntry.date.split('T')[0] : ''}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Hours</label>
                  <input
                    type="number"
                    name="hours"
                    min="0"
                    defaultValue={editingEntry ? Math.floor(editingEntry.minutesSpent / 60) : ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Minutes</label>
                  <input
                    type="number"
                    name="minutes"
                    min="0"
                    max="59"
                    defaultValue={editingEntry ? editingEntry.minutesSpent % 60 : ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingEntry?.description}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Save</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : viewMode === 'weekly' ? (
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Week of {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}>
                    Previous Week
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>
                    This Week
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}>
                    Next Week
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayEntries = getEntriesForDay(day);
                  const dayTotal = dayEntries.reduce((sum, e) => sum + e.minutesSpent / 60, 0);
                  return (
                    <div key={day.toISOString()} className="border rounded-lg p-2">
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        {format(day, 'EEE')}
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {format(day, 'MMM dd')}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : '0h'}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <div
                            key={entry._id}
                            className="text-xs p-1 bg-indigo-50 rounded text-indigo-900 truncate"
                            title={`${entry.taskId?.name || 'Task'} - ${Math.floor(entry.minutesSpent / 60)}h ${entry.minutesSpent % 60}m`}
                          >
                            {entry.taskId?.name || 'Task'}
                          </div>
                        ))}
                        {dayEntries.length > 3 && (
                          <div className="text-xs text-gray-400">+{dayEntries.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.employeeId?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.clientId?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.packageId?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.taskId?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.floor(entry.minutesSpent / 60)}h {entry.minutesSpent % 60}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        className="mr-2"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(entry._id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

