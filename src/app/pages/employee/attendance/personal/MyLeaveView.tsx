import { useEffect, useState } from 'react';
import { useFocusTrap } from '@hooks/useFocusTrap';
import ApplyLeave from './views/my-leaves/ApplyLeave';
import BalanceProgress from './views/my-leaves/BalanceProgress';
import Leaves from './views/my-leaves/Leaves';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import dayjs from 'dayjs';
import { generateFiscalYearFromGivenYear } from '@utils/file';
import { formatFiscalYearLabel } from '@utils/fiscalYearHelper';
import { KTIcon } from '@metronic/helpers';
import { handleDatesChange } from '@utils/statistics';
import DateSelector from '@components/DateSelector';
import MyLeaveManagementRequests from './views/my-leaves/MyLeaveManagementRequests';
// Leave suggestion engine — disabled, see the commented block below.
// import { generateUserInsights } from './views/my-leaves/utils/insightGenerator';
// import { generateMonthlySuggestions } from './views/my-leaves/utils/suggestionEngine';
// import { useSelector } from 'react-redux';
// import { RootState } from '@redux/store';
// Shared UI kit — reusable brand button + section atoms (single source of truth).
import { WtButton, IconBox, Eyebrow, TRIO } from '@app/modules/common/components/ui/tw';

const PersonalLeaveView = () => {
    const [open, setOpen] = useState(false);

    const [year, setYear] = useState(dayjs());
    const [startDateNew, setStartDateNew] = useState('')
    const [endDateNew, setEndDateNew] = useState('')
    const [fiscalYear, setFiscalYear] = useState('');

    useEffect(() => {
        (async () => {
            const { startDate, endDate } = await generateFiscalYearFromGivenYear(year)
            setFiscalYear(`${dayjs(startDate).format('MMM YYYY')} - ${dayjs(endDate).format('MMM YYYY')}`);
            setStartDateNew(startDate);
            setEndDateNew(endDate);
        })()
    }, [year])

    /*
     * ── LEAVE SUGGESTION ENGINE — TEMPORARILY DISABLED ───────────────────────────
     *
     * Not in use. `insights` was computed on every change to leaves, holidays or the
     * date range and then stored in state that nothing rendered — so this ran the
     * 90-day suggestion scan for output no one ever saw.
     *
     * Kept commented rather than deleted so it can be switched back on. To re-enable:
     * uncomment this block, restore the two imports above, and render `insights`.
     *
     * Note for whoever revives it: `branchWorkingAndOffDays` must stay wired into
     * generateMonthlySuggestions. Without it every Saturday is assumed to be a
     * weekend, which is wrong for a branch that works Saturdays — it would suggest
     * bridging around days people are expected to work. See workingDays.test.ts.
     */
    // const personalLeaves = useSelector((state: RootState) => state.leaves.personalLeaves) || [];
    // const publicHolidaysRaw = useSelector((state: RootState) => state.attendanceStats?.publicHolidays) || [];
    // const branchWorkingAndOffDays = useSelector(
    //     (state: RootState) => state.employee.currentEmployee?.branches?.workingAndOffDays,
    // );
    //
    // const [insights, setInsights] = useState<any[]>([]);
    //
    // useEffect(() => {
    //     if (!startDateNew || !endDateNew) return;
    //
    //     const holidays = new Set<string>(
    //         publicHolidaysRaw.map((h: any) => dayjs(h?.date).format('YYYY-MM-DD')).filter(Boolean)
    //     );
    //
    //     // Generate future suggestions based on current month
    //     const maxLeaves = 5; // Default assumption for suggestion generation
    //     const suggestions = generateMonthlySuggestions(new Date(), holidays, maxLeaves, 3, branchWorkingAndOffDays);
    //
    //     const generatedInsights = generateUserInsights(personalLeaves, suggestions, holidays);
    //     setInsights(generatedInsights);
    // }, [personalLeaves, publicHolidaysRaw, startDateNew, endDateNew, branchWorkingAndOffDays]);


    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    // Accessible-dialog behaviour for the hand-rolled Apply-Leave overlay:
    // trap Tab within, close on Escape, restore focus to the trigger on close.
    const dialogRef = useFocusTrap<HTMLDivElement>(open, { onEscape: handleClose });

    const res = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.create);

    return (
        <>
            <div className='d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center pt-0 mb-3 mt-0 gap-3'>
                <div className="d-flex align-items-center gap-3">
                    <IconBox icon="calendar" trio={TRIO.blue} size={44} fs="fs-1" />
                    <div>
                        <h3 className="fw-bold fs-1 font-barlow mb-0">My Leaves</h3>
                        <Eyebrow className="mt-0.5">Balance, requests &amp; history</Eyebrow>
                    </div>
                </div>
                <div className='d-flex flex-column flex-sm-row justify-content-center align-items-stretch align-items-sm-center gap-2 gap-sm-4 w-100 w-md-auto'>
                    <DateNavigation fiscalYear={fiscalYear} setYear={setYear} />
                    {res && (
                        <WtButton
                            onClick={handleClickOpen}
                            startIcon={<KTIcon iconName="plus" className="fs-4 text-white" />}
                            className="w-full sm:w-auto"
                        >
                            Apply Leave
                        </WtButton>
                    )}
                </div>
            </div>
            {/* Apply-Leave v4 — the component owns its own card/sheet + header; we provide the backdrop. */}
            {open && (
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Apply for leave"
                    tabIndex={-1}
                    onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(15,23,42,.45)',
                        display: 'flex',
                        alignItems: typeof window !== 'undefined' && window.innerWidth < 768 ? 'flex-end' : 'center',
                        justifyContent: 'center',
                        padding: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : 24,
                        overflowY: 'auto',
                    }}
                >
                    <ApplyLeave onClose={handleClose} />
                </div>
            )}

            <BalanceProgress resource={resourceNameMapWithCamelCase.leave} fromAdmin={false} viewOwn={true} viewOthers={false} startDateNew={startDateNew} endDateNew={endDateNew} />
            
                <Leaves resource={resourceNameMapWithCamelCase.leave} viewOwn={true} startDateNew={startDateNew} endDateNew={endDateNew} />
                <MyLeaveManagementRequests startDateNew={startDateNew} endDateNew={endDateNew} />

        </>
    )
}

export default PersonalLeaveView

export const DateNavigation = ({ fiscalYear, setYear }: { fiscalYear: string, setYear: (date: any) => void }) => (
    <DateSelector
        onPrevious={() => handleDatesChange('decrement', 'year', setYear)}
        onNext={() => handleDatesChange('increment', 'year', setYear)}
        displayValue={formatFiscalYearLabel(fiscalYear)}
    />
);