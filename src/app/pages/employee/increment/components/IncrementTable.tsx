import React, { useMemo } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import dayjs from 'dayjs';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { IncrementRecord } from '@services/incrementService';
import { formatCurrencyDecimal } from '@utils/currency';
import { T } from '@app/modules/common/components/ui/tokens';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { resourceNameMapWithCamelCase } from '@constants/statistics';

interface TableProps {
    data: IncrementRecord[];
    loading: boolean;
    showSensitiveData: boolean;
    fromAdmin: boolean;
    onView: (record: IncrementRecord) => void;
    onEdit?: (record: IncrementRecord) => void;
}

const IncrementTable = ({ data, loading, showSensitiveData, fromAdmin, onView, onEdit }: TableProps) => {
    const blurStyle = showSensitiveData ? {} : { filter: 'blur(4px)', userSelect: 'none' as const };

    const columns = useMemo(() => [
        {
            accessorKey: 'effectiveDate',
            header: 'Effective Date',
            Cell: ({ row }: any) => (
                <Typography sx={{ color: T.color.ink, fontWeight: 600, fontSize: '0.9rem' }}>
                    {dayjs(row.original.effectiveDate).format('DD MMM YYYY')}
                </Typography>
            ),
        },
        {
            accessorKey: 'previousSalary',
            header: 'Previous Salary',
            Cell: ({ row }: any) => (
                <Typography sx={{ color: T.color.inkSoft, fontSize: '0.9rem', ...blurStyle }}>
                    {formatCurrencyDecimal(row.original.previousSalary)}
                </Typography>
            ),
        },
        {
            accessorKey: 'newSalary',
            header: 'New Salary',
            Cell: ({ row }: any) => (
                <Typography sx={{ color: T.color.ink, fontWeight: 700, fontSize: '0.9rem', ...blurStyle }}>
                    {formatCurrencyDecimal(row.original.newSalary)}
                </Typography>
            ),
        },
        {
            accessorKey: 'incrementAmount',
            header: 'Increment',
            Cell: ({ row }: any) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ...blurStyle }}>
                    <Typography sx={{ color: T.color.success, fontWeight: 700, fontSize: '0.9rem' }}>
                        +{formatCurrencyDecimal(row.original.incrementAmount)}
                    </Typography>
                    <Chip
                        label={`${row.original.incrementPercentage}%`}
                        size="small"
                        sx={{
                            height: 20, fontSize: '0.7rem', fontWeight: 700,
                            bgcolor: T.color.successSoft, color: T.color.success,
                        }}
                    />
                </Box>
            ),
        },
        {
            accessorKey: 'actions',
            header: 'Actions',
            enableSorting: false,
            Cell: ({ row }: any) => (
                <Box>
                    <Tooltip title="View details">
                        <IconButton size="small" onClick={() => onView(row.original)} sx={{ color: T.color.inkSoft }}>
                            <VisibilityIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    {fromAdmin && onEdit && (
                        <Tooltip title="Edit increment">
                            <IconButton size="small" onClick={() => onEdit(row.original)} sx={{ color: T.color.brand }}>
                                <EditIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            ),
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [showSensitiveData, fromAdmin, onView, onEdit]);

    return (
        <MaterialTable
            tableName="incrementHistory"
            data={data}
            columns={columns}
            isLoading={loading}
            resource={resourceNameMapWithCamelCase.increment}
            viewOwn={!fromAdmin}
            viewOthers={fromAdmin}
            hideExportCenter
            defaultSorting={[{ id: 'effectiveDate', desc: true }]}
            muiTablePaperStyle={{
                borderRadius: `${T.radius.lg}px`,
                border: `1px solid ${T.color.line}`,
                boxShadow: T.shadow.card,
            }}
        />
    );
};

export default IncrementTable;
