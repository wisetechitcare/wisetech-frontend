import React, { useState } from 'react';
import { Table, Form, Button, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';

interface Props {
    percentages: any[];
    setPercentages: (data: any[]) => void;
    totalCost?: number;
}

const PercentageConfigurationTable: React.FC<Props> = ({ percentages, setPercentages, totalCost }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleAddRow = () => {
    setPercentages([...percentages, { config_key: 'New Stage', configKey: 'New Stage', configType: 'percentage', config_type: 'percentage', value: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const updated = [...percentages];
        updated.splice(index, 1);
        setPercentages(updated);
    };

    const handleChange = (index: number, field: string, value: any) => {
        const updated = [...percentages];
        updated[index][field] = value;
        // Keep both naming conventions in sync
        if (field === 'config_key') updated[index]['configKey'] = value;
        if (field === 'configKey')  updated[index]['config_key'] = value;
        setPercentages(updated);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const updated = [...percentages];
        const itemToMove = updated[draggedIndex];
        updated.splice(draggedIndex, 1);
        updated.splice(index, 0, itemToMove);
        
        setDraggedIndex(index);
        setPercentages(updated);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const totalPercentage = percentages.reduce((sum, row) => sum + (parseFloat(row.value) || 0), 0);
    const isValid = totalPercentage === 100;

    const handleAutoFix = () => {
        if (percentages.length === 0) return;
        
        if (totalPercentage === 0) {
            const even = 100 / percentages.length;
            setPercentages(percentages.map(p => ({ ...p, value: parseFloat(even.toFixed(2)) })));
            return;
        }

        const ratio = 100 / totalPercentage;
        let currentTotal = 0;
        const updated = percentages.map((p, idx) => {
            if (idx === percentages.length - 1) {
                return { ...p, value: parseFloat((100 - currentTotal).toFixed(2)) };
            }
            const newVal = parseFloat(((parseFloat(p.value) || 0) * ratio).toFixed(2));
            currentTotal += newVal;
            return { ...p, value: newVal };
        });
        setPercentages(updated);
    };

    return (
        <div className="mb-6">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bolder mb-0 text-dark">Payment Stages</h6>
                <div className="d-flex align-items-center gap-2">
                    {!isValid && percentages.length > 0 && (
                        <Button 
                            variant="light-danger" 
                            size="sm" 
                            className="btn-sm py-1 px-3 fs-9 fw-bold"
                            onClick={handleAutoFix}
                        >
                            <KTIcon iconName="magic" className="fs-9 me-1" /> Auto-Fix
                        </Button>
                    )}
                    <Badge bg={isValid ? 'light-success' : 'light-danger'} className={isValid ? 'text-success' : 'text-danger'}>
                        {totalPercentage}%
                    </Badge>
                    <Button variant="light-primary" size="sm" onClick={handleAddRow} className="btn-icon w-25px h-25px">
                        <KTIcon iconName="plus" className="fs-3" />
                    </Button>
                </div>
            </div>
            
            <div className="table-responsive" style={{ overflow: 'visible' }}>
                <Table bordered size="sm" className="bg-white align-middle gs-0 gy-3 mb-0">
                    <thead className="bg-light">
                        <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200">
                            <th className="ps-4 w-30px"></th>
                            <th className="ps-2 w-40px">Sr no</th>
                            <th className="min-w-150px">Particulars</th>
                            <th className="w-110px text-center">%</th>
                            {totalCost !== undefined && (
                                <th className="min-w-120px text-end pe-4">
                                    {totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                                </th>
                            )}
                            <th className="text-end pe-4 w-60px">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {percentages.map((p, idx) => (
                            <tr 
                                key={idx}
                                draggable
                                onDragStart={() => handleDragStart(idx)}
                                onDragOver={(e) => handleDragOver(e, idx)}
                                onDragEnd={handleDragEnd}
                                className={draggedIndex === idx ? 'opacity-50 bg-light' : ''}
                                style={{ cursor: 'move' }}
                            >
                                <td className="text-center ps-4">
                                    <KTIcon iconName="row-horizontal" className="fs-3 text-gray-400" />
                                </td>
                                <td className="ps-2 fw-bold text-gray-700">{idx + 1}</td>
                                <td>
                                    <Form.Control
                                        type="text"
                                        size="sm"
                                        className="form-control-solid fw-bold py-1"
                                        value={p.config_key}
                                        onChange={(e) => handleChange(idx, 'config_key', e.target.value)}
                                        placeholder="e.g. Stage Name"
                                    />
                                </td>
                                <td className="text-center">
                                    <div className="d-flex align-items-center justify-content-center">
                                        <Form.Control
                                            type="number"
                                            size="sm"
                                            className="form-control-solid fw-bold w-75px text-center py-1"
                                            value={p.value}
                                            onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                        />
                                        <span className="ms-1 fw-bold">%</span>
                                    </div>
                                </td>
                                {totalCost !== undefined && (
                                    <td className="text-end pe-4 fw-bolder text-dark fs-7">
                                        ₹ {((parseFloat(p.value) || 0) / 100 * totalCost).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                                    </td>
                                )}
                                <td className="text-end pe-4">
                                    <Button 
                                        variant="icon" 
                                        className="btn btn-icon btn-light-danger btn-sm w-25px h-25px" 
                                        onClick={() => handleRemoveRow(idx)}
                                        disabled={percentages.length === 1}
                                    >
                                        <KTIcon iconName="trash" className="fs-6" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {totalCost !== undefined && (
                        <tfoot>
                            <tr className="bg-light-primary fw-bolder fs-8 border-top border-gray-300">
                                <td colSpan={3} className="text-end pe-4 text-gray-800">Total</td>
                                <td className="text-center text-primary">{totalPercentage}%</td>
                                <td className="text-end pe-4 text-primary">₹ {totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </Table>
            </div>
            {percentages.length === 0 && (
                <div className="text-muted fs-7 text-center py-4 border border-dashed rounded">
                    No stages configured. Click "+" to add one.
                </div>
            )}
        </div>
    );
};

export default PercentageConfigurationTable;


