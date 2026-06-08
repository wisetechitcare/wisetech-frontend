import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { createTimeSheet, updateTimeSheetById } from '@services/tasks';
import { warningNotification } from '@utils/modal';
import type { RootState } from '../store';

// TypeScript interfaces for timer state
export interface TimerTask {
  id: string;
  name: string;
  timeSheetData: any;
}

export interface TimerState {
  // Core timer state
  isRunning: boolean;
  currentTask: TimerTask | null;
  showNotification: boolean;
  isHidden: boolean;
  hiddenUntil: string | null; // ISO string for when to show again
  
  // Timer tracking
  timerStartTime: string | null; // ISO string
  currentTimerSeconds: number;
  
  // User context
  userId: string | null;
  
  // API state
  loading: boolean;
  error: string | null;
  
  // localStorage sync
  lastSyncTime: string | null;
}

const initialState: TimerState = {
  isRunning: false,
  currentTask: null,
  showNotification: false,
  isHidden: false,
  hiddenUntil: null,
  timerStartTime: null,
  currentTimerSeconds: 0,
  userId: null,
  loading: false,
  error: null,
  lastSyncTime: null,
};

// Utility functions for localStorage with multi-user support
const getStorageKey = (userId: string) => `timer-state-${userId}`;

const saveToLocalStorage = (state: TimerState, userId: string) => {
  try {
    if (!userId) return;
    
    const storageData = {
      isRunning: state.isRunning,
      currentTask: state.currentTask,
      showNotification: state.showNotification,
      isHidden: state.isHidden,
      hiddenUntil: state.hiddenUntil,
      timerStartTime: state.timerStartTime,
      currentTimerSeconds: state.currentTimerSeconds,
      userId,
      lastSyncTime: new Date().toISOString(),
    };
    
    localStorage.setItem(getStorageKey(userId), JSON.stringify(storageData));
  } catch (error) {
    console.error('Failed to save timer state to localStorage:', error);
  }
};

const loadFromLocalStorage = (userId: string): Partial<TimerState> | null => {
  try {
    if (!userId) return null;
    
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      const data = JSON.parse(stored);
      return data;
    }
  } catch (error) {
    console.error('Failed to load timer state from localStorage:', error);
  }
  return null;
};

const clearFromLocalStorage = (userId: string) => {
  try {
    if (!userId) return;
    localStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.error('Failed to clear timer state from localStorage:', error);
  }
};

// Async thunks for API operations
export const startTimerThunk = createAsyncThunk(
  'timer/startTimer',
  async (
    { taskId, taskName, timeSheetData }: { taskId: string; taskName: string; timeSheetData: any },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as RootState;
      const currentUserId = state.auth.currentUser?.id;
      
      if (!currentUserId) {
        return rejectWithValue('User not authenticated');
      }

      // Check for existing active timer on different task
      if (state.timer.isRunning && state.timer.currentTask?.id !== taskId) {
        await warningNotification(
          `You have an active timer running for "${state.timer.currentTask?.name}". Please pause that timer before starting a new one.`,
          "Active Timer Detected"
        );
        return rejectWithValue('Another timer is already running');
      }

      const currentTime = new Date();
      const updatedTimesheet = {
        ...timeSheetData,
        startTime: currentTime,
        endTime: null
      };

      let response;
      if (timeSheetData?.id) {
        // Update existing timesheet
        response = await updateTimeSheetById(timeSheetData.id, updatedTimesheet);
      } else {
        // Create new timesheet
        response = await createTimeSheet(updatedTimesheet);
        updatedTimesheet.id = response?.timeSheet?.id;
      }

      return {
        task: { id: taskId, name: taskName, timeSheetData: updatedTimesheet },
        startTime: currentTime.toISOString(),
        userId: currentUserId
      };
    } catch (error: any) {
      console.error('Error starting timer:', error);
      return rejectWithValue(error.message || 'Failed to start timer');
    }
  }
);

