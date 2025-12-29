import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timeEntriesApi } from "@/api/timeEntries";
import { useAuthStore } from "@/store/authStore";
import { useTimerStore } from "@/store/timerStore";
import { useToast } from "@/hooks/useToast";

/**
 * Centralized timer hook for managing running timer state across the app.
 * Handles query syncing, mutations, and confirmation dialogs.
 */
export const useTimer = () => {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isInitialMount = useRef(true);

    const {
        runningTimer,
        elapsedSeconds,
        isRunning,
        isPaused,
        setRunningTimer,
    } = useTimerStore();

    // employeeId can be either a string (from login) or an object (from getMe with populated data)
    const employeeId = typeof user?.employeeId === 'object'
        ? user?.employeeId?._id
        : user?.employeeId;

    // Query for running timer
    const { data: runningTimerData, dataUpdatedAt, refetch } = useQuery({
        queryKey: ["running-timer", employeeId],
        queryFn: () => timeEntriesApi.getRunningTimer(employeeId),
        enabled: !!employeeId,
        refetchInterval: 5000,
        staleTime: 2000,
    });

    // Sync query data to Zustand store
    useEffect(() => {
        const fetchedTimer = runningTimerData?.data;

        // On initial mount, always sync from query
        if (isInitialMount.current) {
            isInitialMount.current = false;
            if (fetchedTimer) {
                setRunningTimer(fetchedTimer);
            } else {
                setRunningTimer(null);
            }
            return;
        }

        // After initial mount, smart sync
        if (fetchedTimer && !runningTimer) {
            setRunningTimer(fetchedTimer);
        } else if (!fetchedTimer && runningTimer) {
            setRunningTimer(null);
        } else if (fetchedTimer && runningTimer && fetchedTimer._id !== runningTimer._id) {
            setRunningTimer(fetchedTimer);
        } else if (fetchedTimer && runningTimer && fetchedTimer._id === runningTimer._id) {
            if (fetchedTimer.isRunning !== runningTimer.isRunning ||
                fetchedTimer.isPaused !== runningTimer.isPaused) {
                setRunningTimer(fetchedTimer);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataUpdatedAt]);

    // Start timer mutation
    const startTimerMutation = useMutation({
        mutationFn: timeEntriesApi.startTimer,
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["running-timer"] });
            queryClient.invalidateQueries({ queryKey: ["time-entries"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            if (response?.data) {
                setRunningTimer(response.data);
            }
            toast({ title: "Success", description: "Timer started", type: "success" });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to start timer",
                type: "destructive",
            });
        },
    });

    // Start timer for task mutation
    const startTimerForTaskMutation = useMutation({
        mutationFn: ({ taskId, employeeId }) => timeEntriesApi.startTimerForTask(taskId, employeeId),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["running-timer"] });
            queryClient.invalidateQueries({ queryKey: ["time-entries"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            if (response?.data) {
                setRunningTimer(response.data);
            }
            toast({ title: "Success", description: "Timer started", type: "success" });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to start timer",
                type: "destructive",
            });
        },
    });

    // Stop timer mutation
    const stopTimerMutation = useMutation({
        mutationFn: ({ id, markTaskComplete = false }) => timeEntriesApi.stopTimer(id, markTaskComplete),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["running-timer"] });
            queryClient.invalidateQueries({ queryKey: ["time-entries"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            setRunningTimer(null);
            toast({ title: "Success", description: "Timer stopped", type: "success" });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to stop timer",
                type: "destructive",
            });
        },
    });

    // Pause timer mutation
    const pauseTimerMutation = useMutation({
        mutationFn: (id) => timeEntriesApi.pauseTimer(id),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["running-timer"] });
            if (response?.data) {
                setRunningTimer(response.data);
            }
            toast({ title: "Success", description: "Timer paused", type: "success" });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to pause timer",
                type: "destructive",
            });
        },
    });

    // Resume timer mutation
    const resumeTimerMutation = useMutation({
        mutationFn: (id) => timeEntriesApi.resumeTimer(id),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ["running-timer"] });
            if (response?.data) {
                setRunningTimer(response.data);
            }
            toast({ title: "Success", description: "Timer resumed", type: "success" });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to resume timer",
                type: "destructive",
            });
        },
    });

    // Get timer display name
    const getTimerName = (timer) => {
        if (!timer) return "";
        return timer.isMiscellaneous
            ? timer.miscellaneousDescription || "Miscellaneous"
            : timer.taskId?.name || "a task";
    };

    // Stop current timer (used internally before starting new one)
    const stopCurrentTimer = async () => {
        if (!runningTimer?._id) return true;
        try {
            await timeEntriesApi.stopTimer(runningTimer._id);
            queryClient.invalidateQueries({ queryKey: ["running-timer"] });
            setRunningTimer(null);
            return true;
        } catch {
            toast({
                title: "Error",
                description: "Failed to stop current timer",
                type: "destructive",
            });
            return false;
        }
    };

    // Handler: Start timer with confirmation if needed
    const handleStartTimer = async (timerData) => {
        // Check for existing timer
        if (runningTimer) {
            const confirmed = window.confirm(
                `A timer is already ${isPaused ? "paused" : "running"} for "${getTimerName(runningTimer)}". Stop it and start a new one?`
            );
            if (!confirmed) return false;
            const stopped = await stopCurrentTimer();
            if (!stopped) return false;
        }
        startTimerMutation.mutate(timerData);
        return true;
    };

    // Handler: Start timer for task with confirmation
    const handleStartTimerForTask = async (taskId, taskData = null) => {
        if (!employeeId) {
            toast({
                title: "Error",
                description: "Employee ID not found",
                type: "destructive",
            });
            return false;
        }

        // If task data is provided and user is an employee, validate assignment
        if (taskData && user?.role === 'EMPLOYEE') {
            const assignedIds = Array.isArray(taskData.assignedTo)
                ? taskData.assignedTo.map((emp) => emp._id || emp)
                : taskData.assignedTo
                    ? [taskData.assignedTo._id || taskData.assignedTo]
                    : [];

            if (assignedIds.length > 0 && !assignedIds.includes(employeeId)) {
                toast({
                    title: "Error",
                    description: "This task is not assigned to you",
                    type: "destructive",
                });
                return false;
            }
        }

        // Check for existing timer
        if (runningTimer) {
            const confirmed = window.confirm(
                `A timer is already ${isPaused ? "paused" : "running"} for "${getTimerName(runningTimer)}". Stop it and start a new one?`
            );
            if (!confirmed) return false;
            const stopped = await stopCurrentTimer();
            if (!stopped) return false;
        }
        startTimerForTaskMutation.mutate({ taskId, employeeId });
        return true;
    };

    // Handler: Pause timer
    const handlePauseTimer = () => {
        if (runningTimer?._id) {
            pauseTimerMutation.mutate(runningTimer._id);
        }
    };

    // Handler: Resume timer
    const handleResumeTimer = () => {
        if (runningTimer?._id) {
            resumeTimerMutation.mutate(runningTimer._id);
        }
    };

    // Handler: Stop timer with confirmation
    const handleStopTimer = (withConfirmation = true) => {
        if (!runningTimer?._id) return;
        if (withConfirmation) {
            if (!window.confirm("Are you sure you want to stop the timer?")) return;
        }
        stopTimerMutation.mutate({ id: runningTimer._id });
    };

    // Handler: Complete timer (stop and mark task complete)
    const handleCompleteTimer = () => {
        if (!runningTimer?._id) return;
        if (!window.confirm("Stop timer and mark task as complete?")) return;
        stopTimerMutation.mutate({ id: runningTimer._id, markTaskComplete: true });
    };

    // Handler: Discard timer
    const handleDiscardTimer = () => {
        if (!runningTimer?._id) return;
        if (!window.confirm("Are you sure you want to discard this timer?")) return;
        stopTimerMutation.mutate({ id: runningTimer._id });
    };

    // Format elapsed time
    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    return {
        // State
        runningTimer,
        elapsedSeconds,
        isRunning,
        isPaused,
        employeeId,
        formattedTime: formatTime(elapsedSeconds),

        // Query states
        isLoading: startTimerMutation.isPending || stopTimerMutation.isPending,
        isStarting: startTimerMutation.isPending || startTimerForTaskMutation.isPending,
        isStopping: stopTimerMutation.isPending,
        isPausing: pauseTimerMutation.isPending,
        isResuming: resumeTimerMutation.isPending,

        // Handlers (with confirmation dialogs built-in)
        handleStartTimer,
        handleStartTimerForTask,
        handlePauseTimer,
        handleResumeTimer,
        handleStopTimer,
        handleCompleteTimer,
        handleDiscardTimer,

        // Raw mutations (for custom handling)
        startTimerMutation,
        startTimerForTaskMutation,
        stopTimerMutation,
        pauseTimerMutation,
        resumeTimerMutation,

        // Utilities
        formatTime,
        getTimerName,
        refetchTimer: refetch,
        stopCurrentTimer,
    };
};

