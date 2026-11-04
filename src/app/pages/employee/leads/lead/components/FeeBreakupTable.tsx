import React from 'react';
import { Table, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { Button } from '@/ds/ui/button';

interface FeeBreakupRow {
    stage_name: string;
    percentage: number;
    amount?: number | string;
}

interface FeeBreakupTableProps {
    rows: FeeBreakupRow[];
    totalCost: number;
    onChange: (rows: FeeBreakupRow[]) => void;
}

const FeeBreakupTable: React.FC<FeeBreakupTableProps> = ({ rows, totalCost, onChange }) => {
    const handleAddRow = () => {
        onChange([...rows, { stage_name: '', percentage: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        onChange(newRows);
    };

    const handleChange = (index: number, field: keyof FeeBreakupRow, value: any) => {
        const newRows = [...rows];
        if (field === 'percentage') {
            const numValue = parseFloat(value) || 0;
            newRows[index] = { ...newRows[index], [field]: numValue };
        } else {
            newRows[index] = { ...newRows[index], [field]: value };
        }
        onChange(newRows);
    };

    const totalPercentage = rows.reduce((sum, row) => sum + (row.percentage || 0), 0);
    const isValid = totalPercentage === 100;

    const handleAutoFix = () => {
        if (totalPercentage === 0) {
            // If total is 0, distribute evenly
            const even = 100 / rows.length;
            onChange(rows.map(r => ({ ...r, percentage: parseFloat(even.toFixed(2)) })));
            return;
        }

        // Proportional adjustment
        const ratio = 100 / totalPercentage;
        let currentTotal = 0;
        const newRows = rows.map((r, idx) => {
            if (idx === rows.length - 1) {
                // Last row takes the remaining to ensure exactly 100
                return { ...r, percentage: parseFloat((100 - currentTotal).toFixed(2)) };
            }
            const newValue = parseFloat(((r.percentage || 0) * ratio).toFixed(2));
            currentTotal += newValue;
            return { ...r, percentage: newValue };
        });
        onChange(newRows);
    };

    return (
        <div className="mb-6">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bolder mb-0">Payment Stages</h6>
                <div className="d-flex align-items-center gap-3">
                    {!isValid && rows.length > 0 && (
                        <Button variant="tinted" size="sm" 
                            className="[--tint:var(--cta-danger)]"
                            onClick={handleAutoFix}
                        >
                            <KTIcon iconName="magic" className="fs-9 me-1" /> Auto-Fix
                        </Button>
                    )}
                    <Badge bg={isValid ? 'light-success' : 'light-danger'} className={isValid ? 'text-success' : 'text-danger'}>
                        {totalPercentage}%
                    </Badge>
                    <Button variant="tinted" size="icon-xs" aria-label="Add" onClick={handleAddRow}>
                        <KTIcon iconName="plus" className="fs-3" />
                    </Button>
                </div>
            </div>
            
            <div className="table-responsive">
                <Table bordered size="sm" className="bg-white align-middle gs-0 gy-3">
                    <thead className="bg-light">
                        <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200">
                            <th className="ps-4">Stage</th>
                            <th className="min-w-100px">Percentage (%)</th>
                            <th className="text-end pe-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index}>
                                <td className="ps-4">
                                    <input
                                        type="text"
                                        className="form-control form-control-solid form-control-sm fw-bold"
                                        value={row.stage_name}
                                        onChange={(e) => handleChange(index, 'stage_name', e.target.value)}
                                        placeholder="e.g. Advance"
                                    />
                                </td>
                                <td>
                                    <div className="input-group input-group-sm">
                                        <input
                                            type="number"
                                            className={`form-control form-control-solid ${row.percentage < 0 || row.percentage > 100 ? 'is-invalid' : ''}`}
                                            value={row.percentage}
                                            onChange={(e) => handleChange(index, 'percentage', e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td className="text-end pe-4">
                                    <Button variant="tinted" size="icon-sm" aria-label="Delete"
                                        className="[--tint:var(--cta-danger)]"
                                        onClick={() => handleRemoveRow(index)}
                                        disabled={rows.length === 1}
                                    >
                                        <KTIcon iconName="trash" className="fs-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
            
            {!isValid && (
                <div className="text-danger fs-8 mt-1 fw-bold">
                    * Total percentage must be 100% (Current: {totalPercentage}%)
                </div>
            )}
        </div>
    );
};

export default FeeBreakupTable;

