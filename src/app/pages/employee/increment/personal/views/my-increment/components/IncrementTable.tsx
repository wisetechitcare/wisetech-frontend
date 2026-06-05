import React from 'react';
import { Box, Paper, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Typography } from '@mui/material';
import { IncrementRecord } from '../../../../../../../../services/incrementService';
import dayjs from 'dayjs';
import { formatCurrencyDecimal } from '@utils/currency';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface TableProps {
    data: IncrementRecord[];
    loading: boolean;
    showSensitiveData: boolean;
    fromAdmin: boolean;
    onView: (record: IncrementRecord) => void;
    onEdit?: (record: IncrementRecord) => void;
    onDelete?: (record: IncrementRecord) => void;
}

const IncrementTable = ({ data, loading, showSensitiveData, fromAdmin, onView, onEdit, onDelete }: TableProps) => {
    if (loading) {
        return <Skeleton variant="rounded" height={300} sx={{ borderRadius: '16px', width: '100%' }} />;
    }

    if (!data || data.length === 0) return null;

    const blurStyle = showSensitiveData ? {} : { filter: 'blur(4px)', userSelect: 'none' };

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: '16px',
                border: '1px solid #e9eef5',
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                overflow: 'hidden',
                mb: 2
            }}
        >
            <TableContainer>
                <Table sx={{ minWidth: 650 }}>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Effective Date</TableCell>
                            <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Effective Salary</TableCell>
                            <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>New Salary</TableCell>
                            <TableCell sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Increment</TableCell>
                            <TableCell align="right" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}>
                                    {dayjs(row.effectiveDate).format('DD MMM YYYY')}
                                </TableCell>
                                <TableCell sx={{ color: '#475569', fontSize: '0.9rem', ...blurStyle }}>
                                    {formatCurrencyDecimal(row.previousSalary)}
                                </TableCell>
                                <TableCell sx={{ color: '#0f172a', fontWeight: 700, fontSize: '0.9rem', ...blurStyle }}>
                                    {formatCurrencyDecimal(row.newSalary)}
                                </TableCell>
                                <TableCell sx={{ ...blurStyle }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography sx={{ color: '#16a34a', fontWeight: 700, fontSize: '0.9rem' }}>
                                            +{formatCurrencyDecimal(row.incrementAmount)}
                                        </Typography>
                                        <Chip 
                                            label={`${row.incrementPercentage}%`} 
                                            size="small" 
                                            sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#dcfce7', color: '#15803d' }} 
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => onView(row)} sx={{ color: '#64748b' }}>
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                    {fromAdmin && onEdit && (
                                        <IconButton size="small" onClick={() => onEdit(row)} sx={{ color: '#3b82f6' }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                    {/* Delete not supported by backend currently, hidden to prevent confusion */}
                                    {/* {fromAdmin && onDelete && (
                                        <IconButton size="small" onClick={() => onDelete(row)} sx={{ color: '#ef4444' }}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )} */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default IncrementTable;