export const pauseTimerThunk = createAsyncThunk(
  'timer/pauseTimer',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const { currentTask, timerStartTime, currentTimerSeconds } = state.timer;
      
      if (!currentTask || !timerStartTime) {
        return rejectWithValue('No active timer to pause');
      }

      const currentTime = new Date();
      const sessionSeconds = Math.floor((currentTime.getTime() - new Date(timerStartTime).getTime()) / 1000);

      // Calculate existing logged time
      const existingHours = currentTask.timeSheetData.logTimeHours || 0;
      const existingMinutes = currentTask.timeSheetData.logTimeMinutes || 0;
      const existingSeconds = currentTask.timeSheetData.logTimeSeconds || 0;

      // Convert existing time to total seconds
      const existingTotalSeconds = (existingHours * 3600) + (existingMinutes * 60) + existingSeconds;

      // Add current session seconds to existing total
      const newTotalSeconds = existingTotalSeconds + sessionSeconds;

      // Convert back to hours, minutes, seconds
      const finalHours = Math.floor(newTotalSeconds / 3600);
      const finalMinutes = Math.floor((newTotalSeconds % 3600) / 60);
      const finalSecondsRemainder = newTotalSeconds % 60;

      const updatedTimesheet = {
        ...currentTask.timeSheetData,
        endTime: currentTime,
        logTimeHours: finalHours,
        logTimeMinutes: finalMinutes,
        logTimeSeconds: finalSecondsRemainder
      };

      // API call to update timesheet
      if (currentTask.timeSheetData.id) {
        await updateTimeSheetById(currentTask.timeSheetData.id, updatedTimesheet);
      } else {
        const response = await createTimeSheet(updatedTimesheet);
        updatedTimesheet.id = response?.timeSheet?.id;
      }

      return {
        updatedTimesheet,
        totalLoggedSeconds: newTotalSeconds
      };
    } catch (error: any) {
      console.error('Error pausing timer:', error);
      return rejectWithValue(error.message || 'Failed to pause timer');
    }
  }
);

export const loadTimerStateThunk = createAsyncThunk(
  'timer/loadState',
  async (userId: string, { rejectWithValue }) => {
    try {
      if (!userId) {
        return rejectWithValue('No user ID provided');
      }
      
      const storedState = loadFromLocalStorage(userId);
      if (!storedState) {
        return null;
      }

      // Check if timer should be shown (not hidden)
      let shouldShow = true;
      if (storedState.hiddenUntil) {
        const now = new Date();
        const hiddenUntil = new Date(storedState.hiddenUntil);
        shouldShow = now >= hiddenUntil;
      }

      return {
        ...storedState,
        isHidden: !shouldShow,
        showNotification: shouldShow && storedState.isRunning,
        hiddenUntil: shouldShow ? null : storedState.hiddenUntil
      };
    } catch (error: any) {
      console.error('Error loading timer state:', error);
      return rejectWithValue(error.message || 'Failed to load timer state');
    }
  }
);

