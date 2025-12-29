import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useTimerStore = create(
  subscribeWithSelector((set, get) => ({
    runningTimer: null,
    elapsedSeconds: 0,
    isRunning: false,
    isPaused: false,
    intervalId: null,

    setRunningTimer: (timer) => {
      if (timer) {
        // Calculate elapsed seconds based on accumulated seconds and current running time
        let elapsed = timer.accumulatedSeconds || 0;
        if (timer.isRunning && timer.timerStartedAt) {
          const startTime = new Date(timer.timerStartedAt);
          const now = new Date();
          const currentElapsed = Math.floor((now - startTime) / 1000);
          elapsed += currentElapsed;
        }
        set({
          runningTimer: timer,
          isRunning: timer.isRunning || false,
          isPaused: timer.isPaused || false,
          elapsedSeconds: elapsed,
        });
        // Start ticking if running, stop if paused
        if (timer.isRunning) {
          get().startTicking();
        } else {
          get().stopTicking();
        }
      } else {
        set({
          runningTimer: null,
          isRunning: false,
          isPaused: false,
          elapsedSeconds: 0,
        });
        get().stopTicking();
      }
    },

    startTimer: (timer) => {
      set({
        runningTimer: timer,
        isRunning: true,
        isPaused: false,
        elapsedSeconds: 0,
      });
      get().startTicking();
    },

    pauseTimer: (timer) => {
      // Use accumulated seconds directly
      let elapsed = timer.accumulatedSeconds || 0;
      set({
        runningTimer: timer,
        isRunning: false,
        isPaused: true,
        elapsedSeconds: elapsed,
      });
      get().stopTicking();
    },

    resumeTimer: (timer) => {
      set({
        runningTimer: timer,
        isRunning: true,
        isPaused: false,
      });
      get().startTicking();
    },

    stopTimer: () => {
      set({
        runningTimer: null,
        isRunning: false,
        isPaused: false,
        elapsedSeconds: 0,
      });
      get().stopTicking();
    },

    startTicking: () => {
      get().stopTicking(); // Clear any existing interval
      const intervalId = setInterval(() => {
        const { runningTimer } = get();
        if (runningTimer && runningTimer.isRunning) {
          const startTime = new Date(runningTimer.timerStartedAt);
          const now = new Date();
          const accumulated = runningTimer.accumulatedSeconds || 0;
          const currentElapsed = Math.floor((now - startTime) / 1000);
          set({ elapsedSeconds: accumulated + currentElapsed });
        }
      }, 1000);
      set({ intervalId });
    },

    stopTicking: () => {
      const { intervalId } = get();
      if (intervalId) {
        clearInterval(intervalId);
        set({ intervalId: null });
      }
    },

    updateElapsed: (seconds) => {
      set({ elapsedSeconds: seconds });
    },
  }))
);

