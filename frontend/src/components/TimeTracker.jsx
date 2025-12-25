import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timeEntriesApi } from '@/api/timeEntries';
import { tasksApi } from '@/api/tasks';
import { clientsApi } from '@/api/clients';
import { packagesApi } from '@/api/packages';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/ui/button';
import { Play, Square, X, Clock } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export const TimeTracker = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const employeeId = user?.role === 'EMPLOYEE' && user?.employeeId ? user.employeeId : user?.employeeId;

  const { data: runningTimerData, refetch: refetchRunningTimer } = useQuery({
    queryKey: ['running-timer', employeeId],
    queryFn: () => timeEntriesApi.getRunningTimer(employeeId),
    enabled: !!employeeId,
    refetchInterval: 1000, // Refetch every second to update elapsed time
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

  const runningTimer = runningTimerData?.data;

  const startTimerMutation = useMutation({
    mutationFn: timeEntriesApi.startTimer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast({ title: 'Success', description: 'Timer started', type: 'success' });
      setSelectedClientId('');
      setSelectedPackageId('');
      setSelectedTaskId('');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start timer',
        type: 'destructive',
      });
    },
  });

  const stopTimerMutation = useMutation({
    mutationFn: (id) => timeEntriesApi.stopTimer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-timer'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast({ title: 'Success', description: 'Timer stopped', type: 'success' });
      setElapsedSeconds(0);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to stop timer',
        type: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (runningTimer?.timerStartedAt) {
      const interval = setInterval(() => {
        const startTime = new Date(runningTimer.timerStartedAt);
        const now = new Date();
        const seconds = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(seconds);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [runningTimer]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!selectedClientId || !selectedPackageId || !selectedTaskId) {
      toast({
        title: 'Error',
        description: 'Please select client, package, and task',
        type: 'destructive',
      });
      return;
    }

    startTimerMutation.mutate({
      employeeId,
      clientId: selectedClientId,
      packageId: selectedPackageId,
      taskId: selectedTaskId,
      date: new Date().toISOString(),
    });
  };

  const handleStop = () => {
    if (runningTimer?._id) {
      stopTimerMutation.mutate(runningTimer._id);
    }
  };

  const handleDiscard = () => {
    if (confirm('Are you sure you want to discard this timer?')) {
      if (runningTimer?._id) {
        stopTimerMutation.mutate(runningTimer._id);
      }
    }
  };

  const clients = clientsData?.data?.clients || [];
  const packages = packagesData?.data?.packages || [];
  const tasks = tasksData?.data?.tasks || [];

  if (!employeeId) {
    return null; // Don't show timer if no employee ID
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Time Tracker</h3>
        </div>
        {runningTimer && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-red-800">Running</span>
            </div>
          </div>
        )}
      </div>

      {runningTimer ? (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {formatTime(elapsedSeconds)}
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">{runningTimer.taskId?.name || 'Task'}</p>
              <p className="text-xs">{runningTimer.clientId?.name || 'Client'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleStop}
              disabled={stopTimerMutation.isPending}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscard}
              disabled={stopTimerMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Client</label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedPackageId('');
                setSelectedTaskId('');
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
            <label className="text-xs font-medium text-gray-700 mb-1 block">Package</label>
            <select
              value={selectedPackageId}
              onChange={(e) => {
                setSelectedPackageId(e.target.value);
                setSelectedTaskId('');
              }}
              disabled={!selectedClientId}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
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
            <label className="text-xs font-medium text-gray-700 mb-1 block">Task</label>
            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={!selectedPackageId}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              <option value="">Select Task</option>
              {tasks.map((task) => (
                <option key={task._id} value={task._id}>
                  {task.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="w-full"
            onClick={handleStart}
            disabled={!selectedClientId || !selectedPackageId || !selectedTaskId || startTimerMutation.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
        </div>
      )}
    </div>
  );
};

