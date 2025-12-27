import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const DashboardGraphs = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-statistics'],
    queryFn: () => analyticsApi.getDashboardStatistics(),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  const tasksData = data?.data?.tasks || [];
  const submissionsData = data?.data?.submissions || [];

  // Prepare tasks data for chart
  const tasksChartData = tasksData.map((item) => ({
    month: item.monthLabel,
    'To Do': item.todo,
    'In Progress': item.inProgress,
    Done: item.done,
  }));

  // Prepare submissions data for chart
  const submissionsChartData = submissionsData.map((item) => ({
    month: item.monthLabel,
    VAT: item.vat,
    'Corporate Tax': item.corporateTax,
    Expiry: item.expiry,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tasks Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Tasks (Next 4 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={tasksChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="To Do" fill="#6b7280" />
              <Bar dataKey="In Progress" fill="#3b82f6" />
              <Bar dataKey="Done" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Submissions Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Submissions (Next 4 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={submissionsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="VAT" fill="#3b82f6" />
              <Bar dataKey="Corporate Tax" fill="#10b981" />
              <Bar dataKey="Expiry" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

