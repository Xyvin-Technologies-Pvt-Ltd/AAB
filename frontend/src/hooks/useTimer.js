import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queries/queryKeys";
import {
  useRunningTimer,
  useStartTimer,
  useStartTimerForTask,
  useStopTimer,
  usePauseTimer,
  useResumeTimer,
} from "@/api/queries/timeEntryQueries";
import { useAuthStore } from "@/store/authStore";
import { useTimerStore } from "@/store/timerStore";
import { useToast } from "@/hooks/useToast";
import { timeEntriesApi } from "@/api/timeEntries";

/**
 * Centralized timer hook for managing running timer state across the app.
 * Handles query syncing, mutations, and confirmation dialogs.
 */
export const useTimer = ({ trackElapsed = true } = {}) => {
    const { user } = useAuthStore();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const isInitialMount = useRef(true);

    const runningTimer = useTimerStore((s) => s.runningTimer);
    const isRunning = useTimerStore((s) => s.isRunning);
    const isPaused = useTimerStore((s) => s.isPaused);
    const setRunningTimer = useTimerStore((s) => s.setRunningTimer);
    const elapsedSeconds = useTimerStore((s) => (trackElapsed ? s.elapsedSeconds : 0));

    const employeeId = typeof user?.employeeId === 'object'
        ? user?.employeeId?._id
        : user?.employeeId;

    const { data: runningTimerData, dataUpdatedAt, refetch } = useRunningTimer(employeeId);

    useEffect(() => {
        const fetchedTimer = runningTimerData?.data;

        if (isInitialMount.current) {
            isInitialMount.current = false;
            if (fetchedTimer) {
                setRunningTimer(fetchedTimer);
            } else {
                setRunningTimer(null);
            }
            return;
        }

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

    const startTimerMutation = useStartTimer();
    const startTimerForTaskMutation = useStartTimerForTask();
    const stopTimerMutation = useStopTimer();
    const pauseTimerMutation = usePauseTimer();
    const resumeTimerMutation = useResumeTimer();

    const invalidateTimerQueries = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    };

    const getTimerName = (timer) => {
        if (!timer) return "";
        return timer.isMiscellaneous
            ? timer.miscellaneousDescription || "Miscellaneous"
            : timer.taskId?.name || "a task";
    };

    const stopCurrentTimer = async () => {
        if (!runningTimer?._id) return true;
        try {
            await timeEntriesApi.stopTimer(runningTimer._id);
            queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
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

    const handleStartTimer = async (timerData) => {
        if (runningTimer) {
            const confirmed = window.confirm(
                `A timer is already ${isPaused ? "paused" : "running"} for "${getTimerName(runningTimer)}". Stop it and start a new one?`
            );
            if (!confirmed) return false;
            const stopped = await stopCurrentTimer();
            if (!stopped) return false;
        }
        startTimerMutation.mutate(timerData, {
            onSuccess: (response) => {
                invalidateTimerQueries();
                if (response?.data) setRunningTimer(response.data);
            },
        });
        return true;
    };

    const handleStartTimerForTask = async (taskId, taskData = null) => {
        if (!employeeId) {
            toast({
                title: "Error",
                description: "Employee ID not found",
                type: "destructive",
            });
            return false;
        }

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

        if (runningTimer) {
            const confirmed = window.confirm(
                `A timer is already ${isPaused ? "paused" : "running"} for "${getTimerName(runningTimer)}". Stop it and start a new one?`
            );
            if (!confirmed) return false;
            const stopped = await stopCurrentTimer();
            if (!stopped) return false;
        }
        startTimerForTaskMutation.mutate({ taskId, employeeId }, {
            onSuccess: (response) => {
                invalidateTimerQueries();
                if (response?.data) setRunningTimer(response.data);
            },
        });
        return true;
    };

    const handlePauseTimer = () => {
        if (runningTimer?._id) {
            pauseTimerMutation.mutate(runningTimer._id, {
                onSuccess: (response) => {
                    if (response?.data) setRunningTimer(response.data);
                },
            });
        }
    };

    const handleResumeTimer = () => {
        if (runningTimer?._id) {
            resumeTimerMutation.mutate(runningTimer._id, {
                onSuccess: (response) => {
                    if (response?.data) setRunningTimer(response.data);
                },
            });
        }
    };

    const handleStopTimer = (withConfirmation = true) => {
        if (!runningTimer?._id) return;
        if (withConfirmation) {
            if (!window.confirm("Are you sure you want to stop the timer?")) return;
        }
        stopTimerMutation.mutate({ id: runningTimer._id }, {
            onSuccess: () => {
                invalidateTimerQueries();
                setRunningTimer(null);
            },
        });
    };

    const handleCompleteTimer = () => {
        if (!runningTimer?._id) return;
        if (!window.confirm("Stop timer and mark task as complete?")) return;
        stopTimerMutation.mutate({ id: runningTimer._id, markTaskComplete: true }, {
            onSuccess: () => {
                invalidateTimerQueries();
                setRunningTimer(null);
            },
        });
    };

    const handleDiscardTimer = () => {
        if (!runningTimer?._id) return;
        if (!window.confirm("Are you sure you want to discard this timer?")) return;
        stopTimerMutation.mutate({ id: runningTimer._id }, {
            onSuccess: () => {
                invalidateTimerQueries();
                setRunningTimer(null);
            },
        });
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    };

    return {
        runningTimer,
        elapsedSeconds,
        isRunning,
        isPaused,
        employeeId,
        formattedTime: formatTime(elapsedSeconds),
        isLoading: startTimerMutation.isPending || stopTimerMutation.isPending,
        isStarting: startTimerMutation.isPending || startTimerForTaskMutation.isPending,
        isStopping: stopTimerMutation.isPending,
        isPausing: pauseTimerMutation.isPending,
        isResuming: resumeTimerMutation.isPending,
        handleStartTimer,
        handleStartTimerForTask,
        handlePauseTimer,
        handleResumeTimer,
        handleStopTimer,
        handleCompleteTimer,
        handleDiscardTimer,
        startTimerMutation,
        startTimerForTaskMutation,
        stopTimerMutation,
        pauseTimerMutation,
        resumeTimerMutation,
        formatTime,
        getTimerName,
        refetchTimer: refetch,
        stopCurrentTimer,
    };
};
