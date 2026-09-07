import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from 'react-redux';
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopCircleIcon from "@mui/icons-material/StopCircle";

import { RootState, AppDispatch } from '@redux/store';
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { AnimatePresence, motion } from "framer-motion";
import NewTimeLogForm from '@app/pages/employee/timesheet/employeetimesheet/component/NewTimeLogForm';
import { useInvalidateTasks } from '@app/pages/employee/tasks/useTaskQueries';
import { 
  startTimerThunk, 
  pauseTimerThunk,
  stopTimerThunk,
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
  /** The just-stopped entry, held open for its description, attachments and progress. */
  const [reviewEntryId, setReviewEntryId] = useState<string | null>(null);
  const invalidateTasks = useInvalidateTasks();
  /**
   * Parked at the edge of the screen, still running.
   *
   * Distinct from the close button, which hides the banner for thirty minutes and forgets about
   * it. This is "get out of my way for a second": the card slides off to the right and leaves a
   * tab behind, and the tab brings it straight back. Local state, because it is a view
   * preference for this screen and not something the timer itself needs to know.
   */
  const [collapsed, setCollapsed] = useState(false);

  
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
  /**
   * Which side the timer parks on — decided by where the card actually IS, not by a constant.
   *
   * It always slid to the right, so a timer dragged to the left of the screen crossed the whole
   * viewport to hide, and came back from the wrong side. A minimised window should go to the
   * nearest edge, and the tab should reappear where the eye already is: the same horizontal half
   * it was dragged to, and the same vertical line it was left on.
   */
  const dockSide: "left" | "right" =
    position.x + 160 < window.innerWidth / 2 ? "left" : "right";
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

  /**
   * Stop — commit the elapsed time and END the session.
   *
   * Distinct from pause on purpose. Pause keeps `currentTask`, so resuming appends to the same
   * timesheet row; stop clears it, so the next start opens a new one. Without this, two separate
   * sittings on the same task merged into a single entry.
   */
  const handleTimerStop = async () => {
    if (!currentTask) return;
    // Read the entry id BEFORE stopping: `stopTimerThunk` clears `currentTask`, and the id is
    // what the review form needs.
    const entryId = currentTask.timeSheetData?.id ?? null;
    const result = await dispatch(stopTimerThunk());

    // Stopping used to end here — the widget vanished and the hours went into a row nobody was
    // ever shown, so nothing was ever written about what the time was spent on. The time IS
    // saved first (closing the form loses none of it); this opens it for the part only the
    // person can supply: what they did, what it produced, and how far the task got.
    // Same reason as the task panel's own stop: the entry's "running" state is the server's
    // null `endTime`, so anything showing it has to be refetched or it keeps ticking on screen.
    invalidateTasks();
    if (stopTimerThunk.fulfilled.match(result) && entryId) setReviewEntryId(entryId);
  };

  // Handle timer close — HIDES the banner for 30 minutes. It does NOT stop the timer, which is
  // why a separate stop control had to exist: closing the reminder is not finishing the work.
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

  // Don't render if notification shouldn't be shown or no task.
  //
  // The review form has to survive this: stopping CLEARS `currentTask`, so by the time the form
  // should appear the widget itself is already gone. Rendering it only inside the widget is why
  // stopping looked like the timer simply switched off.
  if (!showNotification || !currentTask || !userId) {
    return reviewEntryId ? (
      <NewTimeLogForm
        show
        timeSheetId={reviewEntryId}
        onClose={() => setReviewEntryId(null)}
      />
    ) : null;
  }

  // Format the timer display using the utility function from timer slice
  const displayTime = formatTimerDisplay(
    currentTimerSeconds,
    currentTask.timeSheetData
  );

  // One button size for every control on the banner. They were 40px, 34px and "large", which is
  // why the row read as three unrelated things rather than one set of controls.
  const controlSx = {
    width: 30,
    height: 30,
    borderRadius: "8px",
    flexShrink: 0,
  } as const;
  const ICON_SIZE = 20;

  return (
    <>
    {/* `mode="wait"` is what removes the flicker: by default AnimatePresence runs the exit and
        the entrance TOGETHER, so for a moment both the card and the tab were on screen. Waiting
        makes it one continuous movement — the card shrinks away, and only then does the tab
        arrive (and the reverse when it comes back). */}
    <AnimatePresence initial={false} mode="wait">
    {collapsed ? (
      // ── Parked: just the tab, against the right edge ──────────────────────
      <motion.div
        key="timer-tab"
        // The tab arrives AFTER the card has shrunk away — hence the delay — and it arrives
        // from its own edge, so the two read as one movement rather than two objects swapping.
        initial={{ x: dockSide === "right" ? 40 : -40, opacity: 0, scale: 0.6 }}
        animate={{ x: 0, opacity: 1, scale: 1 }}
        exit={{ x: dockSide === "right" ? 40 : -40, opacity: 0, scale: 0.6 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        style={{
          position: "fixed",
          ...(dockSide === "right" ? { right: 0 } : { left: 0 }),
          top: position.y,
          zIndex: 1500,
        }}
      >
        <span title={`Show the timer — ${displayTime}`}>
          <Box
            component="button"
            type="button"
            aria-label="Show the timer"
            onClick={() => setCollapsed(false)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 0.75,
              py: 1.25,
              border: "1px solid",
              borderColor: isTimerRunning ? "success.main" : "warning.main",
              // Flat against whichever edge it is docked to.
              ...(dockSide === "right"
                ? { borderRight: 0, borderRadius: "10px 0 0 10px" }
                : { borderLeft: 0, borderRadius: "0 10px 10px 0", flexDirection: "row-reverse" }),
              bgcolor: "background.paper",
              color: isTimerRunning ? "success.main" : "warning.main",
              boxShadow: 3,
              cursor: "pointer",
            }}
          >
            {/* An arrow, not an eye: this control MOVES the timer back onto the screen, and
                the direction it points is the direction it travels. The eye stays on the card,
                where the action really is "hide this". */}
            {/* An arrow, not an eye: this control MOVES the timer back onto the screen, and it
                points the way it will travel — inward from whichever edge it is parked on. */}
            {dockSide === "right"
              ? <ChevronLeftIcon sx={{ fontSize: 20 }} />
              : <ChevronRightIcon sx={{ fontSize: 20 }} />}
            {/* The elapsed time stays visible while parked: a hidden timer you cannot see
                running is how an afternoon ends up on one task. */}
            <Box
              component="span"
              sx={{ fontSize: 11, fontWeight: 700, writingMode: "vertical-rl", letterSpacing: "0.04em" }}
            >
              {displayTime}
            </Box>
          </Box>
        </span>
      </motion.div>
    ) : (
    <motion.div
      key="timer-card"
      // ── The genie / minimise ────────────────────────────────────────────
      // Three things at once, which is what makes it read as the window being SUCKED INTO the
      // tab rather than sliding off and something else appearing:
      //   • translate toward the edge it docks to,
      //   • scale 1 → 0.3, so it visibly shrinks into that point,
      //   • fade out over the first part of the travel (the `times` below), leaving the tab to
      //     fade in behind it.
      // `transformOrigin` is the docked edge, so the shrink converges ON the tab instead of on
      // the card's own middle.
      initial={{ opacity: 0, scale: 0.7, x: dockSide === "right" ? 40 : -40 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: 0,
        // Un-minimising is the genie in reverse: it grows OUT of the tab, so it gets its own
        // spring rather than the tween the exit uses.
        transition: { type: "spring", stiffness: 420, damping: 34 },
      }}
      exit={{
        opacity: [1, 0.35, 0],
        scale: [1, 0.62, 0.3],
        x: dockSide === "right"
          ? [0, (window.innerWidth - position.x) * 0.45, window.innerWidth - position.x]
          : [0, -position.x * 0.45, -position.x],
      }}
      transition={{
        type: "tween",
        ease: [0.4, 0, 0.2, 1],
        // Short, because nothing overlaps it any more: the tab waits for it to finish, so a
        // long exit is dead time rather than a richer animation.
        duration: 0.26,
        // Opacity is gone before the travel finishes; the shrink carries the rest.
        times: [0, 0.55, 1],
      }}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        zIndex: 1500,
        transformOrigin: dockSide === "right" ? "right center" : "left center",
      }}
    >
    <Box
      onMouseDown={handleMouseDown}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: isTimerRunning ? "success.main" : "warning.main",
        borderRadius: 2,
        px: 1,
        py: 0.75,
        boxShadow: 3,
        // Sized to its content instead of a fixed 280 with a three-line stack inside it.
        maxWidth: 320,
        cursor: "move",
        // Add opacity when loading
        opacity: loading ? 0.7 : 1,
        pointerEvents: loading ? 'none' : 'auto',
      }}
    >
      {/* Pause / resume — keeps the session OPEN, so resuming appends to the same timesheet.
          The hint is a `title` on a plain <span>, not MUI <Tooltip> and not `title` on the
          IconButton itself: importing Tooltip here threw "styled_default is not a function" at
          runtime and blanked the whole banner, and `title` on an MUI IconButton is lint-banned
          because it leaks to the DOM. A span does neither. */}
      <span title={isTimerRunning ? "Pause — keeps this session open" : "Resume"}>
        <IconButton
          onClick={handleTimerToggle}
          aria-label={isTimerRunning ? "Pause timer" : "Resume timer"}
          sx={{ ...controlSx, color: "green" }}
          disabled={loading}
        >
          {isTimerRunning ? (
            <PauseCircleIcon sx={{ fontSize: ICON_SIZE }} />
          ) : (
            <PlayArrowIcon sx={{ fontSize: ICON_SIZE }} />
          )}
        </IconButton>
      </span>

      {/* Stop — commits the time AND ends the session, so the next start opens a NEW entry.
          Before this existed there was only pause, so a finished task stayed attached to the
          timer and the next start silently appended to the same row. */}
      <span title="Stop — saves the time, then asks what you did">
        <IconButton
          onClick={handleTimerStop}
          aria-label="Stop timer"
          sx={{ ...controlSx, color: "error.main" }}
          disabled={loading}
        >
          <StopCircleIcon sx={{ fontSize: ICON_SIZE }} />
        </IconButton>
      </span>

      {/* Content — two lines, not four.
          It was an eyebrow, a task line and a time line each with their own margins, which is
          why the banner was tall and the pieces looked unrelated to each other. The state the
          eyebrow announced is already said by the colour of the time and by which control is
          showing, so it earns nothing. */}
      <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
        <Typography
          noWrap
          title={currentTask.name}
          sx={{ fontSize: 12, fontWeight: 600, color: "text.primary" }}
        >
          {currentTask.name}
        </Typography>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: isTimerRunning ? "success.main" : "warning.main",
          }}
        >
          {displayTime}{!isTimerRunning && " · paused"}
        </Typography>
        {error && (
          <Typography noWrap title={error} sx={{ fontSize: 10.5, color: "error.main" }}>
            {error}
          </Typography>
        )}
      </Box>

      {/* Park it at the edge. Not the same as closing: the clock keeps running and the tab
          stays on screen showing the elapsed time. */}
      <span title="Hide — parks the timer at the edge of the screen">
        <IconButton
          onClick={() => setCollapsed(true)}
          aria-label="Hide the timer"
          sx={{ ...controlSx, color: "text.secondary" }}
          disabled={loading}
        >
          <VisibilityOffIcon sx={{ fontSize: ICON_SIZE }} />
        </IconButton>
      </span>

      {/* Close — dismisses the banner for thirty minutes. The timer keeps running either way. */}
      <span title="Dismiss for 30 minutes">
        <IconButton
          onClick={handleTimerClose}
          aria-label="Dismiss the timer banner"
          sx={{ ...controlSx, color: "text.secondary" }}
          disabled={loading}
        >
          <CloseIcon sx={{ fontSize: ICON_SIZE }} />
        </IconButton>
      </span>

    </Box>
    </motion.div>
    )}
    </AnimatePresence>

    {/* The SAME form the task panel opens when its own timer stops. Task and project are
        already on the entry, so both arrive filled in. Outside the animated card on purpose:
        stopping removes that card, and a dialog inside it would go with it. */}
    {reviewEntryId && (
      <NewTimeLogForm
        show
        timeSheetId={reviewEntryId}
        onClose={() => setReviewEntryId(null)}
      />
    )}
    </>
  );
}