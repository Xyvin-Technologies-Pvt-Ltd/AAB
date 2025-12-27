import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { employeesApi } from '@/api/employees';
import { timeEntriesApi } from '@/api/timeEntries';
import { tasksApi } from '@/api/tasks';
import { analyticsApi } from '@/api/analytics';
import { Button } from '@/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Avatar } from '@/components/Avatar';
import { ArrowLeft, Clock, CheckSquare, TrendingUp, User } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { format } from 'date-fns';

export const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const { data: employeeData, isLoading: employeeLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id),
  });

  const { data: timeEntriesData } = useQuery({
    queryKey: ['time-entries', 'employee', id, dateRange],
    queryFn: () =>
      timeEntriesApi.getAll({
        employeeId: id,
        limit: 1000,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      }),
  });

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 'employee', id],
    queryFn: () => tasksApi.getAll({ assignedTo: id, limit: 1000 }),
  });

  const { data: teamData } = useQuery({
    queryKey: ['analytics', 'employees'],
    queryFn: () => analyticsApi.getEmployeeUtilization(),
  });

  const employee = employeeData?.data;
  const timeEntries = timeEntriesData?.data?.timeEntries || [];
  const tasks = tasksData?.data?.tasks || [];
  const teamMembers = teamData?.data || [];

  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.minutesSpent / 60, 0);
  const openTasks = tasks.filter((t) => t.status !== 'DONE').length;
  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;
  const completionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  const utilizationRate =
    employee?.monthlyWorkingHours > 0
      ? (totalHours / employee.monthlyWorkingHours) * 100
      : 0;

  if (employeeLoading) {
    return (
      <AppLayout>
        <div className="text-center py-12">Loading...</div>
      </AppLayout>
    );
  }

  if (!employee) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Employee not found</p>
          <Button onClick={() => navigate('/employees')} className="mt-4">
            Back to Employees
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/employees')} size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back
            </Button>
            <Avatar
              src={employee.profilePicture?.url}
              name={employee.name}
              size="lg"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-900">{employee.name}</h1>
              <p className="text-xs text-gray-600 mt-0.5">
                {employee.designation || 'Employee'} • {employee.email || 'No email'}
              </p>
            </div>
          </div>
        </div>

        {/* Employee Info Card */}
        <Card>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Designation</p>
                <p className="text-lg font-medium">{employee.designation || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Cost</p>
                <p className="text-lg font-medium">${employee.monthlyCost?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Working Hours</p>
                <p className="text-lg font-medium">{employee.monthlyWorkingHours || '-'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Hours Logged"
            value={totalHours.toFixed(1)}
            icon={Clock}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          />
          <StatCard
            title="Utilization Rate"
            value={`${utilizationRate.toFixed(1)}%`}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-green-500 to-green-600 text-white"
          />
          <StatCard
            title="Tasks Completed"
            value={completedTasks}
            icon={CheckSquare}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600 text-white"
          />
          <StatCard
            title="Completion Rate"
            value={`${completionRate.toFixed(1)}%`}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600 text-white"
          />
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Time Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries History */}
        <Card>
          <CardHeader>
            <CardTitle>Time Entries History</CardTitle>
          </CardHeader>
          <CardContent>
            {timeEntries.length > 0 ? (
              <div className="space-y-3">
                {timeEntries.slice(0, 10).map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{entry.taskId?.name || 'Task'}</p>
                      <p className="text-sm text-gray-500">
                        {entry.clientId?.name || 'Client'} • {format(new Date(entry.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-indigo-600">
                        {Math.floor(entry.minutesSpent / 60)}h {entry.minutesSpent % 60}m
                      </p>
                    </div>
                  </div>
                ))}
                {timeEntries.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    Showing 10 of {timeEntries.length} entries
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No time entries found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Task Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold">{tasks.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Open</p>
                <p className="text-2xl font-bold text-orange-600">{openTasks}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
              </div>
            </div>
            {tasks.length > 0 && (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm font-medium">{task.name}</span>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'DONE'
                          ? 'bg-green-100 text-green-800'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {task.status?.replace('_', ' ')}
                    </span>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    Showing 5 of {tasks.length} tasks
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team View */}
        {teamMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Team Workload Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamMembers.slice(0, 5).map((member) => {
                  const isCurrentEmployee = member.employeeId?.toString() === id;
                  return (
                    <div
                      key={member.employeeId}
                      className={`p-3 rounded-lg ${
                        isCurrentEmployee ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {member.employeeName}
                          {isCurrentEmployee && (
                            <span className="ml-2 text-xs text-indigo-600">(You)</span>
                          )}
                        </span>
                        <span className="text-sm text-gray-600">
                          {member.hoursLogged.toFixed(1)}h / {member.monthlyWorkingHours || 0}h
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            member.utilizationRate >= 80
                              ? 'bg-green-600'
                              : member.utilizationRate >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(member.utilizationRate, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {member.utilizationRate.toFixed(1)}% utilization
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

