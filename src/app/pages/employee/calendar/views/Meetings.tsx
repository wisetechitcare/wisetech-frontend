import React, { useState, useEffect, useMemo } from 'react';
import { Button, Modal } from 'react-bootstrap';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { MRT_ColumnDef } from 'material-react-table';
import { getMeetings, deleteMeeting } from '@services/employee';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import MeetingsForm from '../../attendance/personal/views/my-leaves/MeetingsForm';
import PremiumButton from '@app/modules/common/components/PremiumButton';
import { errorConfirmation, successConfirmation } from '@utils/modal';

interface Meeting {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  isOnline: boolean;
  meetingLink?: string;
  location?: string;
  participants: any[];
}

const Meetings = () => {
  const currentEmployeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  
  const canCreate = hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.create);
  const canDelete = hasPermission(resourceNameMapWithCamelCase.meeting, permissionConstToUseWithHasPermission.deleteOwn);

  const fetchMeetings = async () => {
    if (!currentEmployeeId) return;
    setIsLoading(true);
    try {
      const response = await getMeetings(currentEmployeeId);
      // Assuming response.data contains the list, or response itself is the list. Let's handle both.
      const data = response?.data?.meetings || response?.meetings || response?.data || response || [];
      if (Array.isArray(data)) {
        setMeetings(data);
      } else {
        setMeetings([]);
      }
    } catch (error) {
      console.error('Error fetching meetings', error);
      errorConfirmation('Failed to fetch meetings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [currentEmployeeId]);

  const handleDelete = async (meetingId: string) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this meeting!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deleteMeeting(meetingId, currentEmployeeId);
        successConfirmation('Meeting deleted successfully');
        fetchMeetings();
      } catch (error) {
        console.error('Error deleting meeting', error);
        errorConfirmation('Failed to delete meeting');
      }
    }
  };

  const columns = useMemo<MRT_ColumnDef<Meeting>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
      },
      {
        accessorFn: (row) => dayjs(row.startDate).format('DD MMM YYYY, hh:mm A'),
        header: 'Start Date',
      },
      {
        accessorFn: (row) => dayjs(row.endDate).format('DD MMM YYYY, hh:mm A'),
        header: 'End Date',
      },
      {
        accessorKey: 'isOnline',
        header: 'Type',
        Cell: ({ cell }) => (
          <span className={`badge badge-light-${cell.getValue<boolean>() ? 'primary' : 'success'}`}>
            {cell.getValue<boolean>() ? 'Online' : 'In-Person'}
          </span>
        ),
      },
      {
        accessorFn: (row) => row.isOnline ? row.meetingLink : row.location,
        header: 'Location / Link',
        Cell: ({ cell, row }) => (
          row.original.isOnline && cell.getValue<string>() ? (
            <a href={cell.getValue<string>()} target="_blank" rel="noopener noreferrer" className="text-primary text-hover-primary text-truncate d-inline-block" style={{maxWidth: '150px'}}>
              {cell.getValue<string>()}
            </a>
          ) : (
            <span>{cell.getValue<string>() || 'N/A'}</span>
          )
        )
      },
      {
        id: 'actions',
        header: 'Actions',
        Cell: ({ row }) => (
          <div className="d-flex gap-2">
            {canDelete && (
              <button
                className="btn btn-sm btn-icon btn-light-danger"
                onClick={() => handleDelete(row.original._id)}
                title="Delete Meeting"
              >
                <i className="bi bi-trash fs-4"></i>
              </button>
            )}
          </div>
        ),
      },
    ],
    [canDelete]
  );

  return (
    <div className="px-lg-0 px-2 pt-4">
      <div className="d-flex justify-content-between align-items-center mb-6">
        <h2 className="mb-0">Meetings</h2>
        {canCreate && (
          <PremiumButton
            icon="bi-plus"
            onClick={() => setShowMeetingForm(true)}
          >
            Create Meeting
          </PremiumButton>
        )}
      </div>

      <div className="card">
        <div className="card-body p-0">
          <MaterialTable
            tableName="Meetings"
            columns={columns}
            data={meetings}
            isLoading={isLoading}
          />
        </div>
      </div>

      <Modal show={showMeetingForm} onHide={() => setShowMeetingForm(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Meeting</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MeetingsForm 
            onClose={() => {
              setShowMeetingForm(false);
              fetchMeetings();
            }} 
            selectedDateTimeInfo={{ startStr: dayjs().toISOString() }} 
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Meetings;
