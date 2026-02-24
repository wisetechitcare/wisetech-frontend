import { Button, Dialog, DialogContent, styled } from '@mui/material'
import { useEffect, useState } from 'react';
import LeaveRequestForm from './views/my-leaves/LeaveRequestForm';
import BalanceProgress from './views/my-leaves/BalanceProgress';
import Leaves from './views/my-leaves/Leaves';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import dayjs, { Dayjs } from 'dayjs';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { toAbsoluteUrl } from '@metronic/helpers';
import { handleDatesChange } from '@utils/statistics';
import { Modal } from 'react-bootstrap';
import MyLeaveManagementRequests from './views/my-leaves/MyLeaveManagementRequests';

const PersonalLeaveView = () => {
    const [open, setOpen] = useState(false);

    const [year, setYear] = useState(dayjs());
    const [startDateNew, setStartDateNew] = useState('')
    const [endDateNew, setEndDateNew] = useState('')
    const [fiscalYear, setFiscalYear] = useState('');

    useEffect(() => {
        (async () => {
            const { startDate, endDate } = await generateFiscalYearFromGivenYear(year)
            setFiscalYear(`${startDate} to ${endDate}`);
            setStartDateNew(startDate);
            setEndDateNew(endDate);
        })()
    }, [year])


    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const Header = styled('div')({
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '1.25rem',
        fontWeight: 'bold',
    });

    const ApplyLeaveButton = styled(Button)({
        borderColor: '#9D4141',
        color: '#9D4141',
        textTransform: 'none',
        fontWeight: 'bold',
        '&:hover': {
            borderColor: '#9D4141',
            backgroundColor: 'rgba(157, 65, 65, 0.1)',
        }
    });
    const res = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.create);

    return (
        <>


            <div className='d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center pt-0 mb-3 mt-0 gap-2'>
                <div className="d-flex justify-content-between align-items-center">
                    <h3 className="fw-bold fs-1 font-barlow">My Leaves</h3>
                   
                </div>
                <div className='d-flex flex-column flex-sm-row justify-content-center align-items-stretch align-items-sm-center gap-2 gap-sm-4 w-100 w-md-auto'>
                <DateNavigation fiscalYear={fiscalYear} setYear={setYear} />
                 {res && <ApplyLeaveButton variant="outlined" onClick={handleClickOpen}>
                        Apply Leave
                    </ApplyLeaveButton>}


                </div>
            </div>
            <h3 className='fw-bold font-barlow mb-0'>Leaves</h3>
            <Modal show={open} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Leave Requests!</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <LeaveRequestForm onClose={handleClose} startDateNew={startDateNew} endDateNew={endDateNew} />
                </Modal.Body>
            </Modal>
                <BalanceProgress resource={resourceNameMapWithCamelCase.leave} fromAdmin={false} viewOwn={true} viewOthers={false} startDateNew={startDateNew} endDateNew={endDateNew} />
            
                <Leaves resource={resourceNameMapWithCamelCase.leave} viewOwn={true} startDateNew={startDateNew} endDateNew={endDateNew} />
                <MyLeaveManagementRequests startDateNew={startDateNew} endDateNew={endDateNew} />

        </>
    )
}

export default PersonalLeaveView

export const DateNavigation = ({ fiscalYear, setYear }: { fiscalYear: string, setYear: (date: any) => void }) => (
    <div className="d-flex align-items-center justify-content-center">
        <button className="btn btn-sm p-0" onClick={() => handleDatesChange('decrement', 'year', setYear)}>
            <img src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous" />
        </button>
        <span className="mx-2 my-5">{fiscalYear}</span>
        <button className="btn btn-sm p-0" onClick={() => handleDatesChange('increment', 'year', setYear)}>
            <img src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next" />
        </button>
    </div>
);