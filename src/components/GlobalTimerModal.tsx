import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { RootState, AppDispatch } from '@redux/store';
import { 
  startTimerThunk, 
  pauseTimerThunk, 
  hideTimerFor30Minutes, 
  showTimerImmediately,
  checkHiddenTimer,
  updateTimerSeconds,
  formatTimerDisplay,
  selectShowTimerNotification,
  selectIsTimerRunning,
  selectCurrentTask
} from '@redux/slices/timer';

export default function GlobalTimerModal() {
  const dispatch = useDispatch<AppDispatch>();
  
  // Redux state selectors
  const showNotification = useSelector(selectShowTimerNotification);
  const isTimerRunning = useSelector(selectIsTimerRunning);
  const currentTask = useSelector(selectCurrentTask);
  const { 
    timerStartTime, 
    currentTimerSeconds, 
    loading,
    error,
    isHidden,
    userId
  } = useSelector((state: RootState) => state.timer);
  
  // Local state for draggable functionality
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });

  // Timer interval effect to update current timer seconds
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTimerRunning && timerStartTime) {
      interval = setInterval(() => {
        const currentTime = new Date();
        const sessionSeconds = Math.floor((currentTime.getTime() - new Date(timerStartTime).getTime()) / 1000);
        dispatch(updateTimerSeconds(sessionSeconds));
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isTimerRunning, timerStartTime, dispatch]);

  // Check for hidden timer every minute
  useEffect(() => {
    if (!isHidden) return;
    
    const checkInterval = setInterval(() => {
      dispatch(checkHiddenTimer());
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [isHidden, dispatch]);

  // Handle timer toggle (start/pause)
  const handleTimerToggle = async () => {
    if (!currentTask) return;

    // Show notification immediately when user manually clicks Start/Pause Timer button
    // This overrides the 30-minute hide period
    dispatch(showTimerImmediately());
    
    if (isTimerRunning) {
      // Pause the timer
      await dispatch(pauseTimerThunk());
    } else {
      // Start the timer
      await dispatch(startTimerThunk({
        taskId: currentTask.id,
        taskName: currentTask.name,
        timeSheetData: currentTask.timeSheetData
      }));
    }
  };

  // Handle timer close (hide for 30 minutes)
  const handleTimerClose = () => {
    dispatch(hideTimerFor30Minutes());
  };

  // Draggable functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setRel({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    e.stopPropagation();
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - rel.x,
      y: e.clientY - rel.y,
    });
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  // Don't render if notification shouldn't be shown or no task
  if (!showNotification || !currentTask || !userId) {
    return null;
  }

  // Format the timer display using the utility function from timer slice
  const displayTime = formatTimerDisplay(
    currentTimerSeconds,
    currentTask.timeSheetData
  );

  return (
    <Box
      onMouseDown={handleMouseDown}
      sx={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 1500,
        display: "flex",
        alignItems: "start",
        bgcolor: "white",
        border: "1px solid #4caf50",
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        minWidth: 280,
        cursor: "move",
        // Add opacity when loading
        opacity: loading ? 0.7 : 1,
        pointerEvents: loading ? 'none' : 'auto',
      }}
    >
      {/* Play/Pause Button */}
      <IconButton 
        onClick={handleTimerToggle} 
        sx={{ color: "green", mr: 1 }}
        disabled={loading}
      >
        {isTimerRunning ? (
          <PauseCircleIcon sx={{ fontSize: 40 }} />
        ) : (
          <PlayArrowIcon sx={{ fontSize: 40 }} />
        )}
      </IconButton>

      {/* Content */}
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "12px",
            color: "#9D4141",
          }}
        >
          Timer Running
        </Typography>
        
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "14px",
            mt: "10px",
            mb: "5px",
          }}
        >
          Working on: {currentTask.name}
        </Typography>
        
        <Typography
          variant="caption"
          sx={{
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "13px",
            color: isTimerRunning ? "#1D5DE1" : "#ff9500",
          }}
        >
          {displayTime} {!isTimerRunning && "(PAUSED)"}
        </Typography>

        {/* Show error if any */}
        {error && (
          <Typography
            variant="caption"
            sx={{
              fontFamily: "Inter",
              fontWeight: 400,
              fontSize: "11px",
              color: "#dc3545",
              display: "block",
              mt: 0.5,
            }}
          >
            {error}
          </Typography>
        )}
      </Box>

      {/* Close Button */}
      <IconButton 
        size="large" 
        onClick={handleTimerClose}
        disabled={loading}
      >
        <CloseIcon fontSize="large" />
      </IconButton>
    </Box>
  );
}