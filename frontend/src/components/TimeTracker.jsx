import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { useTimer } from "@/hooks/useTimer";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/ui/button";
import { Play, Square, X, Clock, Pause } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export const TimeTracker = () => {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");

  const {
    runningTimer,
    isRunning,
    employeeId,
    formattedTime,
    isStarting,
    isStopping,
    isPausing,
    isResuming,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    handleDiscardTimer,
  } = useTimer();

  const isEmployee = user?.role === "EMPLOYEE";

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 10000 }),
  });

  const { data: packagesData } = useQuery({
    queryKey: ["packages", selectedClientId],
    queryFn: () =>
      packagesApi.getAll({ clientId: selectedClientId, limit: 10000 }),
    enabled: !!selectedClientId,
  });

  const { data: tasksData } = useQuery({
    queryKey: ["tasks", selectedPackageId, isEmployee ? employeeId : null],
    queryFn: () => {
      const params = { packageId: selectedPackageId, limit: 10000 };
      // If user is an employee, filter by assignedTo
      if (isEmployee && employeeId) {
        params.assignedTo = employeeId;
      }
      return tasksApi.getAll(params);
    },
    enabled: !!selectedPackageId && (!isEmployee || !!employeeId),
  });

  const handleStart = async () => {
    if (!selectedClientId || !selectedPackageId || !selectedTaskId) {
      toast({
        title: "Error",
        description: "Please select client, package, and task",
        type: "destructive",
      });
      return;
    }

    const started = await handleStartTimer({
      employeeId,
      clientId: selectedClientId,
      packageId: selectedPackageId,
      taskId: selectedTaskId,
      date: new Date().toISOString(),
    });

    if (started) {
      setSelectedClientId("");
      setSelectedPackageId("");
      setSelectedTaskId("");
    }
  };

  const clients = clientsData?.data?.clients || [];
  const packages = packagesData?.data?.packages || [];
  // Filter tasks to only show assigned ones for employees
  let tasks = tasksData?.data?.tasks || [];
  if (isEmployee && employeeId) {
    tasks = tasks.filter((task) => {
      const assignedIds = Array.isArray(task.assignedTo)
        ? task.assignedTo.map((emp) => emp._id || emp)
        : task.assignedTo
        ? [task.assignedTo._id || task.assignedTo]
        : [];
      // Only show tasks that are assigned to this employee (exclude unassigned tasks)
      return assignedIds.length > 0 && assignedIds.includes(employeeId);
    });
  }

  if (!employeeId) {
    return null;
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
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                isRunning ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isRunning ? "bg-emerald-600 animate-pulse" : "bg-amber-600"
                }`}
              ></div>
              <span
                className={`text-sm font-semibold ${
                  isRunning ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                {isRunning ? "Running" : "Paused"}
              </span>
            </div>
          </div>
        )}
      </div>

      {runningTimer ? (
        <div className="space-y-4">
          <div className="text-center">
            <div
              className={`text-3xl font-bold mb-2 ${
                isRunning ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {formattedTime}
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium">
                {runningTimer.isMiscellaneous
                  ? runningTimer.miscellaneousDescription || "Miscellaneous"
                  : runningTimer.taskId?.name || "Task"}
              </p>
              <p className="text-xs">
                {runningTimer.clientId?.name || "Client"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {isRunning ? (
              <Button
                variant="outline"
                className="flex-1 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                onClick={handlePauseTimer}
                disabled={isPausing}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleResumeTimer}
                disabled={isResuming}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => handleStopTimer()}
              disabled={isStopping}
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleDiscardTimer}
              disabled={isStopping}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Client
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value);
                setSelectedPackageId("");
                setSelectedTaskId("");
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
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Package
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => {
                setSelectedPackageId(e.target.value);
                setSelectedTaskId("");
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
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Task
            </label>
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
            disabled={
              !selectedClientId ||
              !selectedPackageId ||
              !selectedTaskId ||
              isStarting
            }
          >
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
        </div>
      )}
    </div>
  );
};
