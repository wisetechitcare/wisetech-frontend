import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import { projectOverviewIcons } from '@metronic/assets/sidepanelicons';
import { useNavigate } from 'react-router-dom';

interface TaskOverviewProps {
    task: any;
}

const TaskOverview: React.FC<TaskOverviewProps> = ({ task }) => {
    const navigate = useNavigate();
    console.log("task",task);
    
    type TaskStatus = string | { name?: string; color?: string } | null | undefined;

    const getStatusColor = (status: TaskStatus) => {
        if (!status) return '#6c757d';
        if (typeof status === 'object' && status?.color) return status.color;
        const value = typeof status === 'string' ? status : status?.name || '';
        switch (value.toLowerCase()) {
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

    const formatDate = (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('DD/MM/YYYY');
    };

    const formatTime = (date: string) => {
        if (!date) return '-';
        return dayjs(date).format('h:mm A');
    };

    const formatDuration = (minutes: number) => {
        if (!minutes) return '-';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m ${minutes < 60 ? `${minutes}s` : ''}`;
    };

    const formatTimeDifference = (startDate: string, startTime: string, endDate: string, endTime: string) => {
        // console.log("startDate", startDate);
        // console.log("startTime", startTime);
        // console.log("endDate", endDate);
        // console.log("endTime", endTime);

        if (!startDate || !endDate) return '-';

        // Extract just the time portion from the datetime strings
        const extractTime = (timeString: string) => {
            if (!timeString) return '00:00';
            return dayjs(timeString).format('HH:mm');
        };

        // Get date portion (without time) and combine with extracted time
        const startDateOnly = dayjs(startDate).format('YYYY-MM-DD');
        const endDateOnly = dayjs(endDate).format('YYYY-MM-DD');

        const startTimeOnly = extractTime(startTime);
        const endTimeOnly = extractTime(endTime);

        // Combine date and time properly
        const startDateTime = `${startDateOnly} ${startTimeOnly}`;
        const endDateTime = `${endDateOnly} ${endTimeOnly}`;

        // console.log("Combined startDateTime:", startDateTime);
        // console.log("Combined endDateTime:", endDateTime);

        const start = dayjs(startDateTime);
        const end = dayjs(endDateTime);

        const totalMinutes = end.diff(start, 'minutes');
        // console.log("Total minutes difference:", totalMinutes);

        if (totalMinutes <= 0) return '-';

        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}D`);
        if (hours > 0) parts.push(`${hours}H`);
        if (minutes > 0) parts.push(`${minutes}M`);

        return parts.length > 0 ? parts.join(' ') : '0M';
    };

    const asText = (v: any) => {
        if (v == null) return '-';
        if (typeof v === 'object') {
            return v.name ?? v.title ?? v.label ?? '-';
        }
        return String(v);
    };

    const isTaskCompleted = () => {
        if (!task?.status) return false;
        const statusName = typeof task.status === 'object' ? task.status.name : task.status;
        return statusName?.toLowerCase() === 'completed';
    };

    const calculateTimeTaken = () => {
        if (!task?.startDate || !task?.startTime || !isTaskCompleted()) {
            return '-';
        }

        const startDateTime = dayjs(`${dayjs(task.startDate).format('YYYY-MM-DD')} ${dayjs(task.startTime).format('HH:mm')}`);
        const completionDateTime = task?.completionDate ? dayjs(task.completionDate) : (task?.updatedAt ? dayjs(task.updatedAt) : dayjs());

        const totalMinutes = completionDateTime.diff(startDateTime, 'minutes');

        if (totalMinutes <= 0) return '-';

        const days = Math.floor(totalMinutes / (24 * 60));
        const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
        const minutes = totalMinutes % 60;

        const parts = [];
        if (days > 0) parts.push(`${days}D`);
        if (hours > 0) parts.push(`${hours}H`);
        if (minutes > 0) parts.push(`${minutes}M`);

        return parts.length > 0 ? parts.join(' ') : '0M';
    };

    const calculateTotalLoggedTime = () => {
        if (!task?.timesheets || task.timesheets.length === 0) {
            return '-';
        }

        const totalHours = task.timesheets.reduce((total: number, timesheet: any) => {
            return total + (parseInt(timesheet?.logTimeHours) || 0);
        }, 0);

        const totalMinutes = task.timesheets.reduce((total: number, timesheet: any) => {
            return total + (parseInt(timesheet?.logTimeMinutes) || 0);
        }, 0);

        const totalSeconds = task.timesheets.reduce((total: number, timesheet: any) => {
            return total + (parseInt(timesheet?.logTimeSeconds) || 0);
        }, 0);

        // Convert everything to total minutes for proper calculation
        const totalMinutesCalculated = (totalHours * 60) + totalMinutes + Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;

        if (totalMinutesCalculated <= 0 && remainingSeconds <= 0) return '-';

        const finalHours = Math.floor(totalMinutesCalculated / 60);
        const finalMinutes = totalMinutesCalculated % 60;

        const parts = [];
        if (finalHours > 0) parts.push(`${finalHours}H`);
        if (finalMinutes > 0) parts.push(`${finalMinutes}M`);
        if (remainingSeconds > 0 && finalHours === 0) parts.push(`${remainingSeconds}S`);

        return parts.length > 0 ? parts.join(' ') : '0M';
    };

    return (
        <div className="p-2 p-md-4 mt-5">
            <div className='card card-body mb-5'>
                <div>
                    <h3 style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Description</h3>
                </div>
                <div className='mt-2'>
                    <p style={{fontFamily:'Inter', fontWeight:'400', fontSize:'14px'}}>{task?.taskDescription}</p>
                </div>
            </div>
            <Row className="g-4 g-md-6">
                {/* Task Details Card */}
                <Col md={4}>
                    <Card className="h-100">
                        <Card.Header className="border-0 pt-4 pt-md-6 pb-2">
                            <div className="d-flex align-items-center">
                                <div className="symbol symbol-40px me-3">
                                    <div>
                                        <img src={projectOverviewIcons?.taskIcon?.default} alt="Task Details" style={{width:'44px', height:'44px'}}/>
                                    </div>
                                </div>
                                <h5 className="card-title mb-0" style={{fontFamily:'Barlow', fontWeight:'600', fontSize:'19px'}}>Task Details</h5>
                            </div>
                        </Card.Header>
                        <Card.Body className="pt-2 px-4 px-md-6">
                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Current Status</span>
                                    <Chip
                                        label={(typeof task?.status === 'object' ? task?.status?.name : task?.status) || 'Ongoing'}
                                        style={{
                                            backgroundColor: getStatusColor(task?.status as any),
                                            color: 'white',
                                            fontWeight: '500',
                                            fontSize: '11px',
                                            height: '24px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Task Name</span>
                                    <span className=" text-end" style={{maxWidth: '60%', wordWrap: 'break-word', fontFamily:'Inter', fontWeight:'400', fontSize:'14px'}}>
                                        {task?.title || task?.taskName || '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Project</span>
                                    <span className=" text-end" style={{maxWidth: '60%', wordWrap: 'break-word', fontFamily:'Inter', fontWeight:'400', fontSize:'14px', color:'#9d4141', cursor:'pointer'}} onClick={() => navigate(`/projects/${task?.project?.id}`)}>
                                        {asText(task?.project)}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Priority</span>
                                    <Chip
                                        label={(typeof task?.priority === 'object' ? task?.priority?.name : task?.priority) || '-'}
                                        style={{
                                            backgroundColor: (typeof task?.priority === 'object' && task?.priority?.color) ? task?.priority?.color as string : '#6c757d',
                                            color: 'white',
                                            fontWeight: '500',
                                            fontSize: '11px',
                                            height: '22px'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Billable</span>
                                    <span className="" style={{fontFamily:'Inter', fontWeight:'400', fontSize:'14px'}}>
                                        {task?.billingType === 'NON_BILLABLE' ? 'No' : 'Yes'}
                                    </span>
                                </div>
                            </div>

                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Assigned to</span>
                                    <span className=" text-end" style={{maxWidth: '60%', wordWrap: 'break-word', fontFamily:'Inter', fontWeight:'400', fontSize:'14px'}}>
                                        {asText(task?.assignedTo?.users?.firstName + ' ' + task?.assignedTo?.users?.lastName)}
                                    </span>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Review By</span>
                                    <span className=" text-end" style={{maxWidth: '60%', wordWrap: 'break-word', fontFamily:'Inter', fontWeight:'400', fontSize:'14px'}}>
                                        {asText(task?.reviewedBy ?? '-')} 
                                    </span>
                                </div>
                            </div>
                            <div className="mb-0">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className=" " style={{fontFamily:'Inter', fontWeight:'500', fontSize:'14px'}}>Review Status</span>
                                    <span className=" text-end" style={{maxWidth: '60%', wordWrap: 'break-word', fontFamily:'Inter', fontWeight:'400', fontSize:'14px'}}>
                                        {asText(task?.reviewStatus ?? '-')} 
                                    </span>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

           {/* Progress Card */}
<Col md={4}>
  <Card className="h-100">
    <Card.Header className="border-0 pt-4 pt-md-6 pb-2 px-4 px-md-6">
      <div className="d-flex align-items-center">
        <div className="symbol symbol-40px me-3">
          <div>
            <img
              src={projectOverviewIcons.portalssIcon.default}
              alt="Progress"
              style={{ width: '44px', height: '44px' }}
            />
          </div>
        </div>
        <h5
          className="card-title mb-0"
          style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: '19px' }}
        >
          Progress
        </h5>
      </div>
    </Card.Header>

    <Card.Body className="pt-2 px-4 px-md-6">
      {/* Start Time */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Start Time
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {formatDate(task?.startDate)} {formatTime(task?.startTime)}
          </span>
        </div>
      </div>

      {/* Due Time */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Due Time
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {formatDate(task?.dueDate)} {formatTime(task?.dueTime)}
          </span>
        </div>
      </div>

      {/* Time Scheduled */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Time Scheduled
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {formatTimeDifference(task?.startDate, task?.startTime, task?.dueDate, task?.dueTime)}
          </span>
        </div>
      </div>

      {/* Completion Time with border-top - only show when status is completed */}
      {isTaskCompleted() && (
        <div className="mb-3 pt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
              Completion Time
            </span>
            <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px', color:'#C82E37' }}>
              {formatDate(task?.completionDate || task?.updatedAt) || '-'} {formatTime(task?.completionDate || task?.updatedAt) || ''}
            </span>
          </div>
        </div>
      )}

      {/* Time Taken */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Time taken
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px', color:'#C82E37' }}>
            {calculateTimeTaken()}
          </span>
        </div>
      </div>

      {/* Total Logged Time with border-top */}
      <div className="mb-0 pt-3 border-top">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Total Logged Time
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px', color:'#1D5DE1' }}>
            {calculateTotalLoggedTime()}
          </span>
        </div>
      </div>
    </Card.Body>
  </Card>
</Col>


  {/* Portal Card */}
<Col md={4}>
  <Card className="h-100">
    <Card.Header className="border-0 pt-4 pt-md-6 pb-2 px-4 px-md-6">
      <div className="d-flex align-items-center">
        <div className="symbol symbol-40px me-3">
          <div>
            <img
              src={projectOverviewIcons.portalssIcon.default}
              alt="Portal"
              style={{ width: '44px', height: '44px' }}
            />
          </div>
        </div>
        <h5
          className="card-title mb-0"
          style={{ fontFamily: 'Barlow', fontWeight: '600', fontSize: '19px' }}
        >
          Portal
        </h5>
      </div>
    </Card.Header>

    <Card.Body className="pt-2">
      {/* Visibility */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Visibility
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {asText(task?.visibility)}
          </span>
        </div>
      </div>

      {/* Created by */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Created by
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {asText(task?.createdBy?.users?.firstName)} {asText(task?.createdBy?.users?.lastName)}
          </span>
        </div>
      </div>

      {/* Created Date (date + time inline) */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Created Date
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {formatDate(task?.createdAt) || '-'} {formatTime(task?.createdAt) || ''}
          </span>
        </div>
      </div>

      {/* Last Edited by */}
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Last Edited by
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {task?.lastEditedBy?.users?.firstName} {task?.lastEditedBy?.users?.lastName}
          </span>
        </div>
      </div>

      {/* Last Edited (date + time inline) */}
      <div className="mb-0">
        <div className="d-flex justify-content-between align-items-center">
          <span className=" " style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px' }}>
            Last Edited
          </span>
          <span className="" style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px' }}>
            {formatDate(task?.updatedAt) || '21/3/2025'} {formatTime(task?.updatedAt) || '12:23AM'}
          </span>
        </div>
      </div>
    </Card.Body>
  </Card>
</Col>

            </Row>
        </div>
    );
};

export default TaskOverview;
