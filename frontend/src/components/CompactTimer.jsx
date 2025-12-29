import { Play, Pause, Square } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTimer } from "@/hooks/useTimer";

export const CompactTimer = () => {
  const navigate = useNavigate();

  const {
    runningTimer,
    formattedTime,
    isRunning,
    isPaused,
    employeeId,
    isPausing,
    isResuming,
    isStopping,
    handlePauseTimer,
    handleResumeTimer,
    handleStopTimer,
    getTimerName,
  } = useTimer();

  if (!employeeId || !runningTimer) {
    return null;
  }

  const timerName = getTimerName(runningTimer);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      {/* Status Indicator */}
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isRunning
            ? "bg-emerald-500 animate-pulse"
            : isPaused
            ? "bg-amber-500"
            : "bg-gray-300"
        }`}
      />

      {/* Timer Display */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm font-mono font-medium text-gray-900">
          {formattedTime}
        </span>
        <span className="text-xs text-gray-500 truncate max-w-[120px]">
          {timerName}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {isRunning ? (
          <button
            onClick={handlePauseTimer}
            disabled={isPausing}
            className="p-1 rounded-md hover:bg-amber-50 transition-colors"
            title="Pause"
          >
            <Pause className="h-4 w-4 text-amber-600" />
          </button>
        ) : isPaused ? (
          <button
            onClick={handleResumeTimer}
            disabled={isResuming}
            className="p-1 rounded-md hover:bg-emerald-50 transition-colors"
            title="Resume"
          >
            <Play className="h-4 w-4 text-emerald-600" />
          </button>
        ) : null}

        <button
          onClick={() => handleStopTimer()}
          disabled={isStopping}
          className="p-1 rounded-md hover:bg-red-50 transition-colors"
          title="Stop"
        >
          <Square className="h-4 w-4 text-red-600" />
        </button>

        <button
          onClick={() => navigate("/time-entries")}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors text-xs text-gray-600 font-medium"
          title="View Details"
        >
          View
        </button>
      </div>
    </div>
  );
};
