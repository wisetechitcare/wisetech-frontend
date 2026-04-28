import { KTIcon } from '@metronic/helpers';
import { fetchConfiguration, updateConfigurationById, createNewConfiguration } from '@services/company';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Button, Card, ListGroup, Modal } from 'react-bootstrap';
import { Form, Formik, FormikValues } from 'formik';
import TextInput from '@app/modules/common/inputs/TextInput';
import { successConfirmation } from '@utils/modal';
import { LOAN_KEY } from '@constants/configurations-key';
import { hasPermission } from '@utils/authAbac';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';

const loanSchema = Yup.object({
    name: Yup.string().required().label('Rule'),
    details: Yup.string().required().label('Details'),
});

let initialState = {
    name: '',
    details: '',
};

const LoanRules = ({ fromAdmin = false }: { fromAdmin?: boolean }) => {
    const [configuration, setConfiguration] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [show, setShow] = useState(false);
    const [ruleId, setRuleId] = useState('');
    const [oldValue, setOldValue] = useState<{ name: string | undefined, details: string }>({ name: undefined, details: '' });

    const handleClose = () => {
        setShow(false);
        setEditMode(false);
    };

    const handleEdit = (rule: any) => {
        setShow(true);
        initialState = {
            name: rule.name,
            details: rule.value.details || ''
        };
        setEditMode(true);
        setOldValue(rule);
    };

    const handleDelete = async (rule: any) => {
        let config: any = { ...configuration };
        delete config[rule.name];

        const payload = {
            module: LOAN_KEY,
            configuration: config,
        };

        await updateConfigurationById(ruleId, payload);
        successConfirmation('Loan rule deleted successfully');
        fetchLoanConfiguration();
    };

    const handleNew = () => {
        setShow(true);
        setEditMode(false);
        initialState = {
            name: '',
            details: ''
        };
        setOldValue({ name: undefined, details: '' });
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
        let config: any = { ...configuration };

        if (oldValue.name !== undefined && oldValue.name !== values.name) {
            delete config[oldValue.name];
        }

        config[values.name] = {
            details: values.details
        };

        const payload = {
            module: LOAN_KEY,
            configuration: config,
        };

        try {
            setLoading(true);
            if(ruleId) {
                await updateConfigurationById(ruleId, payload);
            } else {
                await createNewConfiguration(payload);
            }
            setLoading(false);
            successConfirmation(editMode ? 'Loan rule updated successfully' : 'Loan rule created successfully');
            fetchLoanConfiguration();
            setShow(false);
            setEditMode(false);
        } catch (err) {
            setLoading(false);
        }
    };

    async function fetchLoanConfiguration() {
        const { data: { configuration } } = await fetchConfiguration(LOAN_KEY);

        const configData = typeof configuration.configuration === 'string'
            ? JSON.parse(configuration.configuration)
            : configuration.configuration;

        setConfiguration(configData);
        
        setRuleId(configuration.id);
    }

    useEffect(() => {
        fetchLoanConfiguration();
    }, []);

    return (
        <>
            <Card style={{ height: '100%' }}>
                {
                /* {hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOthers) ?  */}
                <Card.Body className="d-flex flex-column" style={{ height: '100%' }}>
                    <div className="flex-grow-1">
                        <h5 className="fw-bold mb-3">Loan Rules</h5>
                        <ListGroup variant="flush">
                            {Object.entries(configuration).map(([name, value]: [string, any]) => (
                                <ListGroup.Item key={name}>
                                    <strong className="fs-6">{name}</strong>
                                    <span className="float-end">
                                     {value.details}
                                        {fromAdmin && hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.editOthers) && (
                                            <button
                                                className="btn btn-icon btn-active-color-primary btn-sm ps-2 pr-0"
                                                onClick={() => handleEdit({ name, value })}
                                                style={{ backgroundColor: 'transparent', border: 'none', paddingLeft: '4px' }}>
                                                <KTIcon iconName="pencil" className="fs-3" />
                                            </button>
                                        )}
                                        {fromAdmin && hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.editOthers) && (
                                            <button
                                                className="btn btn-icon btn-active-color-primary btn-sm ps-2 pr-0"
                                                onClick={() => handleDelete({ name, value })}
                                                style={{ backgroundColor: 'transparent', border: 'none', paddingLeft: '4px' }}>
                                                <KTIcon iconName="trash" className="fs-3" />
                                            </button>
                                        )}
                                    </span>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                    {hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.readOthers) && hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.create) && (
                        <div className="d-flex justify-content-start mt-3">
                            <Button style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }} onClick={handleNew}>
                                Add Loan Rule
                            </Button>
                        </div>
                    )}
                </Card.Body>
                 {/* : <h2 className="text-center my-5">Not Allowed</h2>
                 } */}
            </Card>

            <Modal show={show} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Loan Rule</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialState} onSubmit={handleSubmit} validationSchema={loanSchema} enableReinitialize>
                        {(formikProps) => (
                            <Form className='d-flex flex-column' noValidate id='loan_rule_form' placeholder={''}>
                                <div className="col-lg">
                                    <TextInput isRequired={true} label="Rule" margin="mb-7" formikField="name" />
                                </div>
                                <div className="col-lg">
                                    <TextInput isRequired={true} label="Details" margin="mb-7" formikField="details" />
                                </div>
                                <div className='d-flex justify-content-end'>
                                    <button
                                        type='submit'
                                        className='btn btn-primary'
                                        style={{ backgroundColor: '#9D4141', borderColor: '#9D4141' }}
                                        disabled={loading || !formikProps.isValid}
                                    >
                                        {!loading && 'Save Changes'}
                                        {loading && (
                                            <span className='indicator-progress' style={{ display: 'block' }}>
                                                Please wait... <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default LoanRules;
