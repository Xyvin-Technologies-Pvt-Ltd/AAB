import { AppLayout } from "@/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { employeesApi } from "@/api/employees";
import { tasksApi } from "@/api/tasks";
import { StatCard } from "@/components/StatCard";
import { DashboardGraphs } from "@/components/DashboardGraphs";
import { Users, Package, UserCog, Calendar, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Get first name from employee name and capitalize first letter
  const getFirstName = () => {
    const fullName = user?.employeeId?.name || user?.name;
    if (fullName) {
      const firstName = fullName.split(" ")[0];
      return (
        firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      );
    }
    const emailName = user?.email?.split("@")[0];
    if (emailName) {
      return (
        emailName.charAt(0).toUpperCase() + emailName.slice(1).toLowerCase()
      );
    }
    return "User";
  };

  const firstName = getFirstName();

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ["clients", "count"],
    queryFn: () => clientsApi.getAll({ limit: 1 }),
  });

  const { data: packagesData, isLoading: packagesLoading } = useQuery({
    queryKey: ["packages", "count"],
    queryFn: () => packagesApi.getAll({ limit: 1, status: "ACTIVE" }),
  });

  const { data: employeesData, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees", "count"],
    queryFn: () => employeesApi.getAll({ limit: 1 }),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", "dashboard"],
    queryFn: () => tasksApi.getAll({ limit: 1000 }),
  });

  // Get current and next month for alerts count
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonth = nextMonthDate.getMonth() + 1;
  const nextYear = nextMonthDate.getFullYear();

  // Fetch alerts for both current and next month to get total count
  const { data: currentMonthAlerts, isLoading: currentAlertsLoading } =
    useQuery({
      queryKey: ["allAlerts", currentMonth, currentYear, "all"],
      queryFn: () =>
        clientsApi.getAllAlerts({
          type: undefined,
          severity: undefined,
          month: currentMonth,
          year: currentYear,
        }),
    });

  const { data: nextMonthAlerts, isLoading: nextAlertsLoading } = useQuery({
    queryKey: ["allAlerts", nextMonth, nextYear, "all"],
    queryFn: () =>
      clientsApi.getAllAlerts({
        type: undefined,
        severity: undefined,
        month: nextMonth,
        year: nextYear,
      }),
  });

  const totalClients = clientsData?.data?.pagination?.total || 0;
  const totalPackages = packagesData?.data?.pagination?.total || 0;
  const totalEmployees = employeesData?.data?.pagination?.total || 0;
  const allTasks = tasksData?.data?.tasks || [];

  // Calculate total alerts count
  const currentAlerts = currentMonthAlerts?.data?.alerts || [];
  const currentDeadlines = currentMonthAlerts?.data?.deadlines || [];
  const nextAlerts = nextMonthAlerts?.data?.alerts || [];
  const nextDeadlines = nextMonthAlerts?.data?.deadlines || [];
  const totalAlerts =
    currentAlerts.length +
    currentDeadlines.length +
    nextAlerts.length +
    nextDeadlines.length;

  // Filter overdue tasks
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
            Welcome back, {firstName}!
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
            to="/clients"
            isLoading={clientsLoading}
          />
          <StatCard
            title="Active Packages"
            value={totalPackages}
            icon={Package}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600 text-white"
            to="/packages"
            isLoading={packagesLoading}
          />
          <StatCard
            title="Employees"
            value={totalEmployees}
            icon={UserCog}
            gradient="bg-gradient-to-br from-green-500 to-green-600 text-white"
            to="/employees"
            isLoading={employeesLoading}
          />
          <StatCard
            title="Alerts"
            value={totalAlerts}
            icon={AlertCircle}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600 text-white"
            to="/alerts"
            isLoading={currentAlertsLoading || nextAlertsLoading}
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
              {tasksLoading ? (
                <div className="h-9 w-16 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold text-white">
                  {taskStatusSummary.TODO}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="h-9 w-16 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold text-white">
                  {taskStatusSummary.IN_PROGRESS}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 border-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">
                Done
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tasksLoading ? (
                <div className="h-9 w-16 bg-white/20 rounded animate-pulse"></div>
              ) : (
                <div className="text-3xl font-bold text-white">
                  {taskStatusSummary.DONE}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Graphs */}
        <DashboardGraphs />

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
      </div>
    </AppLayout>
  );
};
