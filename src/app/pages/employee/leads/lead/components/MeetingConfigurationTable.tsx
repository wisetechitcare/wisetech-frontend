import React from 'react';
import { Table, Form, Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';

interface Props {
    meetings: any[];
    setMeetings: (data: any[]) => void;
}

const MeetingConfigurationTable: React.FC<Props> = ({ meetings, setMeetings }) => {
    const handleAddRow = () => {
        setMeetings([...meetings, { config_key: 'Meeting', value: 0 }]);
    };

    const handleRemoveRow = (index: number) => {
        const updated = [...meetings];
        updated.splice(index, 1);
        setMeetings(updated);
    };

    const handleChange = (index: number, field: string, value: any) => {
        const updated = [...meetings];
        updated[index][field] = value;
        setMeetings(updated);
    };

    return (
        <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bolder mb-0">Meetings & Durations</h6>
                <Button variant="light-warning" size="sm" onClick={handleAddRow}>
                    <KTIcon iconName="plus" className="fs-3" /> Add Meeting
                </Button>
            </div>
            
            <div className="table-responsive">
                <Table bordered size="sm" className="bg-white align-middle gs-0 gy-3">
                    <thead className="bg-light">
                        <tr className="fw-bolder text-muted fs-8 text-uppercase border-bottom border-gray-200">
                            <th className="ps-4">Meeting Type</th>
                            <th className="min-w-80px">Count</th>
                            <th className="text-end pe-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {meetings.map((m, idx) => (
                            <tr key={idx}>
                                <td className="ps-4">
                                    <Form.Control
                                        type="text"
                                        size="sm"
                                        className="form-control-solid fw-bold"
                                        value={m.config_key}
                                        onChange={(e) => handleChange(idx, 'config_key', e.target.value)}
                                        placeholder="e.g. Meeting"
                                    />
                                </td>
                                <td>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        className="form-control-solid"
                                        value={m.value}
                                        onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                    />
                                </td>
                                <td className="text-end pe-4">
                                    <Button 
                                        variant="icon" 
                                        className="btn btn-icon btn-light-danger btn-sm" 
                                        onClick={() => handleRemoveRow(idx)}
                                    >
                                        <KTIcon iconName="trash" className="fs-4" />
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

