import { AppLayout } from "@/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { employeesApi } from "@/api/employees";
import { timeEntriesApi } from "@/api/timeEntries";
import { tasksApi } from "@/api/tasks";
import { StatCard } from "@/components/StatCard";
import {
  Users,
  Package,
  UserCog,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: clientsData } = useQuery({
    queryKey: ["clients", "count"],
    queryFn: () => clientsApi.getAll({ limit: 1 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ["packages", "count"],
    queryFn: () => packagesApi.getAll({ limit: 1, status: "ACTIVE" }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees", "count"],
    queryFn: () => employeesApi.getAll({ limit: 1 }),
  });

  const { data: timeEntriesData } = useQuery({
    queryKey: ["time-entries", "recent"],
    queryFn: () => timeEntriesApi.getAll({ limit: 5 }),
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "dashboard"],
    queryFn: () => tasksApi.getAll({ limit: 1000 }),
  });

  const totalClients = clientsData?.data?.pagination?.total || 0;
  const totalPackages = packagesData?.data?.pagination?.total || 0;
  const totalEmployees = employeesData?.data?.pagination?.total || 0;
  const recentEntries = timeEntriesData?.data?.timeEntries || [];
  const allTasks = tasksData?.data?.tasks || [];

  // Filter overdue tasks
  const now = new Date();
  const overdueTasks = allTasks.filter(
    (task) =>
      task.dueDate && new Date(task.dueDate) < now && task.status !== "DONE"
  );

  // Filter upcoming deadlines (next 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const upcomingTasks = allTasks
    .filter(
      (task) =>
        task.dueDate &&
        new Date(task.dueDate) >= now &&
        new Date(task.dueDate) <= sevenDaysFromNow &&
        task.status !== "DONE"
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  // Task status summary
  const taskStatusSummary = {
    TODO: allTasks.filter((t) => t.status === "TODO").length,
    IN_PROGRESS: allTasks.filter((t) => t.status === "IN_PROGRESS").length,
    DONE: allTasks.filter((t) => t.status === "DONE").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.email?.split("@")[0] || "User"}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your accounting platform today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Clients"
            value={totalClients}
            icon={Users}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          />
          <StatCard
            title="Active Packages"
            value={totalPackages}
            icon={Package}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600 text-white"
          />
          <StatCard
            title="Employees"
            value={totalEmployees}
            icon={UserCog}
            gradient="bg-gradient-to-br from-green-500 to-green-600 text-white"
          />
          <StatCard
            title="Recent Entries"
            value={recentEntries.length}
            icon={Clock}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600 text-white"
          />
        </div>

        {/* Task Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-gray-600 to-gray-700 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">
                To Do
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {taskStatusSummary.TODO}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {taskStatusSummary.IN_PROGRESS}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">
                Done
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {taskStatusSummary.DONE}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deadlines and Overdue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Overdue Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                  Overdue Tasks
                </div>
                {overdueTasks.length > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {overdueTasks.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueTasks.length > 0 ? (
                <div className="space-y-3">
                  {overdueTasks.slice(0, 5).map((task) => (
                    <div
                      key={task._id}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/tasks`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {task.name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {task.clientId?.name} • Due{" "}
                            {format(new Date(task.dueDate), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <span className="text-xs text-red-600 font-semibold">
                          OVERDUE
                        </span>
                      </div>
                    </div>
                  ))}
                  {overdueTasks.length > 5 && (
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => navigate("/tasks")}
                    >
                      View All {overdueTasks.length} Overdue Tasks
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No overdue tasks</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
                  Upcoming Deadlines
                </div>
                {upcomingTasks.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-1 rounded-full">
                    {upcomingTasks.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingTasks.length > 0 ? (
                <div className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task._id}
                      className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                      onClick={() => navigate(`/tasks`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {task.name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {task.clientId?.name} • Due{" "}
                            {format(new Date(task.dueDate), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <span className="text-xs text-indigo-600 font-semibold">
                          {Math.ceil(
                            (new Date(task.dueDate) - now) /
                              (1000 * 60 * 60 * 24)
                          )}
                          d
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => navigate("/tasks")}
                  >
                    View All Tasks
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No upcoming deadlines</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-indigo-600" />
                Recent Time Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEntries.length > 0 ? (
                <div className="space-y-4">
                  {recentEntries.map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {entry.employeeId?.name || "Unknown Employee"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {entry.taskId?.name || "Task"} -{" "}
                          {entry.clientId?.name || "Client"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(entry.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-indigo-600">
                          {Math.floor(entry.minutesSpent / 60)}h{" "}
                          {entry.minutesSpent % 60}m
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent time entries</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <a
                  href="/clients"
                  className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer"
                >
                  <Users className="h-6 w-6 text-blue-600 mb-2" />
                  <p className="font-semibold text-gray-900">Manage Clients</p>
                  <p className="text-sm text-gray-600">View and edit clients</p>
                </a>
                <a
                  href="/time-entries"
                  className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:from-green-100 hover:to-green-200 transition-all cursor-pointer"
                >
                  <Clock className="h-6 w-6 text-green-600 mb-2" />
                  <p className="font-semibold text-gray-900">Log Time</p>
                  <p className="text-sm text-gray-600">Add new time entry</p>
                </a>
                <a
                  href="/packages"
                  className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:from-purple-100 hover:to-purple-200 transition-all cursor-pointer"
                >
                  <Package className="h-6 w-6 text-purple-600 mb-2" />
                  <p className="font-semibold text-gray-900">Packages</p>
                  <p className="text-sm text-gray-600">Manage packages</p>
                </a>
                <a
                  href="/analytics"
                  className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg hover:from-orange-100 hover:to-orange-200 transition-all cursor-pointer"
                >
                  <DollarSign className="h-6 w-6 text-orange-600 mb-2" />
                  <p className="font-semibold text-gray-900">Analytics</p>
                  <p className="text-sm text-gray-600">View reports</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
