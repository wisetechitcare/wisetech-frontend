import React from 'react';
import { Button, Table } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';

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

    return (
        <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Stage Wise Fee Breakup</h5>
                <Button variant="light-primary" size="sm" onClick={handleAddRow}>
                    <KTIcon iconName="plus" className="fs-3" /> Add Stage
                </Button>
            </div>
            
            <div className="table-responsive">
                <Table className="table align-middle gs-0 gy-4">
                    <thead>
                        <tr className="fw-bold text-muted bg-light">
                            <th className="ps-4 min-w-200px rounded-start">Stage Name</th>
                            <th className="min-w-100px">Percentage (%)</th>
                            <th className="min-w-125px">Amount</th>
                            <th className="min-w-50px text-end rounded-end pe-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => {
                            const amount = totalCost * ((row.percentage || 0) / 100);
                            return (
                                <tr key={index}>
                                    <td>
                                        <input
                                            type="text"
                                            className="form-control form-control-solid form-control-sm"
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
                                                min="0"
                                                max="100"
                                            />
                                            <span className="input-group-text">%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <span className="text-muted fw-bold">
                                                {amount.toLocaleString('en-IN', { maximumFractionDigits: 2, style: 'currency', currency: 'INR' })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-end">
                                        <Button
                                            variant="icon"
                                            className="btn btn-icon btn-light-danger btn-sm"
                                            onClick={() => handleRemoveRow(index)}
                                            disabled={rows.length === 1}
                                        >
                                            <KTIcon iconName="trash" className="fs-4" />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="fw-bold border-top">
                            <td className="text-end">Total:</td>
                            <td className={isValid ? 'text-success' : 'text-danger'}>
                                {totalPercentage}%
                            </td>
                            <td>
                                {totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2, style: 'currency', currency: 'INR' })}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
            
            {!isValid && (
                <div className="alert alert-danger d-flex align-items-center p-3 mt-2">
                    <KTIcon iconName="information-5" className="fs-2 text-danger me-3" />
                    <div>
                        <strong>Validation Error:</strong> The total percentage must equal exactly 100%. Currently it is {totalPercentage}%.
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeeBreakupTable;
