import { fetchCompanyOverview } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { Form, Formik } from 'formik';
import React, { useEffect, useState } from 'react'
import { Modal } from 'react-bootstrap';
import * as Yup from "yup";
import TextInput from '../inputs/TextInput';

const commonInputSchema = Yup.object({
    name: Yup.string().required().label("Name"),
});

function CommonModal({ show, setShow, functionToCallOnModalSubmit, fieldName, functionToSetFieldOptions }: {
    show: boolean,
    setShow: any,
    functionToCallOnModalSubmit: any,
    fieldName?: string,
    functionToSetFieldOptions?: any,
}) {
    const [loading, setLoading] = useState(false);
    const [companyId, setCompanyId] = useState('');
    const handleClose = () => setShow(false);
    let initialState = {
        name: "",
    };
    const handleSubmit = (values: any) => {
        try {
            setLoading(true);
            if (!functionToCallOnModalSubmit || !fieldName) {
                return;
            }
            let finalData: any = { companyId: companyId };
            finalData[fieldName] = [values?.name];
            functionToCallOnModalSubmit(finalData).then((res: any) => {
                successConfirmation("Successfully created the option!");
                functionToSetFieldOptions((prev:boolean)=>!prev);
            })
            setLoading(false);
            setShow(false);
        } catch (error) {
            errorConfirmation("Something went wrong, please try again later!");
            console.log("error: ", error);
        }
    };

    useEffect(() => {
        async function fetchData() {
            if (show && !companyId) {
                const { data: { companyOverview } } = await fetchCompanyOverview();
                setCompanyId(companyOverview[0]?.id);
            }
        }
        fetchData();
    }, [show, companyId])

    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>
                    Add New Item
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Formik
                    initialValues={
                        initialState
                    }
                    onSubmit={(values) => {
                        handleSubmit(values);
                    }}
                    validationSchema={commonInputSchema}
                    enableReinitialize={true}
                >
                    {(formikProps) => (
                        <Form
                            className="d-flex flex-column"
                            noValidate
                            id="common_input_form"
                            placeholder={undefined}
                        >
                            <div className="row">
                                <div className="col-lg-12">
                                    <TextInput
                                        isRequired={true}
                                        label="Enter Name"
                                        margin="mb-7"
                                        formikField="name"
                                    />
                                </div>
                            </div>

                            <div className="d-flex justify-content-start">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loading || !formikProps.isValid}
                                >
                                    {!loading && "Submit"}
                                    {loading && (
                                        <span
                                            className="indicator-progress"
                                            style={{ display: "block" }}
                                        >
                                            Please wait...{" "}
                                            <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                        </span>
                                    )}
                                </button>
                            </div>
                        </Form>
                    )}
                </Formik>
            </Modal.Body>
        </Modal>
    )
}

export default CommonModal