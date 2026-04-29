import { KTIcon } from '@metronic/helpers';
import { fetchConfiguration, updateConfigurationById } from '@services/company';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Button, Card, ListGroup, Modal } from 'react-bootstrap'
import { Form, Formik, FormikValues } from 'formik';
import TextInput from '@app/modules/common/inputs/TextInput';
import { successConfirmation } from '@utils/modal';
import { LEAVE_MANAGEMENT } from '@constants/configurations-key';
import RadioInput from '@app/modules/common/inputs/RadioInput';
import { onSiteAndHolidayWeekendSettingsOnOffName } from '@constants/statistics';

const ruleSchema = Yup.object({
    name: Yup.string().required().label('Rule'),
    value: Yup.string().required().label('To Follow'),
});

let initialState = {
    name: "",
    value: "",
};

export const timeToMinutes = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
};

const Rules = ({ fromAdmin = false, title , hideGeneralSettings}: { fromAdmin?: boolean, title?: string, hideGeneralSettings?: boolean }) => {
    const [configuration, setConfiguration] = useState({});

    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [show, setShow] = useState(false);

    const [ruleId, setRuleId] = useState('');

    const [oldValue, setOldValue] = useState({ name: undefined, value: '' });

    const handleClose = () => {
        setShow(false);
        setEditMode(false);
    }

    const handleEdit = (rule: any) => {
        setShow(true);
        initialState = {
            name: rule.name,
            value: rule.value
        };
        setEditMode(true);
        setOldValue(rule);
    }

    const handleDelete = async (rule: any) => {
        let config: any = configuration;
        delete config[rule.name];

        const payload = {
            module: LEAVE_MANAGEMENT,
            configuration: config
        };

        await updateConfigurationById(ruleId, payload);
        successConfirmation('Rule deleted successfully');
        fetchLeaveConfiguration();
    }

    const handleNew = () => {
        setShow(true);
        setEditMode(false);
        initialState = {
            name: '',
            value: ''
        }
        setOldValue({ name: undefined, value: '' });
    }

    const handleSubmit = async (values: any, actions: FormikValues) => {
        let config: any = configuration;
        
        if (oldValue.name !== undefined) {
            const keys = Object.keys(config);
            const position = keys.indexOf(oldValue.name);

            const entries = Object.entries(config);
            entries.splice(position, 1, [values.name, values.value]);

            config = Object.fromEntries(entries);
        }

        config[values.name] = values.value;

        const payload = {
            module: LEAVE_MANAGEMENT,
            configuration: config
        };

        try {
            setLoading(true);
            if (editMode) {
                await updateConfigurationById(ruleId, payload);
                setLoading(false);
                successConfirmation('Rule updated successfully');
                fetchLeaveConfiguration();
                setShow(false);
                setEditMode(false);
                return;
            }

            await updateConfigurationById(ruleId, payload);
            setLoading(false);
            successConfirmation('Rule created successfully');
            fetchLeaveConfiguration();
            setShow(false);
        } catch (err) {
            setLoading(false);
        }
    }


    const minutesToTimeFormat = (totalMinutes: number): string => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}:${minutes.toString().padStart(2, '0')} Hrs`;
    };

    async function fetchLeaveConfiguration() {
        const { data: { configuration } } = await fetchConfiguration('leave management');
        const jsonObject = JSON.parse(configuration.configuration);

        // Parse check-in and check-out times
        const checkInTime = jsonObject["Check-in time"];
        const checkOutTime = jsonObject["Check-out time"];
        const lunchTime = jsonObject["Lunch Time"];
        const deductionTime = jsonObject["Deduction Time"];

        // Parse lunch time (assuming format "1:00 PM - 1:30 PM")
        const [lunchStart, lunchEnd] = lunchTime.split(' - ');
        const lunchStartTime = timeToMinutes(lunchStart);
        const lunchEndTime = timeToMinutes(lunchEnd);
        const lunchDuration = lunchEndTime - lunchStartTime;

        // Parse work times
        const checkInMinutes = timeToMinutes(checkInTime);
        const checkOutMinutes = timeToMinutes(checkOutTime);

        // Calculate total shift time (check-out - check-in)
        let totalShiftMinutes = checkOutMinutes - checkInMinutes;
        if (totalShiftMinutes < 0) totalShiftMinutes += 24 * 60; // Handle overnight shifts

        // Calculate working time (total shift - lunch)
        let workingMinutes = totalShiftMinutes - lunchDuration;
        if (workingMinutes < 0) workingMinutes = 0;

        // Update the configuration with calculated values
        const updatedConfig = {
            ...jsonObject,
            "Working time": minutesToTimeFormat(workingMinutes),
            "Total Shift time": minutesToTimeFormat(totalShiftMinutes),
            "Deduction Time": minutesToTimeFormat(lunchDuration)
        };

        setConfiguration(updatedConfig);
        setRuleId(configuration.id);
    }


    useEffect(() => {
        fetchLeaveConfiguration();
    }, []);

    return (
        <>
            <Card style={{ height: '100%', borderRadius: '12px', border: 'none', boxShadow: '8px 8px 16px 0px rgba(0, 0, 0, 0.04)' }}>
                <Card.Body className="d-flex flex-column" style={{ height: '100%', padding: '24px' }}>
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                backgroundColor: '#e9f1fd',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <KTIcon iconName="note-2" className="fs-2 text-primary" />
                            </div>
                            <h4 className="fw-bold mb-0" style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif'
                            }}>{title ? title : 'Attendance and Leave Rules'}</h4>
                        </div>
                        <ListGroup variant="flush">
                            {Object.entries(configuration)
                                .filter(([name, value]) => {
                                    if (hideGeneralSettings) {
                                        return name !== 'Number of Annual Leaves allowed per month' &&
                                               name !== onSiteAndHolidayWeekendSettingsOnOffName;
                                    }
                                    return true;
                                })
                                .map(([name, value]) =>
                                <ListGroup.Item key={name}>
                                    <strong>{name}</strong>
                                    <span className="float-end">
                                        {name == onSiteAndHolidayWeekendSettingsOnOffName ? (String(value)=='1' ? 'On': 'Off' ) : String(value)}
                                        {fromAdmin && <button
                                            className="btn btn-icon btn-active-color-primary  btn-sm ps-2 pr-0"
                                            onClick={() => handleEdit({ name, value })}
                                            style={{ backgroundColor: 'transparent', border: 'none', paddingLeft: '4px' }}>
                                            <KTIcon iconName="pencil" className="fs-3" />
                                        </button>}
                                        {/* {(fromAdmin && !(name == "Check-in time" || name == "Check-out time")) && <button
                                            className="btn btn-icon btn-active-color-primary btn-sm ps-2 pr-0"
                                            onClick={() => handleDelete({ name, value })}
                                            style={{ backgroundColor: 'transparent', border: 'none', paddingLeft: '4px' }}>
                                            <KTIcon iconName="trash" className="fs-3" />
                                        </button>} */}
                                    </span>
                                </ListGroup.Item>
                            )}
                        </ListGroup>
                    </div>
                    {fromAdmin && <div className="d-flex justify-content-start mt-3">
                        {/* <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                            onClick={() => handleNew()}>Add Configuration</Button> */}
                    </div>}
                </Card.Body>
            </Card >

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Attendance and Leave Rules</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={ruleSchema}>
                        {(formikProps) => {
                            return (
                                <Form className='d-flex flex-column' noValidate id='employee_onboarding_form' placeholder={undefined}>
                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="Rule"
                                            margin="mb-7"
                                            formikField="name" 
                                            readonly={true}
                                        />
                                    </div>
                                    {initialState?.name == onSiteAndHolidayWeekendSettingsOnOffName ? 
                                    <div className="row px-3 my-3">
                                        <div className="col-lg-12 fv-row">
                                            <RadioInput
                                                isRequired={true}
                                                // inputLabel=''
                                                formikField="value"
                                                radioBtns={[
                                                    { label: 'On', value: '1' },
                                                    { label: 'Off', value: '0' },
                                                ]}
                                            />
                                        </div>
                                    </div> : 
                                    <div className="col-lg">
                                        <TextInput
                                            isRequired={true}
                                            label="To Follow"
                                            margin="mb-7"
                                            formikField="value" />
                                        {editMode && <div className="alert"
                                            style={{ backgroundColor: "#FCEDDF", color: "#DD700C", borderColor: "#DD700C" }}>Please edit while keeping the same format as of previous input for "To Follow"</div>}
                                    </div>}
                                    

                                    <div className='d-flex justify-content-end'>
                                        <button type='submit' className='btn btn-primary' style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} disabled={loading || !formikProps.isValid}>
                                            {!loading && 'Save Changes'}
                                            {loading && (
                                                <span className='indicator-progress' style={{ display: 'block' }}>
                                                    Please wait...{' '}
                                                    <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </Form>
                            )
                        }}
                    </Formik>
                </Modal.Body>
            </Modal >
        </>
    )
}

export default Rules;