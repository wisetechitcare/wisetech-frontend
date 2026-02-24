import React, { useState, useEffect } from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

type CustomToastProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  currentWorkTime?: string; // formatted work time like "02:30:45"
  isTimerRunning?: boolean;
  onTimerToggle?: () => void;
  icon?: React.ReactNode;
};

export default function CustomToastNotification({
  open,
  onClose,
  title = "Notification",
  message = "Something happened...",
  currentWorkTime = "00:00:00",
  isTimerRunning = false,
  onTimerToggle,
  icon = <PauseCircleIcon />,
}: CustomToastProps) {

  // position state for drag
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [rel, setRel] = useState({ x: 0, y: 0 });


  // Remove countdown functionality - no useEffect needed for timer countdown
  

  // Remove formatTime function - using currentWorkTime prop instead

  const handlePauseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTimerToggle) {
      onTimerToggle();
    }
  };


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

  if (!open) return null;

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
      }}
    >
      {/* Play/Pause Button */}
      <IconButton onClick={handlePauseToggle} sx={{ color: "green", mr: 1 }}>
        {isTimerRunning ? <PauseCircleIcon sx={{ fontSize: 40 }} /> : <PlayArrowIcon sx={{ fontSize: 40 }} />}
      </IconButton>

      {/* Content */}
      <Box sx={{ flex: 1 }}>
        {title && (
          <Typography
            variant="subtitle2"
            sx={{
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: "12px",
              color: "#9D4141",
            }}
          >
            {title}
          </Typography>
        )}
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
          {message}
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
          {currentWorkTime} {!isTimerRunning && "(PAUSED)"}
        </Typography>
      </Box>

      {/* Close Button */}
      <IconButton size="large" onClick={onClose}>
        <CloseIcon fontSize="large" />
      </IconButton>
    </Box>
  );
}
