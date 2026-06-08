import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Button, Badge, Dropdown } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { getTaskById, createTimeSheet, updateTimeSheetById, updateTaskStatusById, updateTask } from '@services/tasks'; // Add updateTaskStatus service
import { warningNotification } from '@utils/modal';
import TaskOverview from './TaskOverview';
import TaskTimesheet from './TaskTimesheet';
import TaskForm from './TaskForm';
import { RootState, AppDispatch } from '@redux/store';
import { 
  startTimerThunk, 
  pauseTimerThunk, 
  setCurrentTask,
  selectIsTimerRunning,
  selectCurrentTask
} from '@redux/slices/timer';
import { getAllTasksStatus } from '@services/tasks';
import { Box, Chip } from '@mui/material';
// import CustomToastNotification from '../../components/notification/Notifications';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import ProjectTimeSheets from '@pages/employee/projects/project/components/ProjectTimeSheets';

type TabType = 'overview' | 'timesheet' | 'files' | 'activities';

const TaskDetails = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    
    // Redux state selectors
    const reduxIsTimerRunning = useSelector(selectIsTimerRunning);
    const reduxCurrentTask = useSelector(selectCurrentTask);
    
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [task, setTask] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    
    // Commented out local timer state - now using Redux
    // const [isTimerRunning, setIsTimerRunning] = useState(false);
    // const [showTimerNotification, setShowTimerNotification] = useState(false);
    const [taskStatus, setTaskStatus] = useState<any[]>([]);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [currTimeSheetData, setCurrTimeSheetData] = useState<any>({});
    const [previousTimeSheetLogPresent, setPreviousTimeSheetLogPresent] = useState(false);
    // const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
    // const [currentTimerSeconds, setCurrentTimerSeconds] = useState(0);
    // const [isNotificationHidden, setIsNotificationHidden] = useState(false);

    // Commented out localStorage utility functions - now handled in Redux slice
    // const TIMER_STORAGE_KEY = 'active-timer-notification';

    // interface TimerNotificationState {
    //     timesheetId: string | null;
    //     taskId: string;
    //     taskName: string;
    //     isTimerRunning: boolean;
    //     timerStartTime: string; // ISO string
    //     hiddenUntil: string | null; // ISO string for when to show again
    //     timeSheetData: any;
    //     currentTimerSeconds: number;
    // }

    // const saveTimerStateToStorage = (state: Partial<TimerNotificationState>) => {
    //     try {
    //         const existingState = loadTimerStateFromStorage();
    //         const updatedState = { ...existingState, ...state };
    //         localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(updatedState));
    //         console.log('Timer state saved to localStorage:', updatedState);
    //     } catch (error) {
    //         console.error('Failed to save timer state to localStorage:', error);
    //     }
    // };

    // const loadTimerStateFromStorage = (): TimerNotificationState | null => {
    //     try {
    //         const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    //         if (stored) {
    //             const state = JSON.parse(stored) as TimerNotificationState;
    //             console.log('Timer state loaded from localStorage:', state);
    //             return state;
    //         }
    //     } catch (error) {
    //         console.error('Failed to load timer state from localStorage:', error);
    //     }
    //     return null;
    // };

    // const clearTimerFromStorage = () => {
    //     try {
    //         localStorage.removeItem(TIMER_STORAGE_KEY);
    //         console.log('Timer state cleared from localStorage');
    //     } catch (error) {
    //         console.error('Failed to clear timer state from localStorage:', error);
    //     }
    // };

    // const hideTimerFor30Minutes = () => {
    //     const hiddenUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes from now
    //     saveTimerStateToStorage({ hiddenUntil });
    //     setIsNotificationHidden(true);
    //     setShowTimerNotification(false);
    //     console.log('Timer hidden until:', hiddenUntil);
    // };

    // const checkIfShouldShowTimer = (): boolean => {
    //     const storedState = loadTimerStateFromStorage();
    //     if (!storedState || !storedState.hiddenUntil) return true;
        
    //     const now = new Date();
    //     const hiddenUntil = new Date(storedState.hiddenUntil);
        
    //     if (now >= hiddenUntil) {
    //         // Remove hiddenUntil from storage as it's time to show again
    //         saveTimerStateToStorage({ hiddenUntil: null });
    //         return true;
    //     }
    //     return false;
    // };

    // const checkForExistingActiveTimer = (): boolean => {
    //     const storedState = loadTimerStateFromStorage();
    //     if (!storedState) return false;
        
    //     // Only consider it active if it's running and for a different task
    //     if (storedState.isTimerRunning && storedState.taskId !== taskId) {
    //         return true;
    //     }
    //     return false;
    // };

    // const handlePermanentTimerStop = () => {
    //     // This function would be called when user wants to permanently stop the timer
    //     // For now, it's prepared for future use
    //     clearTimerFromStorage();
    //     setIsTimerRunning(false);
    //     setShowTimerNotification(false);
    //     setIsNotificationHidden(false);
    //     setTimerStartTime(null);
    //     setCurrentTimerSeconds(0);
    //     console.log('Timer permanently stopped and cleared from storage');
    // };

    const tabs = [
        { key: 'overview', label: 'Overview' },
        { key: 'timesheet', label: 'Timesheet' },
        // { key: 'files', label: 'Files' },
        // { key: 'activities', label: 'Activities' },
    ];

    const fetchTaskDetails = async () => {
        if (!taskId) {
            setError('No task ID provided');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await getTaskById(taskId);
            const statusResponse = await getAllTasksStatus();
            const taskDetails = response.data.task;
            setTask(response.data.task);
            setTaskStatus(statusResponse.taskStatuses);
            const timesheets = taskDetails?.timesheets;
            
            // Find if there's an active/incomplete timesheet (no endTime)
            // const activeTimesheet = timesheets?.find((ts: any) => !ts.endTime);
            
            let logHours = timesheets?.reduce((total: any, timesheet: any) => total + Number(timesheet?.logTimeHours || 0), 0) || 0;
            let logMinutes = timesheets?.reduce((total: any, timesheet: any) => total + Number(timesheet?.logTimeMinutes || 0), 0) || 0;
            let logSeconds = timesheets?.reduce((total: any, timesheet: any) => total + Number(timesheet?.logTimeSeconds || 0), 0) || 0;

            let prevTimeSheetData = timesheets?.length > 0 ? timesheets[0] : null;
            
            const timeSheetData = {
                // If there's an active timesheet, use its id, otherwise create new
                ...(timesheets?.length > 0 && { id: timesheets[0].id }),
                projectId: prevTimeSheetData?.projectId || taskDetails?.projectId,
                taskId : prevTimeSheetData?.taskId || taskId,
                employeeId: prevTimeSheetData?.employeeId || taskDetails?.assignedToId,
                startTime: new Date(),
                endTime: null,
                billable: prevTimeSheetData?.billable || (taskDetails?.billingType === "BILLABLE" ? true : false),
                logTimeHours: logHours || 0,
                logTimeMinutes: logMinutes || 0,
                logTimeSeconds: logSeconds || 0,
            }
            
            // If there's an active timesheet, set timer as running
            // if (activeTimesheet) {
            //     setIsTimerRunning(true);
            //     setShowTimerNotification(true);
            //     setTimerStartTime(new Date(activeTimesheet.startTime));
            // }
            setPreviousTimeSheetLogPresent(timesheets?.length > 0);
            setCurrTimeSheetData(timeSheetData);
            setError(null);
        } catch (err) {
            console.error('Error fetching task details:', err);
            setError('Failed to load task details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetails();
    }, [taskId]);

    // Set current task in Redux when task data is loaded
    useEffect(() => {
        if (task && taskId && currTimeSheetData) {
            const taskData = {
                taskId: taskId,
                taskName: task.taskName || task.title || task.name || 'Task',
                timeSheetData: currTimeSheetData
            };
            
            // Only update Redux if this task is different from current Redux task
            if (!reduxCurrentTask || reduxCurrentTask.id !== taskId) {
                dispatch(setCurrentTask(taskData));
            }
        }
    }, [task, taskId, currTimeSheetData, reduxCurrentTask, dispatch]);

    // Commented out local timer useEffect hooks - now handled in Redux
    // // useEffect to restore timer state from localStorage on component mount
    // useEffect(() => {
    //     const storedState = loadTimerStateFromStorage();
    //     if (storedState && storedState.taskId === taskId) {
    //         console.log('Restoring timer state for task:', taskId);
            
    //         // Restore timer state
    //         setIsTimerRunning(storedState.isTimerRunning);
    //         setCurrentTimerSeconds(storedState.currentTimerSeconds || 0);
            
    //         if (storedState.timerStartTime) {
    //             setTimerStartTime(new Date(storedState.timerStartTime));
    //         }
            
    //         // Check if notification should be shown (not hidden)
    //         const shouldShow = checkIfShouldShowTimer();
    //         if (shouldShow && storedState.isTimerRunning) {
    //             setShowTimerNotification(true);
    //             setIsNotificationHidden(false);
    //         } else {
    //             setIsNotificationHidden(true);
    //             setShowTimerNotification(false);
    //         }
            
    //         // Restore timesheet data if available
    //         if (storedState.timeSheetData) {
    //             setCurrTimeSheetData(storedState.timeSheetData);
    //         }
    //     }
    // }, [taskId]);

    // // Interval to check if hidden timer should show again every minute
    // useEffect(() => {
    //     if (!isNotificationHidden) return;
        
    //     const checkInterval = setInterval(() => {
    //         const shouldShow = checkIfShouldShowTimer();
    //         if (shouldShow) {
    //             console.log('30 minutes passed, showing timer notification again');
    //             setIsNotificationHidden(false);
    //             if (isTimerRunning) {
    //                 setShowTimerNotification(true);
    //             }
    //         }
    //     }, 60000); // Check every minute
        
    //     return () => clearInterval(checkInterval);
    // }, [isNotificationHidden, isTimerRunning]);

    // // Timer effect to update current timer seconds
    // useEffect(() => {
    //     let interval: NodeJS.Timeout | null = null;
        
    //     if (isTimerRunning && timerStartTime) {
    //         interval = setInterval(() => {
    //             const currentTime = new Date();
    //             const sessionSeconds = Math.floor((currentTime.getTime() - timerStartTime.getTime()) / 1000);
    //             setCurrentTimerSeconds(sessionSeconds);
                
    //             // Update localStorage every 10 seconds to prevent data loss
    //             if (sessionSeconds % 10 === 0) {
    //                 saveTimerStateToStorage({
    //                     currentTimerSeconds: sessionSeconds,
    //                     timerStartTime: timerStartTime.toISOString()
    //                 });
    //             }
    //         }, 1000);
    //     } else {
    //         if (interval) {
    //             clearInterval(interval);
    //         }
    //     }

    //     return () => {
    //         if (interval) {
    //             clearInterval(interval);
    //         }
    //     };
    // }, [isTimerRunning, timerStartTime]);

    const handleBackClick = () => {
        navigate(-1);
    };


    const handleEditClick = () => {
        console.log('Edit task:', task?.id);
        setIsEdit(true);
        setShowTaskModal(true);
    };

    const handleTaskModalClose = () => {
        setShowTaskModal(false);
        setIsEdit(false);
    };

    const handleTaskSubmitSuccess = (taskData: any) => {
        console.log('Task submitted:', taskData); 
        fetchTaskDetails(); // Refresh task data
        handleTaskModalClose();
    };

    // New Redux-based timer toggle function
    const handleTimerToggle = async () => {
        if (!taskId || !task) return;
        
        if (reduxIsTimerRunning) {
            // Pause the timer using Redux action
            const result = await dispatch(pauseTimerThunk());
            if (pauseTimerThunk.fulfilled.match(result)) {
                // Refresh task data after successful pause
                fetchTaskDetails();
            } else {
                console.error('Error pausing timer:', result.payload);
            }
        } else {
            // Start the timer using Redux action
            const taskData = {
                taskId: taskId,
                taskName: task.taskName || task.title || task.name || 'Task',
                timeSheetData: currTimeSheetData
            };
            
            const result = await dispatch(startTimerThunk(taskData));
            if (startTimerThunk.fulfilled.match(result)) {
                // Refresh task data after successful start
                fetchTaskDetails();
            } else {
                console.error('Error starting timer:', result.payload);
            }
        }
    };

    // Commented out original timer toggle function - now using Redux
    // const handleTimerToggle = async () => {
    //     // Show notification immediately when user manually clicks Start/Pause Timer button
    //     // This overrides the 30-minute hide period
    //     setIsNotificationHidden(false);
    //     setShowTimerNotification(true);
        
    //     // Clear any hiddenUntil timestamp from storage since user manually interacted
    //     const storedState = loadTimerStateFromStorage();
    //     if (storedState && storedState.hiddenUntil) {
    //         saveTimerStateToStorage({ hiddenUntil: null });
    //         console.log('Manual timer interaction detected - showing notification immediately');
    //     }
        
    //     // Check for existing active timer on different task before starting
    //     if (!isTimerRunning) {
    //         const hasActiveTimer = checkForExistingActiveTimer();
    //         if (hasActiveTimer) {
    //             const storedState = loadTimerStateFromStorage();
    //             await warningNotification(
    //                 `You have an active timer running for "${storedState?.taskName}". Please pause that timer before starting a new one.`,
    //                 "Active Timer Detected"
    //             );
    //             // No bypass option - user MUST pause the existing timer
    //             return;
    //         }
    //     }

    //     if (isTimerRunning) {
    //         // on pause -> logs hours, minutes, seconds will be added to the current Values & endTime will be set to current time
    //         try {
    //             const currentTime = new Date();
    //             const sessionSeconds = Math.floor((currentTime.getTime() - (timerStartTime?.getTime() || 0)) / 1000);
                
    //             // Get existing logged time
    //             const existingHours = currTimeSheetData.logTimeHours || 0;
    //             const existingMinutes = currTimeSheetData.logTimeMinutes || 0;
    //             const existingSeconds = currTimeSheetData.logTimeSeconds || 0;
                
    //             // Convert existing time to total seconds
    //             const existingTotalSeconds = (existingHours * 3600) + (existingMinutes * 60) + existingSeconds;
                
    //             // Add current session seconds to existing total
    //             const newTotalSeconds = existingTotalSeconds + sessionSeconds;
                
    //             // Convert back to hours, minutes, seconds
    //             const finalHours = Math.floor(newTotalSeconds / 3600);
    //             const finalMinutes = Math.floor((newTotalSeconds % 3600) / 60);
    //             const finalSeconds = newTotalSeconds % 60;
                
    //             const updatedTimesheet = {
    //                 ...currTimeSheetData,
    //                 endTime: currentTime,
    //                 logTimeHours: finalHours,
    //                 logTimeMinutes: finalMinutes,
    //                 logTimeSeconds: finalSeconds
    //             };

    //             // Check if current timesheet exists (has id)
    //             if (currTimeSheetData.id) {
    //                 // Update existing timesheet
    //                 console.log("pausingTimeSheet:: ",updatedTimesheet);
    //                 await updateTimeSheetById(currTimeSheetData.id, updatedTimesheet);
    //             } else {
    //                 // Create new timesheet
    //                 console.log("pausingNewTimeSheet:: ",updatedTimesheet);
    //                 const response = await createTimeSheet(updatedTimesheet);
    //                 setCurrTimeSheetData({ ...updatedTimesheet});
    //             }
                
    //             // Reset timer states
    //             setIsTimerRunning(false);
    //             // setShowTimerNotification(false);
    //             setTimerStartTime(null);
    //             setCurrentTimerSeconds(0);
                
    //             // Update localStorage with paused state
    //             saveTimerStateToStorage({
    //                 timesheetId: currTimeSheetData.id || updatedTimesheet.id,
    //                 taskId: taskId!,
    //                 taskName: task?.taskName || task?.title || 'Task',
    //                 isTimerRunning: false,
    //                 timerStartTime: '', // Clear start time when paused
    //                 timeSheetData: updatedTimesheet,
    //                 currentTimerSeconds: 0
    //             });
                
    //             // Refresh task data to show updated timesheet
    //             fetchTaskDetails();
    //         } catch (error) {
    //             console.error('Error updating timesheet:', error);
    //             setError('Failed to save timesheet. Please try again.');
    //         }
    //     } else {
    //         // on start -> startTime will be set to current time, endTime will be set to null
    //         try {
    //             const currentTime = new Date();
    //             const updatedTimesheet = {
    //                 ...currTimeSheetData,
    //                 startTime: currentTime,
    //                 endTime: null
    //             };

    //             // Check if current timesheet exists (has id)
    //             if (currTimeSheetData?.id) {
    //                 // Update existing timesheet with new start time
    //                 console.log("startingPausedTimeSheet:: ",updatedTimesheet);
                    
    //                 await updateTimeSheetById(currTimeSheetData.id, updatedTimesheet);
    //             } else {
    //                 // Create new timesheet
    //                 console.log("startingNewTimeSheet:: ",updatedTimesheet);
    //                 const response = await createTimeSheet(updatedTimesheet);
    //                 console.log("response:: ",response);
    //                 setCurrTimeSheetData({ ...updatedTimesheet, id: response?.timeSheet?.id });
    //             }
                
    //             // Set timer states
    //             setIsTimerRunning(true);
    //             setShowTimerNotification(true);
    //             setTimerStartTime(currentTime);
    //             setCurrentTimerSeconds(0);
                
    //             // Update localStorage with running state
    //             saveTimerStateToStorage({
    //                 timesheetId: currTimeSheetData?.id || updatedTimesheet.id,
    //                 taskId: taskId!,
    //                 taskName: task?.taskName || task?.title || 'Task',
    //                 isTimerRunning: true,
    //                 timerStartTime: currentTime.toISOString(),
    //                 timeSheetData: updatedTimesheet,
    //                 currentTimerSeconds: 0
    //             });
    //         } catch (error) {
    //             console.error('Error creating/updating timesheet:', error);
    //             setError('Failed to start timer. Please try again.');
    //         }
    //     }
    // };

    // Commented out timer helper functions - now handled in Redux slice and GlobalTimerModal
    // const handleTimerClose = () => {
    //     // Hide timer for 30 minutes instead of permanently closing
    //     hideTimerFor30Minutes();
        
    //     // Comment out permanent close logic - timer continues running in background
    //     // setShowTimerNotification(false);
    //     // setIsTimerRunning(false);
    // };

    // // Format timer display with existing logged time + current session time
    // const formatTimerDisplay = () => {
    //     const existingSeconds = (currTimeSheetData.logTimeSeconds || 0);
    //     const existingMinutes = (currTimeSheetData.logTimeMinutes || 0);
    //     const existingHours = (currTimeSheetData.logTimeHours || 0);
        
    //     // Calculate total time including current session
    //     const totalSeconds = existingSeconds + currentTimerSeconds;
    //     const totalMinutes = existingMinutes + Math.floor(totalSeconds / 60);
    //     const totalHours = existingHours + Math.floor(totalMinutes / 60);
        
    //     const displayHours = String(totalHours).padStart(2, '0');
    //     const displayMinutes = String(totalMinutes % 60).padStart(2, '0');
    //     const displaySeconds = String(totalSeconds % 60).padStart(2, '0');
        
    //     return `Time: ${displayHours}:${displayMinutes}:${displaySeconds}`;
    // };

    // // Get current work time for notification (just the time part)
    // const getCurrentWorkTime = () => {
    //     const existingSeconds = (currTimeSheetData.logTimeSeconds || 0);
    //     const existingMinutes = (currTimeSheetData.logTimeMinutes || 0);
    //     const existingHours = (currTimeSheetData.logTimeHours || 0);
        
    //     // Calculate total time including current session
    //     const totalSeconds = existingSeconds + currentTimerSeconds;
    //     const totalMinutes = existingMinutes + Math.floor(totalSeconds / 60);
    //     const totalHours = existingHours + Math.floor(totalMinutes / 60);
        
    //     const displayHours = String(totalHours).padStart(2, '0');
    //     const displayMinutes = String(totalMinutes % 60).padStart(2, '0');
    //     const displaySeconds = String(totalSeconds % 60).padStart(2, '0');
        
    //     return `${displayHours}:${displayMinutes}:${displaySeconds}`;
    // };

    const handleStatusChange = async (newStatusId: string) => {
        if (!task || isUpdatingStatus) return;

        setIsUpdatingStatus(true);
        try {
            // Check if the new status is "completed"
            const newStatus = taskStatus.find(status => status.id === newStatusId);
            const isCompletedStatus = newStatus?.name?.toLowerCase() === 'completed';

            // Prepare payload with completionDate if marking as completed
            const payload: any = { statusId: newStatusId };
            if (isCompletedStatus) {
                payload.completionDate = new Date().toISOString();
            }

            const response = await updateTask(task.id, payload);

            if (response.data && response.data.task) {
                setTask(response.data.task);
            } else {
                setTask((prevTask:any) => ({
                    ...prevTask,
                    status: newStatus,
                    ...(isCompletedStatus && { completionDate: new Date().toISOString() })
                }));
            }

        } catch (error) {
            console.error('Error updating task status:', error);
            setError('Failed to update task status. Please try again.');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    type TaskStatus = string | { name?: string; color?: string } | null | undefined;

    const getStatusColor = (status: TaskStatus) => {
        if (!status) return '#6c757d';
        // If API returns an object with a color, prefer that directly
        if (typeof status === 'object' && status?.color) {
            return status.color;
        }
        const value = typeof status === 'string' ? status : typeof status === 'object' ? status?.name : undefined;
        const statusLower = (value || '').toString().toLowerCase();
        switch (statusLower) {
            case 'ongoing':
                return '#ff9500';
            case 'completed':
                return '#28a745';
            case 'pending':
                return '#ffc107';
            case 'overdue':
                return '#dc3545';
            default:
                return '#6c757d';
        }
    };

    const renderTabContent = () => {
        if (isLoading) {
            return (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="alert alert-danger">
                    {error}
                </div>
            );
        }

        if (!task) {
            return (
                <div className="alert alert-info">
                    Task not found.
                </div>
            );
        }

        switch (activeTab) {
            case 'overview':
                return <TaskOverview task={task} />;
            case 'timesheet':
                return <TaskTimesheet taskId={task.id} task={task} fetchMode="task" />;
            // case 'files':
            //     return <div className="p-4">Files content coming soon...</div>;
            // case 'activities':
            //     return <div className="p-4">Activities content coming soon...</div>;
            default:
                return null;
        }
    };

    const getCurrentStatusName = () => {
        if (typeof task?.status === 'object') {
            return task?.status?.name || 'Ongoing';
        }
        return task?.status || 'Ongoing';
    };

    const getCurrentStatusId = () => {
        if (typeof task?.status === 'object') {
            return task?.status?.id;
        }
        return task?.status;
    };

    if (isLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column flex-root">
            <div className="content d-flex flex-column flex-column-fluid">
                <div className="container-fluid ">
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-6 flex-wrap">
                        <div className="d-flex align-items-center">
                            <Button
                                variant="link"
                                onClick={handleBackClick}
                                className="btn btn-icon btn-active-color-primary me-3 p-0"
                                style={{ border: 'none', background: 'none' }}
                            >
                                <img src={miscellaneousIcons?.leftArrow} alt="Task Details"  style={{width:'35px', height:'35px'}}/>
                            </Button>
                            <div>
                                <div className="text-muted fs-7 mb-1">
                                Task #{(task?.taskNumber || taskId)?.slice(0, 5)}
                                </div>
                                <h1 className="fs-2 fw-bold mb-0">
                                    {task?.taskName || task?.title || task?.name || 'Task Details'}
                                </h1>
                            </div>
                        </div>

                                {/* <div className="d-flex align-items-center gap-3 flex-wrap">
                                    <div className="d-flex align-items-center">
                                        <span className="text-muted me-2">Status</span>
                                        <Chip
                                            label={(typeof task?.status === 'object' ? task?.status?.name : task?.status) || 'Ongoing'}
                                            style={{
                                                backgroundColor: getStatusColor(task?.status as any),
                                                color: 'white',
                                                fontWeight: '500',
                                                fontSize: '12px',
                                                height: '28px'
                                            }}
                                        />
                                    </div> */}
                        <div className="d-flex align-items-center gap-3 flex-wrap">
                            <div className="d-flex align-items-center">
                                <span className="text-muted me-2">Status</span>

                                {/* Status Dropdown */}
                                <Dropdown>
                                    <Dropdown.Toggle
                                        variant="outline-primary"
                                        id="status-dropdown"
                                        disabled={isUpdatingStatus}
                                        style={{
                                            backgroundColor: getStatusColor(task?.status as any),
                                            color: 'white',
                                            border: 'none',
                                            fontWeight: '500',
                                            fontSize: '12px',
                                            height: '32px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0 12px'
                                        }}
                                    >
                                         {isUpdatingStatus ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Updating...
                                            </>
                                        ) : (
                                            getCurrentStatusName()
                                        )}
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu>
                                        {taskStatus.map((status) => (
                                            <Dropdown.Item
                                                key={status.id}
                                                onClick={() => handleStatusChange(status.id)}
                                                active={getCurrentStatusId() === status.id}
                                                disabled={getCurrentStatusId() === status.id}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <div
                                                        className="rounded-circle me-2"
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            backgroundColor: status.color || getStatusColor(status.name)
                                                        }}
                                                    ></div>
                                                    {status.name}
                                                    {getCurrentStatusId() === status.id && (
                                                        <span className="ms-auto">
                                                            <KTIcon iconName="check" className="fs-6" />
                                                        </span>
                                                    )}
                                                </div>
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                </Dropdown>
                                </div>
                                <Button
                                    variant="outline-primary"
                                    className="btn btn-primary"
                                    onClick={handleTimerToggle}
                                >
                                    {reduxIsTimerRunning ? 'Pause Timer' : 'Start Timer'}
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={handleEditClick}
                                    className="btn btn-primary"
                                >
                                    Edit
                                </Button>
                        </div>
                    </div>

                    {/* Description */}
                    {task?.description && (
                        <div className="mb-6">
                            <h6 className="fw-bold mb-2">Description</h6>
                            <p className="text-muted mb-0">{task.description}</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className='pl-3'>
                        <div className="card-header border-0 pt-2">
                            <ul className="nav nav-tabs nav-line-tabs nav-stretch fs-6 border-0">
                                {tabs.map((tab) => (
                                    <li key={tab.key} className="nav-item" style={{height: '40px'}}>
                                        <button
                                            className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
                                            onClick={() => setActiveTab(tab.key as TabType)}
                                            style={{
                                                all: 'unset', 
                                                display: 'inline-block',
                                                cursor: 'pointer',
                                                color: activeTab === tab.key ? '#9D4141' : '#6c757d',
                                                border: activeTab === tab.key ? '2px solid #9D4141' : '2px solid #6c757d',
                                                fontWeight: activeTab === tab.key ? '600' : '400',
                                                padding: '0 22px', 
                                                lineHeight: '1',    
                                                borderRadius: '50px',
                                                paddingBlock: '0',
                                                transition: 'all 0.2s ease-in-out',
                                                marginLeft: '10px',
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="card-body pt-0">
                            {renderTabContent()}
                        </div>
                    </div>
                </div>
            </div>

            {showTaskModal && (
                <TaskForm
                    open={showTaskModal}
                    onClose={handleTaskModalClose}
                    onSubmit={handleTaskSubmitSuccess}
                    isEdit={isEdit}
                    selectedTask={task}
                    title={isEdit ? "Edit Task" : "Add New Task"}
                    // headerName={isEdit ? "Edit Task" : "Create New Task"}
                    taskType={task?.taskType || 'PRESETS'}
                    taskName={task?.taskName || ''}
                    taskDescription={task?.taskDescription || ''}
                    chooseProject={task?.project?.id || ''}
                    assignTo={task?.assignedTo?.id || ''}
                    status={task?.status?.id || ''}
                    priority={task?.priority?.id || ''}
                    billable={task?.billingType ?? 'BILLABLE'}
                    startDate={task?.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''}
                    dueDate={task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                    startTime={task?.startTime ? new Date(task.startTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                    dueTime={task?.dueTime ? new Date(task.dueTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                    logTime={task ? 
                        `${String(task.logTimeHours || 0).padStart(2, '0')}:${String(task.logTimeMinutes || 0).padStart(2, '0')}:${String(task.logTimeSeconds || 0).padStart(2, '0')}` 
                        : undefined
                    }
                />
            )}

            {/* Commented out local CustomToastNotification - now using GlobalTimerModal */}
            {/* <CustomToastNotification
                open={showTimerNotification && !isNotificationHidden}
                onClose={handleTimerClose}
                title="Timer Running"
                message={`Working on: ${task?.taskName || task?.title || 'Task'}`}
                currentWorkTime={getCurrentWorkTime()}
                isTimerRunning={isTimerRunning}
                onTimerToggle={handleTimerToggle}
            /> */}
        </div>
    );
};

export default TaskDetails;