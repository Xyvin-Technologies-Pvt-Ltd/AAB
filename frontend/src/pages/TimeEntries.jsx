import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { timeEntriesApi } from "@/api/timeEntries";
import { employeesApi } from "@/api/employees";
import { clientsApi } from "@/api/clients";
import { packagesApi } from "@/api/packages";
import { tasksApi } from "@/api/tasks";
import { useAuthStore } from "@/store/authStore";
import { useTimer } from "@/hooks/useTimer";
import { TimeFilterDrawer } from "@/components/TimeFilterDrawer";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { SelectSearch } from "@/ui/select-search";
import { Play, Pause, Square, Filter, Table2, Grid, ChevronDown, Edit2, Trash2 } from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { useToast } from "@/hooks/useToast";
import { formatTimeFromSeconds } from "@/utils/dateFormat";
import { LoaderWithText } from "@/components/Loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";

export const TimeEntries = () => {
  const [timerMode, setTimerMode] = useState("task"); // 'task' or 'misc'
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [miscDescription, setMiscDescription] = useState("");
  const [miscClientId, setMiscClientId] = useState("");
  const [miscPackageId, setMiscPackageId] = useState("");
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [viewMode, setViewMode] = useState("table");
  const [filters, setFilters] = useState({
    employeeId: "",
    clientId: "",
    packageId: "",
    startDate: "",
    endDate: "",
    isMiscellaneous: null,
  });
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    taskId: "",
    clientId: "",
    packageId: "",
    startTime: "",
    endTime: "",
  });
  const [calculatedDuration, setCalculatedDuration] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [timeValidationError, setTimeValidationError] = useState("");
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use centralized timer hook
  const {
    runningTimer,
    elapsedSeconds,
    isRunning,
    isPaused,
    employeeId,
    formattedTime,
    handleStartTimer,
    handleStartTimerForTask,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    stopCurrentTimer,
    pauseTimerMutation,
    resumeTimerMutation,
    stopTimerMutation,
    startTimerMutation: timerStartMutation,
  } = useTimer();

  const isEmployee = user?.role === "EMPLOYEE";

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ["time-entries", filters],
    queryFn: () =>
      timeEntriesApi.getAll({
        limit: 1000,
        ...filters,
        employeeId: filters.employeeId || undefined,
        clientId: filters.clientId || undefined,
        packageId: filters.packageId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        isMiscellaneous:
          filters.isMiscellaneous !== null &&
          filters.isMiscellaneous !== undefined
            ? String(filters.isMiscellaneous)
            : undefined,
      }),
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeesApi.getAll({ limit: 100 }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 100 }),
  });

  // Fetch tasks for searchable dropdown
  // For employees, only show tasks assigned to them
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", "all", isEmployee ? employeeId : null],
    queryFn: () => {
      const params = { limit: 1000 };
      // If user is an employee, filter by assignedTo
      if (isEmployee && employeeId) {
        params.assignedTo = employeeId;
      }
      return tasksApi.getAll(params);
    },
    enabled: !isEmployee || !!employeeId,
  });

  // Fetch all packages for filter drawer
  const { data: packagesData } = useQuery({
    queryKey: ["packages", "all"],
    queryFn: () => packagesApi.getAll({ limit: 1000 }),
  });

  const { data: miscPackagesData } = useQuery({
    queryKey: ["packages", miscClientId],
    queryFn: () => packagesApi.getAll({ clientId: miscClientId, limit: 100 }),
    enabled: !!miscClientId,
  });

  // Miscellaneous timer start mutation (special case not in centralized hook)
  const startMiscTimerMutation = useMutation({
    mutationFn: (data) => timeEntriesApi.startMiscellaneousTimer(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["running-timer"] });
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast({ title: "Success", description: "Timer started", type: "success" });
      setMiscDescription("");
      setMiscClientId("");
      setMiscPackageId("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to start timer",
        type: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: timeEntriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      toast({
        title: "Success",
        description: "Time entry deleted",
        type: "success",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => timeEntriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      setShowEditDialog(false);
      setEditingEntry(null);
      toast({
        title: "Success",
        description: "Time entry updated successfully",
        type: "success",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update time entry",
        type: "destructive",
      });
    },
  });

  const handleStart = async () => {
    if (timerMode === "task") {
      if (!selectedTaskId) {
        toast({
          title: "Error",
          description: "Please select a task",
          type: "destructive",
        });
        return;
      }
      const started = await handleStartTimerForTask(selectedTaskId);
      if (started) {
        setSelectedTaskId("");
      }
    } else {
      if (!miscDescription.trim()) {
        toast({
          title: "Error",
          description: "Please enter a description for miscellaneous entry",
          type: "destructive",
        });
        return;
      }
      // Handle existing timer for misc mode
      if (runningTimer) {
        const stopped = await stopCurrentTimer();
        if (!stopped) return;
      }
      startMiscTimerMutation.mutate({
        employeeId,
        miscellaneousDescription: miscDescription,
        clientId: miscClientId || undefined,
        packageId: miscPackageId || undefined,
        date: new Date().toISOString(),
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this time entry?")) {
      deleteMutation.mutate(id);
    }
  };

  // Calculate duration from start and end times
  const calculateDuration = (startDate, startTime, endDate, endTime) => {
    if (!startDate || !startTime || !endDate || !endTime) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { hours: 0, minutes: 0, seconds: 0 };
      }
      
      const diffMs = end - start;
      if (diffMs < 0) {
        return { hours: 0, minutes: 0, seconds: 0, error: true };
      }
      
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      return {
        hours,
        minutes,
        seconds,
      };
    } catch (error) {
      return { hours: 0, minutes: 0, seconds: 0, error: true };
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    
    // Extract time from startTime/endTime if available
    let startTimeStr = "";
    let endTimeStr = "";
    
    if (entry.startTime) {
      const startDate = new Date(entry.startTime);
      startTimeStr = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
    } else {
      // If no startTime, default to 09:00
      startTimeStr = "09:00";
    }
    
    if (entry.endTime) {
      const endDate = new Date(entry.endTime);
      endTimeStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
    } else {
      // If no endTime, calculate based on startTime + minutesSpent, or use current time
      if (entry.startTime && entry.minutesSpent) {
        const startDate = new Date(entry.startTime);
        const endDate = new Date(startDate.getTime() + entry.minutesSpent * 1000);
        endTimeStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      } else {
        // Use current time as default
        const now = new Date();
        endTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      }
    }
    
    setEditFormData({
      taskId: entry.taskId?._id || entry.taskId || "",
      clientId: entry.clientId?._id || entry.clientId || "",
      packageId: entry.packageId?._id || entry.packageId || "",
      startTime: startTimeStr,
      endTime: endTimeStr,
    });
    
    // Calculate initial duration
    if (startTimeStr && endTimeStr && entry.date) {
      const dateStr = new Date(entry.date).toISOString().split("T")[0];
      const duration = calculateDuration(dateStr, startTimeStr, dateStr, endTimeStr);
      setCalculatedDuration(duration);
    } else {
      // Fallback to minutesSpent if no times available (minutesSpent is stored in seconds)
      const totalSeconds = entry.minutesSpent || 0;
      setCalculatedDuration({
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    }
    
    setTimeValidationError("");
    setShowEditDialog(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editingEntry) return;

    // Validate required fields
    if (!editFormData.startTime || !editFormData.endTime) {
      toast({
        title: "Validation Error",
        description: "Please provide both start time and end time",
        type: "destructive",
      });
      return;
    }

    // Validate time range
    if (timeValidationError) {
      toast({
        title: "Validation Error",
        description: timeValidationError,
        type: "destructive",
      });
      return;
    }

    const formData = new FormData(e.target);
    const date = formData.get("date");
    
    if (!date) {
      toast({
        title: "Validation Error",
        description: "Please select a date",
        type: "destructive",
      });
      return;
    }
    
    // Calculate minutesSpent from start/end times
    const duration = calculateDuration(
      date,
      editFormData.startTime,
      date,
      editFormData.endTime
    );
    
    if (duration.error || duration.hours < 0 || duration.minutes < 0 || duration.seconds < 0) {
      toast({
        title: "Validation Error",
        description: "End time must be after start time",
        type: "destructive",
      });
      return;
    }
    
    if (duration.hours === 0 && duration.minutes === 0 && duration.seconds === 0) {
      toast({
        title: "Validation Error",
        description: "Duration cannot be zero. Please ensure end time is after start time",
        type: "destructive",
      });
      return;
    }
    
    // Calculate total seconds (minutesSpent is stored in seconds)
    const totalSeconds = duration.hours * 3600 + duration.minutes * 60 + duration.seconds;

    // Combine date and time into Date objects
    const startDateTime = new Date(`${date}T${editFormData.startTime}`);
    const endDateTime = new Date(`${date}T${editFormData.endTime}`);

    const updateData = {
      date: date,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      minutesSpent: totalSeconds, // Stored in seconds
      description: formData.get("description") || undefined,
    };

    // Only update task-related fields if not miscellaneous
    if (!editingEntry.isMiscellaneous) {
      if (editFormData.taskId) {
        updateData.taskId = editFormData.taskId;
      }
    } else {
      if (formData.get("miscellaneousDescription")) {
        updateData.miscellaneousDescription = formData.get("miscellaneousDescription");
      }
    }

    // Update client and package if provided
    if (editFormData.clientId) {
      updateData.clientId = editFormData.clientId;
    }
    if (editFormData.packageId) {
      updateData.packageId = editFormData.packageId;
    }

    updateMutation.mutate({ id: editingEntry._id, data: updateData });
  };

  const handleStartFromEntry = async (entry) => {
    if (entry.isMiscellaneous) {
      toast({
        title: "Error",
        description: "Cannot restart miscellaneous entries. Please create a new timer.",
        type: "destructive",
      });
      return;
    }

    if (!entry.taskId?._id) {
      toast({
        title: "Error",
        description: "Task not found for this entry",
        type: "destructive",
      });
      return;
    }

    // Use centralized handler for task-based timers (same as starting from task page)
    await handleStartTimerForTask(entry.taskId._id);
  };

  const handlePauseFromEntry = (entryId) => {
    pauseTimerMutation.mutate(entryId);
  };

  const handleResumeFromEntry = (entryId) => {
    resumeTimerMutation.mutate(entryId);
  };

  const handleStopFromEntry = (entryId) => {
    if (window.confirm("Are you sure you want to stop the timer?")) {
      stopTimerMutation.mutate({ id: entryId });
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupKey)) {
        newSet.delete(groupKey);
      } else {
        newSet.add(groupKey);
      }
      return newSet;
    });
  };

  const entries = entriesData?.data?.timeEntries || [];
  const employees = employeesData?.data?.employees || [];
  const clients = clientsData?.data?.clients || [];
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
  const packages = packagesData?.data?.packages || [];
  const miscPackages = miscPackagesData?.data?.packages || [];

  // Get selected task details for display
  const selectedTask = tasks.find((task) => task._id === selectedTaskId);

  // Group entries by task (taskId for tasks, miscellaneousDescription for misc)
  const groupEntriesByTask = (entries) => {
    const grouped = {};
    
    entries.forEach((entry) => {
      let key;
      if (entry.isMiscellaneous) {
        key = `misc_${entry.miscellaneousDescription || 'miscellaneous'}`;
      } else {
        key = entry.taskId?._id || entry.taskId || 'no-task';
      }
      
      if (!grouped[key]) {
        grouped[key] = {
          key,
          entries: [],
          totalTime: 0,
          isMiscellaneous: entry.isMiscellaneous,
          taskId: entry.taskId,
          taskName: entry.isMiscellaneous 
            ? entry.miscellaneousDescription || 'Miscellaneous'
            : entry.taskId?.name || '-',
          clientId: entry.clientId,
          packageId: entry.packageId,
          employeeId: entry.employeeId,
        };
      }
      
      grouped[key].entries.push(entry);
      grouped[key].totalTime += entry.minutesSpent || 0;
    });
    
    return Object.values(grouped);
  };

  const groupedEntries = groupEntriesByTask(entries);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const totalHours = entries.reduce(
    (sum, entry) => sum + entry.minutesSpent / 3600,
    0
  );

  const getEntriesForDay = (day) => {
    return entries.filter((entry) => isSameDay(new Date(entry.date), day));
  };

  const navigateWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + direction * 7);
    setCurrentWeek(newWeek);
    setFilters({
      ...filters,
      startDate: format(
        startOfWeek(newWeek, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      ),
      endDate: format(endOfWeek(newWeek, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    });
  };

  const canStart =
    timerMode === "task" ? selectedTaskId : miscDescription.trim();
  const isTimerActive = runningTimer && (isRunning || isPaused);
  const isStarting = timerStartMutation.isPending || startMiscTimerMutation.isPending;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Time Entries</h1>
            <p className="text-gray-600 mt-1">Track and manage time entries</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
              >
                <Table2 className="h-4 w-4 mr-1" />
                Table
              </Button>
              <Button
                variant={viewMode === "weekly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("weekly")}
              >
                <Grid className="h-4 w-4 mr-1" />
                Weekly
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowFilterDrawer(true)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Timer Card */}
        <Card className="border border-gray-200 rounded-lg p-6">
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5 w-fit">
              <button
                onClick={() => setTimerMode("task")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  timerMode === "task"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Task
              </button>
              <button
                onClick={() => setTimerMode("misc")}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  timerMode === "misc"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Miscellaneous
              </button>
            </div>

            {isTimerActive ? (
              /* Active Timer Display */
              <div className="space-y-4">
                <div className="text-center">
                  <div
                    className={`text-5xl font-mono font-semibold mb-2 ${
                      isRunning ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    {formattedTime}
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">
                      {runningTimer.isMiscellaneous
                        ? runningTimer.miscellaneousDescription ||
                          "Miscellaneous"
                        : runningTimer.taskId?.name || "Task"}
                    </p>
                    {runningTimer.clientId && (
                      <p className="text-xs">{runningTimer.clientId.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  {isRunning ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handlePauseTimer}
                      disabled={pauseTimerMutation.isPending}
                      className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
                    >
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      onClick={handleResumeTimer}
                      disabled={resumeTimerMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={() => handleStopTimer()}
                    disabled={stopTimerMutation.isPending}
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Stop
                  </Button>
                </div>
              </div>
            ) : (
              /* Timer Setup */
              <div className="space-y-4">
                {timerMode === "task" ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Task *
                      </label>
                      <SelectSearch
                        options={tasks}
                        value={selectedTaskId}
                        onChange={setSelectedTaskId}
                        placeholder="Search and select a task..."
                        searchPlaceholder="Type to search tasks..."
                        emptyMessage="No tasks found"
                        className="w-full"
                      />
                    </div>
                    {selectedTask && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Client
                          </label>
                          <div className="text-sm font-medium text-gray-900">
                            {selectedTask.clientId?.name || "-"}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Package
                          </label>
                          <div className="text-sm font-medium text-gray-900">
                            {selectedTask.packageId?.name || "-"}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description *
                      </label>
                      <input
                        type="text"
                        value={miscDescription}
                        onChange={(e) => setMiscDescription(e.target.value)}
                        placeholder="What are you working on?"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Client (Optional)
                        </label>
                        <select
                          value={miscClientId}
                          onChange={(e) => {
                            setMiscClientId(e.target.value);
                            setMiscPackageId("");
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Package (Optional)
                        </label>
                        <select
                          value={miscPackageId}
                          onChange={(e) => setMiscPackageId(e.target.value)}
                          disabled={!miscClientId}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Package</option>
                          {miscPackages.map((pkg) => (
                            <option key={pkg._id} value={pkg._id}>
                              {pkg.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}
                <div className="flex justify-center">
                  <Button
                    size="lg"
                    onClick={handleStart}
                    disabled={!canStart || isStarting}
                    className="bg-emerald-600 hover:bg-emerald-700 px-8"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Timer
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Entries List */}
        {isLoading ? (
          <div className="py-12">
            <LoaderWithText text="Loading time entries..." />
          </div>
        ) : viewMode === "weekly" ? (
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Week of {format(weekStart, "MMM dd")} -{" "}
                  {format(weekEnd, "MMM dd, yyyy")}
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek(-1)}
                  >
                    Previous Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentWeek(new Date())}
                  >
                    This Week
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek(1)}
                  >
                    Next Week
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const dayEntries = getEntriesForDay(day);
                  const dayTotal = dayEntries.reduce(
                    (sum, e) => sum + e.minutesSpent / 3600,
                    0
                  );
                  return (
                    <div
                      key={day.toISOString()}
                      className="border rounded-lg p-2"
                    >
                      <div className="text-xs font-semibold text-gray-600 mb-2">
                        {format(day, "EEE")}
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {format(day, "MMM dd")}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : "0h"}
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {dayEntries.slice(0, 3).map((entry) => (
                          <div
                            key={entry._id}
                            className="text-xs p-1 bg-indigo-50 rounded text-indigo-900 truncate"
                            title={`${
                              entry.taskId?.name || entry.isMiscellaneous
                                ? "Misc"
                                : "Task"
                            } - ${formatTimeFromSeconds(entry.minutesSpent, false)}`}
                          >
                            {entry.isMiscellaneous
                              ? entry.miscellaneousDescription || "Misc"
                              : entry.taskId?.name || "Task"}
                          </div>
                        ))}
                        {dayEntries.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{dayEntries.length - 3} more
                          </div>
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
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total:{" "}
                <span className="font-semibold">
                  {totalHours.toFixed(2)} hours
                </span>
              </div>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Date
                  </th>
                  {!isEmployee && (
                    <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Employee
                    </th>
                  )}
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {groupedEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isEmployee ? 6 : 7}
                      className="px-2 py-8 text-center text-xs text-gray-500"
                    >
                      No time entries found
                    </td>
                  </tr>
                ) : (
                  groupedEntries.map((group) => {
                    const isExpanded = expandedGroups.has(group.key);
                    const hasMultipleEntries = group.entries.length > 1;
                    const firstEntry = group.entries[0];

                    // Helper function to render entry row
                    const renderEntryRow = (entry, isNested = false) => (
                      <tr key={entry._id} className={isNested ? "bg-gray-50" : ""}>
                        <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${isNested ? "pl-8 text-gray-600" : "text-gray-900"}`}>
                          {isNested && (
                            <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                          )}
                          {new Date(entry.date).toLocaleDateString()}
                          {entry.startTime && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {entry.endTime && ` - ${new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </div>
                          )}
                        </td>
                        {!isEmployee && (
                          <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${isNested ? "text-gray-500" : "text-gray-500"}`}>
                            {entry.employeeId?.name || "-"}
                          </td>
                        )}
                        <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${isNested ? "text-gray-500" : "text-gray-500"}`}>
                          {entry.clientId?.name || "-"}
                        </td>
                        <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${isNested ? "text-gray-500" : "text-gray-500"}`}>
                          {entry.packageId?.name || "-"}
                        </td>
                        <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${isNested ? "text-gray-500" : "text-gray-500"}`}>
                          {entry.isMiscellaneous
                            ? entry.miscellaneousDescription || "Miscellaneous"
                            : entry.taskId?.name || "-"}
                        </td>
                        <td className={`px-2 py-1.5 whitespace-nowrap text-xs ${isNested ? "text-gray-500" : "text-gray-500 font-medium"} font-mono`}>
                          {formatTimeFromSeconds(entry.minutesSpent, false)}
                        </td>
                        <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {/* Check if this entry is the currently running timer */}
                            {runningTimer?._id === entry._id ? (
                              <>
                                {/* Running timer - show Pause/Resume and Stop */}
                                {isRunning ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handlePauseFromEntry(entry._id)}
                                    disabled={pauseTimerMutation.isPending}
                                    className="h-7 w-7 bg-amber-50 hover:bg-amber-100 text-amber-700"
                                    title="Pause"
                                  >
                                    <Pause className="h-3.5 w-3.5" />
                                  </Button>
                                ) : isPaused ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleResumeFromEntry(entry._id)}
                                    disabled={resumeTimerMutation.isPending}
                                    className="h-7 w-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                                    title="Resume"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStopFromEntry(entry._id)}
                                  disabled={stopTimerMutation.isPending}
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Stop"
                                >
                                  <Square className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {/* Not running - show Start button if it's a task-based entry */}
                                {!entry.isMiscellaneous && entry.taskId?._id && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleStartFromEntry(entry)}
                                    disabled={timerStartMutation.isPending}
                                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                    title="Start Timer"
                                  >
                                    <Play className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                            {/* Edit button - only show if entry is not running */}
                            {runningTimer?._id !== entry._id && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(entry)}
                                className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                title="Edit"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entry._id)}
                              disabled={deleteMutation.isPending}
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );

                    // If single entry, render directly
                    if (!hasMultipleEntries) {
                      return renderEntryRow(firstEntry, false);
                    }

                    // Multiple entries - render group row with accordion
                    // Get date range for the group
                    const dates = group.entries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
                    const earliestDate = new Date(dates[0]);
                    const latestDate = new Date(dates[dates.length - 1]);
                    const dateRange = earliestDate.getTime() === latestDate.getTime()
                      ? earliestDate.toLocaleDateString()
                      : `${earliestDate.toLocaleDateString()} - ${latestDate.toLocaleDateString()}`;

                    return (
                      <React.Fragment key={group.key}>
                        {/* Main group row */}
                        <tr 
                          className="bg-gray-50 hover:bg-gray-100 cursor-pointer"
                          onClick={() => toggleGroup(group.key)}
                        >
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <ChevronDown
                                className={`h-3.5 w-3.5 text-gray-500 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                              <div>
                                <div>{dateRange}</div>
                                <div className="text-[10px] text-gray-500">{group.entries.length} entries</div>
                              </div>
                            </div>
                          </td>
                          {!isEmployee && (
                            <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500">
                              {firstEntry.employeeId?.name || "-"}
                            </td>
                          )}
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500">
                            {firstEntry.clientId?.name || "-"}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs text-gray-500">
                            {firstEntry.packageId?.name || "-"}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs font-medium text-gray-900">
                            {group.taskName}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-xs font-semibold text-gray-900 font-mono">
                            {formatTimeFromSeconds(group.totalTime, false)}
                          </td>
                          <td className="px-2 py-1.5 whitespace-nowrap text-right text-xs font-medium" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                            {!firstEntry.isMiscellaneous && firstEntry.taskId?._id && (
                              <Button
                                  variant="ghost"
                                  size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartFromEntry(firstEntry);
                                }}
                                disabled={timerStartMutation.isPending}
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Start Timer"
                              >
                                  <Play className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            </div>
                          </td>
                        </tr>
                        {/* Expanded individual entries */}
                        {isExpanded &&
                          group.entries.map((entry) => renderEntryRow(entry, true))}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Filter Drawer */}
        <TimeFilterDrawer
          open={showFilterDrawer}
          onOpenChange={setShowFilterDrawer}
          filters={filters}
          onFilterChange={setFilters}
          employees={employees}
          clients={clients}
          packages={packages}
          isEmployee={isEmployee}
        />

        {/* Edit Time Entry Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Time Entry</DialogTitle>
              <DialogDescription>
                Update the time entry details below.
              </DialogDescription>
            </DialogHeader>
            {editingEntry && (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={
                      editingEntry.date
                        ? new Date(editingEntry.date).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      // Recalculate duration when date changes
                      const date = e.target.value;
                      if (date && editFormData.startTime && editFormData.endTime) {
                        const duration = calculateDuration(
                          date,
                          editFormData.startTime,
                          date,
                          editFormData.endTime
                        );
                        setCalculatedDuration(duration);
                      }
                    }}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      value={editFormData.startTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setEditFormData((prev) => ({ ...prev, startTime: newStartTime }));
                        
                        // Recalculate duration
                        const form = e.target.closest("form");
                        const dateInput = form?.querySelector('input[name="date"]');
                        const date = dateInput?.value || new Date(editingEntry.date).toISOString().split("T")[0];
                        const duration = calculateDuration(
                          date,
                          newStartTime,
                          date,
                          editFormData.endTime
                        );
                        setCalculatedDuration(duration);
                        
                        // Validate
                        if (newStartTime && editFormData.endTime && newStartTime >= editFormData.endTime) {
                          setTimeValidationError("End time must be after start time");
                        } else {
                          setTimeValidationError("");
                        }
                      }}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      End Time *
                    </label>
                    <input
                      type="time"
                      value={editFormData.endTime}
                      onChange={(e) => {
                        const newEndTime = e.target.value;
                        setEditFormData((prev) => ({ ...prev, endTime: newEndTime }));
                        
                        // Recalculate duration
                        const form = e.target.closest("form");
                        const dateInput = form?.querySelector('input[name="date"]');
                        const date = dateInput?.value || new Date(editingEntry.date).toISOString().split("T")[0];
                        const duration = calculateDuration(
                          date,
                          editFormData.startTime,
                          date,
                          newEndTime
                        );
                        setCalculatedDuration(duration);
                        
                        // Validate
                        if (editFormData.startTime && newEndTime && editFormData.startTime >= newEndTime) {
                          setTimeValidationError("End time must be after start time");
                        } else {
                          setTimeValidationError("");
                        }
                      }}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                {/* Duration Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Calculated Duration
                  </label>
                  <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 font-medium font-mono">
                    {String(calculatedDuration.hours).padStart(2, "0")}:{String(calculatedDuration.minutes).padStart(2, "0")}:{String(calculatedDuration.seconds).padStart(2, "0")}
                  </div>
                  {timeValidationError && (
                    <p className="mt-1 text-xs text-red-600">{timeValidationError}</p>
                  )}
                </div>

                {editingEntry.isMiscellaneous ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description *
                    </label>
                    <input
                      type="text"
                      name="miscellaneousDescription"
                      defaultValue={editingEntry.miscellaneousDescription || ""}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Task *
                    </label>
                    <SelectSearch
                      options={tasks}
                      value={editFormData.taskId}
                      onChange={(value) => {
                        setEditFormData((prev) => ({ ...prev, taskId: value }));
                      }}
                      placeholder="Select a task..."
                      searchPlaceholder="Type to search tasks..."
                      emptyMessage="No tasks found"
                      className="w-full"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Client (Optional)
                  </label>
                  <select
                    value={editFormData.clientId}
                    onChange={(e) => {
                      setEditFormData((prev) => ({
                        ...prev,
                        clientId: e.target.value,
                        packageId: "", // Reset package when client changes
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Package (Optional)
                  </label>
                  <select
                    value={editFormData.packageId}
                    onChange={(e) => {
                      setEditFormData((prev) => ({ ...prev, packageId: e.target.value }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Package</option>
                    {packages
                      .filter(
                        (pkg) =>
                          !editFormData.clientId ||
                          (pkg.clientId?._id || pkg.clientId) === editFormData.clientId
                      )
                      .map((pkg) => (
                        <option key={pkg._id} value={pkg._id}>
                          {pkg.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingEntry.description || ""}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false);
                      setEditingEntry(null);
                      setEditFormData({ taskId: "", clientId: "", packageId: "", startTime: "", endTime: "" });
                      setCalculatedDuration({ hours: 0, minutes: 0, seconds: 0 });
                      setTimeValidationError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? "Updating..." : "Update"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};
