import React, { useState } from 'react';
import { Table, Form, Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';

interface Props {
    meetings: any[];
    setMeetings: (data: any[]) => void;
}

const MeetingConfigurationTable: React.FC<Props> = ({ meetings, setMeetings }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleAddRow = () => {
        setMeetings([...meetings, { config_key: 'Meeting', configKey: 'Meeting', configType: 'meeting', config_type: 'meeting', value: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const updated = [...meetings];
        updated.splice(index, 1);
        setMeetings(updated);
    };

    const handleChange = (index: number, field: string, value: any) => {
        const updated = [...meetings];
        updated[index][field] = value;
        if (field === 'config_key') updated[index]['configKey'] = value;
        if (field === 'configKey')  updated[index]['config_key'] = value;
        setMeetings(updated);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const updated = [...meetings];
        const itemToMove = updated[draggedIndex];
        updated.splice(draggedIndex, 1);
        updated.splice(index, 0, itemToMove);
        
        setDraggedIndex(index);
        setMeetings(updated);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    return (
        <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bolder mb-0">Meetings & Durations</h6>
                <Button variant="light-warning" size="sm" onClick={handleAddRow}>
                    <KTIcon iconName="plus" className="fs-3" /> Add Meeting
                </Button>
            </div>
            
            <div className="table-responsive" style={{ overflow: 'visible' }}>
                <Table bordered size="sm" className="bg-white align-middle gs-0 gy-3 mb-0">
                    <thead className="bg-light">
                        <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200">
                            <th className="ps-4 w-30px"></th>
                            <th className="ps-2">Meeting Type</th>
                            <th className="w-80px">Count</th>
                            <th className="text-end pe-4 w-60px">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {meetings.map((m, idx) => (
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
                                <td className="ps-2">
                                    <Form.Control
                                        type="text"
                                        size="sm"
                                        className="form-control-solid fw-bold py-1"
                                        value={m.config_key}
                                        onChange={(e) => handleChange(idx, 'config_key', e.target.value)}
                                        placeholder="e.g. Meeting"
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        className="form-control-solid py-1"
                                        value={m.value}
                                        onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                    />
                                </td>
                                <td className="text-end pe-4">
                                    <Button 
                                        variant="icon" 
                                        className="btn btn-icon btn-light-danger btn-sm w-25px h-25px" 
                                        onClick={() => handleRemoveRow(idx)}
                                    >
                                        <KTIcon iconName="trash" className="fs-6" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </div>
            {meetings.length === 0 && (
                <div className="text-muted fs-7 text-center py-4 border border-dashed rounded">
                    No meetings configured. Click "Add Meeting" to add one.
                </div>
            )}
        </div>
    );
};

export default MeetingConfigurationTable;


