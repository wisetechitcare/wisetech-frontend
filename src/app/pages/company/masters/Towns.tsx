import MaterialTable from '@app/modules/common/components/MaterialTable';
import TextInput from '@app/modules/common/inputs/TextInput';
import { KTIcon } from '@metronic/helpers';
import { RootState } from '@redux/store';
import { fetchCompanyOverview } from '@services/company';
import { createNewTowns, fetchAllTowns, updateTownById } from '@services/options';
import { successConfirmation } from '@utils/modal';
import { Form, Formik, FormikValues } from 'formik';
import { MRT_ColumnDef } from 'material-react-table';
import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import * as Yup from 'yup';

const townSchema = Yup.object({
    name: Yup.string().required().label('Town'),
});

interface ITown {
    id: string;
    name: string;
}


let initialState: ITown = {
    id: "",
    name: "",
}

function Towns() {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<ITown[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState<ITown>(initialState);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const [companyId, setCompanyId] = useState<string>('');
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [refresh, setRefresh] = useState(false)

    useEffect(() => {
        const loadTowns = async () => {
            setLoading(true);
            try {
                const townsResponse = await fetchAllTowns()                
                const townsOptions = townsResponse.data.towns
                setData(townsOptions)

            } catch (error) {
                console.error("Error fetching employee types:", error);
            } finally {
                setLoading(false);
            }
        };
        loadTowns();
    }, [refresh]);

    const handleEditClick = (id: string) => {
        const employeeTypeData: any = data.find(des => des.id === id);
        
        if (employeeTypeData) {
            setInitialValues({
                id: employeeTypeData.id,
                name: employeeTypeData.name,
            });
            setEditMode(true);
            setShowModal(true);
        }
    };

    const columns = useMemo<MRT_ColumnDef<ITown>[]>(
        () => [
            {
                accessorKey: "name",
                header: "Name",
                Cell: ({ renderedCellValue }) => renderedCellValue
            },
            ...(isAdmin
                ? [{
                    accessorKey: "actions",
                    header: "Actions",
                    Cell: ({ row }: any) => {
                        // const res = hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.editOthers);
                        return <button
                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => handleEditClick(row.original.id)}
                        >
                            <KTIcon iconName='pencil' className='fs-3' />
                        </button>
                    },
                }]
                : []),
        ],
        [data]
    );

    const handleClose = () => {
        setShowModal(false);
        setEditMode(false);
        setInitialValues(initialState);
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
       
        try {
            setLoading(true);
            if (editMode) {                
                await updateTownById(values.id, values);
                setLoading(false);
                successConfirmation('Town updated successfully');
                setShowModal(false);
                setEditMode(false);
                return;
            }
            const payload = { companyId:"" , towns: [values.name] };
            try {
                const res = await createNewTowns(payload);                
            } catch (error) {
                console.log("error: ", error);
            }
            setLoading(false);
            successConfirmation('Town created successfully');
            setShowModal(false);
        } catch (err) {
            setLoading(false);
        } finally {
            setRefresh(prev => !prev);
            setInitialValues(initialState);
        }
    };

    return (
        <>
            <div className="d-flex flex-wrap justify-content-center align-items-center  mt-5">
                {/* {isAdmin && hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.create) &&  */}
                <div className="d-flex align-items-center justify-content-between w-100">
                    <h2>Towns</h2>
                    <div
                        className='card-toolbar text-end'
                        data-bs-toggle='tooltip'
                        data-bs-placement='top'
                        data-bs-trigger='hover'
                        title='Click to add a new Employee Type'
                    >
                        <button onClick={() => setShowModal(true)} className='btn btn-md btn-light-primary'>
                            <KTIcon iconName='plus' className='fs-2' />
                            New Town
                        </button>
                    </div>

                </div>
            </div>
            <div className="">
                {/* {hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.readOthers) && (
                  )} */}
                <MaterialTable columns={columns} data={data} tableName="town" employeeId={employeeId} />
            </div>
            <Modal show={showModal} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editMode ? 'Edit ' : 'Create a new'} Town</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={townSchema}>
                        {(formikProps) => (
                            <Form className='des-flex flex-column' placeholder={''}>
                                <div className="row">
                                    <div className="col-lg-12">
                                        <TextInput
                                            isRequired={true}
                                            label="Name"
                                            formikField="name"
                                        />
                                    </div>
                                </div>
                                <div className='d-flex justify-content-between pt-10'>
                                    <button type='submit' className='btn btn-primary' disabled={loading || !formikProps.isValid}>
                                        {!loading && 'Save Changes'}
                                        {loading && (
                                            <span className='indicator-progress' style={{ display: 'block' }}>
                                                Please wait...{' '}
                                                <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                            </span>
                                        )}
                                    </button>
                                    <button type='button' className='btn btn-secondary ms-2 text-white' onClick={handleClose}>
                                        Cancel
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
                </Modal.Body>
            </Modal>
        </>
    );
}

export default Towns