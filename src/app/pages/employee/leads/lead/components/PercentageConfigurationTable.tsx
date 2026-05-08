import React from 'react';
import { Table, Form, Button, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';

interface Props {
    percentages: any[];
    setPercentages: (data: any[]) => void;
}

const PercentageConfigurationTable: React.FC<Props> = ({ percentages, setPercentages }) => {
    const handleAddRow = () => {
        setPercentages([...percentages, { config_key: 'New Stage', value: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const updated = [...percentages];
        updated.splice(index, 1);
        setPercentages(updated);
    };

    const handleChange = (index: number, field: string, value: any) => {
        const updated = [...percentages];
        updated[index][field] = value;
        setPercentages(updated);
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
                        {percentages.map((p, idx) => (
                            <tr key={idx}>
                                <td className="ps-4">
                                    <Form.Control
                                        type="text"
                                        size="sm"
                                        className="form-control-solid fw-bold"
                                        value={p.config_key}
                                        onChange={(e) => handleChange(idx, 'config_key', e.target.value)}
                                        placeholder="e.g. Stage Name"
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        className="form-control-solid"
                                        value={p.value}
                                        onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                    />
                                </td>
                                <td className="text-end pe-4">
                                    <Button 
                                        variant="icon" 
                                        className="btn btn-icon btn-light-danger btn-sm" 
                                        onClick={() => handleRemoveRow(idx)}
                                        disabled={percentages.length === 1}
                                    >
                                        <KTIcon iconName="trash" className="fs-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
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

