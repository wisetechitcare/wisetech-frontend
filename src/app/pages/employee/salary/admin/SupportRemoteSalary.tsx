import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { saveSelectedEmployee } from '@redux/slices/employee';
import { fetchCurrentEmployeeByEmpId } from '@services/employee';
import SalaryView from '../personal/SalaryView';

/**
 * Full-page salary view for a support-session target — same layout as their My Salary,
 * not a dialog over the payroll table.
 */
export function SupportRemoteSalary({
    targetEmployeeId,
    targetName,
}: {
    targetEmployeeId: string;
    targetName?: string | null;
}) {
    const dispatch = useDispatch();
    const selected = useSelector((state: RootState) => state.employee.selectedEmployee);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const ready = !!selected?.id && selected.id === targetEmployeeId;

    useEffect(() => {
        if (!targetEmployeeId || ready) return;
        let alive = true;
        setLoading(true);
        setError(null);
        fetchCurrentEmployeeByEmpId(targetEmployeeId)
            .then((res) => {
                if (!alive) return;
                const emp = res?.data?.employee;
                if (!emp) {
                    setError('Could not load that employee’s salary view.');
                    return;
                }
                dispatch(saveSelectedEmployee(emp));
            })
            .catch(() => {
                if (alive) setError('Could not load that employee’s salary view.');
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => { alive = false; };
    }, [targetEmployeeId, ready, dispatch]);

    if (loading || (!ready && !error)) {
        return (
            <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !ready) {
        return (
            <Box sx={{ px: 3, py: 4 }}>
                <Typography color="error">{error || 'Employee not found.'}</Typography>
                {targetName ? (
                    <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: 13 }}>
                        Target: {targetName}
                    </Typography>
                ) : null}
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', minWidth: 0 }}>
            <SalaryView fromAdmin />
        </Box>
    );
}

export default SupportRemoteSalary;