// Timer slice
export const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    // Sync actions for immediate state updates
    setCurrentTask: (state, action: PayloadAction<{ taskId: string; taskName: string; timeSheetData: any }>) => {
      const { taskId, taskName, timeSheetData } = action.payload;
      state.currentTask = { id: taskId, name: taskName, timeSheetData };
    },

    updateTimerSeconds: (state, action: PayloadAction<number>) => {
      state.currentTimerSeconds = action.payload;
      // Auto-sync to localStorage every 10 seconds
      if (state.userId && action.payload % 10 === 0) {
        saveToLocalStorage(state, state.userId);
      }
    },

    hideTimerFor30Minutes: (state) => {
      const hiddenUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      state.isHidden = true;
      state.showNotification = false;
      state.hiddenUntil = hiddenUntil;
      
      if (state.userId) {
        saveToLocalStorage(state, state.userId);
      }
    },

    showTimerImmediately: (state) => {
      state.isHidden = false;
      state.hiddenUntil = null;
      if (state.isRunning) {
        state.showNotification = true;
      }
      
      if (state.userId) {
        saveToLocalStorage(state, state.userId);
      }
    },

    checkHiddenTimer: (state) => {
      if (state.hiddenUntil) {
        const now = new Date();
        const hiddenUntil = new Date(state.hiddenUntil);
        
        if (now >= hiddenUntil) {
          state.isHidden = false;
          state.hiddenUntil = null;
          if (state.isRunning) {
            state.showNotification = true;
          }
          
          if (state.userId) {
            saveToLocalStorage(state, state.userId);
          }
        }
      }
    },

    clearTimer: (state) => {
      const userId = state.userId;
      Object.assign(state, initialState);
      
      if (userId) {
        clearFromLocalStorage(userId);
      }
    },

    setUserId: (state, action: PayloadAction<string | null>) => {
      state.userId = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Start timer thunk
    builder
      .addCase(startTimerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startTimerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.isRunning = true;
        state.showNotification = true;
        state.isHidden = false;
        state.currentTask = action.payload.task;
        state.timerStartTime = action.payload.startTime;
        state.currentTimerSeconds = 0;
        state.userId = action.payload.userId;
        
        // Save to localStorage
        if (state.userId) {
          saveToLocalStorage(state, state.userId);
        }
      })
      .addCase(startTimerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('Start timer failed:', action.payload);
      });

    // Pause timer thunk
    builder
      .addCase(pauseTimerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(pauseTimerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.isRunning = false;
        state.timerStartTime = null;
        state.currentTimerSeconds = 0;
        
        // Update timesheet data in current task
        if (state.currentTask) {
          state.currentTask.timeSheetData = action.payload.updatedTimesheet;
        }
        
        // Save to localStorage
        if (state.userId) {
          saveToLocalStorage(state, state.userId);
        }
      })
      .addCase(pauseTimerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        console.error('Pause timer failed:', action.payload);
      });

    // Load timer state thunk
    builder
      .addCase(loadTimerStateThunk.fulfilled, (state, action) => {
        if (action.payload) {
          Object.assign(state, action.payload);
        }
      })
      .addCase(loadTimerStateThunk.rejected, (state, action) => {
        state.error = action.payload as string;
        console.error('Load timer state failed:', action.payload);
      });
  },
});

// Export actions
export const {
  setCurrentTask,
  updateTimerSeconds,
  hideTimerFor30Minutes,
  showTimerImmediately,
  checkHiddenTimer,
  clearTimer,
  setUserId,
  clearError,
} = timerSlice.actions;

// Selectors
export const selectTimer = (state: RootState) => state.timer;
export const selectIsTimerRunning = (state: RootState) => state.timer.isRunning;
export const selectCurrentTask = (state: RootState) => state.timer.currentTask;
export const selectShowTimerNotification = (state: RootState) => 
  state.timer.showNotification && !state.timer.isHidden;

// Helper function to format timer display
export const formatTimerDisplay = (
  currentSeconds: number,
  timeSheetData: any
): string => {
  const existingSeconds = (timeSheetData?.logTimeSeconds || 0);
  const existingMinutes = (timeSheetData?.logTimeMinutes || 0);
  const existingHours = (timeSheetData?.logTimeHours || 0);
  
  // Calculate total time including current session
  const totalSeconds = existingSeconds + currentSeconds;
  const totalMinutes = existingMinutes + Math.floor(totalSeconds / 60);
  const totalHours = existingHours + Math.floor(totalMinutes / 60);
  
  const displayHours = String(totalHours).padStart(2, '0');
  const displayMinutes = String(totalMinutes % 60).padStart(2, '0');
  const displaySecondsFormatted = String(totalSeconds % 60).padStart(2, '0');
  
  return `${displayHours}:${displayMinutes}:${displaySecondsFormatted}`;
};

export default timerSlice.reducer;