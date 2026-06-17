import MaterialTable from '@app/modules/common/components/MaterialTable';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { IWeekend } from '@models/company';
import { saveCurrentEmployee } from '@redux/slices/employee';
import { RootState, store } from '@redux/store';
import { fetchAllBranches, updateBranchById } from '@services/company';
import { hasPermission } from '@utils/authAbac';
import { usePermission } from '@hooks/usePermission';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useFormik } from 'formik';
import { MRT_ColumnDef } from 'material-react-table';
import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import * as Yup from 'yup';

interface weekends {
    id: string,
    orgName: string,
    branchName: string,
    type: string,
    workingAndOffDays: any
}

const initialValues = {
    id: '',
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
    saturday: 0,
    sunday: 0,
};

const weekendSchema = Yup.object().shape({
    monday: Yup.boolean().required(),
    tuesday: Yup.boolean().required(),
    wednesday: Yup.boolean().required(),
    thursday: Yup.boolean().required(),
    friday: Yup.boolean().required(),
    saturday: Yup.boolean().required(),
    sunday: Yup.boolean().required(),
});

function WeekendsAndWorkingDays() {
    const isAdmin = usePermission('settings.manage.all');
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [loading, setLoading] = useState(false);
    const [weekends, setWeekends] = useState<weekends[]>([]);
    const [showWeekendDaysModal, setShowWeekendDaysModal] = useState(false)
    const [currWeekendId, setCurrWeekendId] = useState('');
    const [refetch, setRefetch] = useState(false);
    const [currWeekendValues, setCurrWeekendValues] = useState({
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
    })
    const handleEdit = (row: any) => {
        // console.log("Edit row: ", row);
        setShowWeekendDaysModal(true)
        setCurrWeekendValues({
            monday: row?.workingAndOffDays?.monday == '0' ? true : false,
            tuesday: row?.workingAndOffDays?.tuesday == '0' ? true : false,
            wednesday: row?.workingAndOffDays?.wednesday == '0' ? true : false,
            thursday: row?.workingAndOffDays?.thursday == '0' ? true : false,
            friday: row?.workingAndOffDays?.friday == '0' ? true : false,
            saturday: row?.workingAndOffDays?.saturday == '0' ? true : false,
            sunday: row?.workingAndOffDays?.sunday == '0' ? true : false,
        })

        setCurrWeekendId(row?.id)
    }
    const onClose = () => {
        setShowWeekendDaysModal(false)
    }
    const getWeekendSentenceBasedOnWorkingDaysJson = (workingAndOffDays: any) => {
        if(!workingAndOffDays) return;
        const days = Object.keys(workingAndOffDays);
        return days
            .map((day) => (workingAndOffDays[day] == '0' ? day.charAt(0).toUpperCase() + day.slice(1) : ''))
            .filter((day) => day !== '')
            .join(', ');
    }

    useEffect(() => {
        const getBranchDetails = async () => {
            setLoading(true);
            try {
                const res = await fetchAllBranches();
                const { data: { branches } } = res;
                
                const transformedRes = branches.map((branch: any) => {
                    const weekendMesages = getWeekendSentenceBasedOnWorkingDaysJson(JSON.parse(branch?.workingAndOffDays));
                    
                    return {
                        id: branch.id,
                        // Show the owning org/sub-org so duplicate branch names (e.g. two
                        // "Jogeshwari", "VASHI" vs "Vashi") are no longer ambiguous.
                        orgName: branch.company?.name ?? '—',
                        branchName: branch.name,
                        type: weekendMesages ? `Every ${weekendMesages}` : 'No Holidays',
                        workingAndOffDays: JSON.parse(branch?.workingAndOffDays),
                    }
                })

                setWeekends(transformedRes);

            } catch (error) {
                console.error("Error fetching branches:", error);
            } finally {
                setLoading(false);
            }
        }
        getBranchDetails();
    }, [refetch]);

    const columns = useMemo<MRT_ColumnDef<weekends>[]>(() => [
        {
            accessorKey: 'orgName',
            header: 'Organisation',
            Cell: ({ renderedCellValue }) => renderedCellValue,
        },
        {
            accessorKey: 'branchName',
            header: 'Branch Name',
            Cell: ({ renderedCellValue }) => renderedCellValue,
        },
        {
            accessorKey: 'type',
            header: 'Type',
            Cell: ({ renderedCellValue }) => renderedCellValue,
        },
        ...(isAdmin ? [{
            accessorKey: 'actions',
            header: 'Actions',
            Cell: ({ row }: any) => {
                return ( hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.editOthers) ?
                <div className="flex items-center justify-center space-x-4">
                    {" "}
                    <button
                        className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                        onClick={() => handleEdit(row.original)}
                    >
                        <KTIcon iconName="pencil" className=" inline fs-4 text-red-500" />
                    </button>
                </div>: "Not Allowed")
            },
        }] : []),
    ], [weekends]);

    const formik = useFormik<IWeekend>({
        initialValues: { ...currWeekendValues },
        validationSchema: weekendSchema,
        onSubmit: async (values) => {
            setLoading(true);
            try {
                const modifiedValues = {
                    monday: values.monday ? "0" : "1",
                    tuesday: values.tuesday ? "0" : "1",
                    wednesday: values.wednesday ? "0" : "1",
                    thursday: values.thursday ? "0" : "1",
                    friday: values.friday ? "0" : "1",
                    saturday: values.saturday ? "0" : "1",
                    sunday: values.sunday ? "0" : "1",
                }

                try {
                    const { data: { branch } } = await updateBranchById(currWeekendId, { workingAndOffDays: modifiedValues });
                    const employeeDetails = store.getState().employee.currentEmployee;
                    const stringifiedJson = JSON.stringify(modifiedValues);
                    store.dispatch(saveCurrentEmployee({...employeeDetails,branches : {...employeeDetails?.branches,workingAndOffDays : stringifiedJson}}))
                    setRefetch(prev => !prev);
                    successConfirmation('Successfully updated weekend days');
                } catch (error) {
                    errorConfirmation('Failed to update weekend days');
                    console.error("error: ", error);
                }
                setLoading(false);
                onClose();
            }
            catch {
                errorConfirmation('Failed to create public holiday');
                setLoading(false);
                formik.resetForm();
            }
        },
        enableReinitialize: true,
        validateOnMount: true,
    });

    // Hard-reset the form to the OPENED branch's saved values every time a different branch is
    // edited. Without this, an unsaved checkbox change in one branch carried over into the next
    // branch's modal (the form kept its dirty state). currWeekendId flips to '' on close, so this
    // also fires correctly when reopening the same branch.
    useEffect(() => {
        if (currWeekendId) {
            formik.resetForm({ values: currWeekendValues });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currWeekendId]);


    return (
        <>
            <div className='p-lg-0 px-1 mt-5'>
                <h2>Weekends</h2>
                {hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.readOthers) && 
                <MaterialTable columns={columns} data={weekends} tableName="Weekends And Working Days" enableBottomToolbar={false} employeeId={employeeIdCurrent}/>}
                <Modal show={showWeekendDaysModal} onHide={() => {
                    setShowWeekendDaysModal(false);
                    setCurrWeekendId('');
                    setCurrWeekendValues({
                        monday: false,
                        tuesday: false,
                        wednesday: false,
                        thursday: false,
                        friday: false,
                        saturday: false,
                        sunday: false,
                    })
                    formik.resetForm();
                }} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Customize Weekends</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <form onSubmit={formik.handleSubmit} noValidate className='form'>
                            <div className='row mb-9 w-100 d-flex flex-wrap align-items-center justify-content-center'>
                                <div className='mb-5'>
                                    <p className='h6'>Choose Repeat Days</p>
                                </div>
                                <div className='d-flex w-auto align-items-center justify-content-between gap-2'>
                                    <label htmlFor="monday" className=''>Monday</label>
                                    <input className='form-check-input rounded-circle'
                                        type='checkbox' id="monday" checked={formik.values.monday} {...formik.getFieldProps('monday')} />
                                </div>
                                <div className='d-flex w-auto align-items-center justify-content-between gap-2'>
                                    <label htmlFor="tuesday" className=''>Tuesday</label>
                                    <input className='form-check-input rounded-circle'
                                        type='checkbox' id="tuesday" checked={formik.values.tuesday} {...formik.getFieldProps('tuesday')} />
                                </div>
                                <div className='d-flex w-auto align-items-center justify-content-between gap-2'>
                                    <label htmlFor="wednesday">Wednesday</label>
                                    <input className='form-check-input rounded-circle'
                                        type='checkbox' id="wednesday" checked={formik.values.wednesday} {...formik.getFieldProps('wednesday')} />
                                </div>
                                <div className='d-flex w-auto align-items-center justify-content-between gap-2'>
                                    <label htmlFor="thursday">Thursday</label>
                                    <input className='form-check-input rounded-circle'
                                        type='checkbox' id="thursday" checked={formik.values.thursday} {...formik.getFieldProps('thursday')} />
                                </div>
                                <div className='d-flex w-auto align-items-center justify-content-between gap-2'>
                                    <label htmlFor="friday">Friday</label>
                                    <input className='form-check-input rounded-circle'
                                        type='checkbox' id="friday" checked={formik.values.friday} {...formik.getFieldProps('friday')} />
                                </div>
                                <div className='d-flex w-auto align-items-center justify-content-between gap-2'>
                                    <label htmlFor="saturday">Saturday</label>
                                    <input className='form-check-input rounded-circle'
                                        type='checkbox' id="saturday" checked={formik.values.saturday} {...formik.getFieldProps('saturday')} />
                                </div>
                                <div className='d-flex w-auto align-items-center justify-content-between gap-2'>
                                    <label htmlFor="sunday">Sunday</label>
                                    <input className='form-check-input rounded-circle'
                                        type='checkbox' id="sunday" checked={formik.values.sunday} {...formik.getFieldProps('sunday')} />
                                </div>
                            </div>
                            <div className='card-footer d-flex justify-content-start'>
                                <button type='submit' className='btn btn-primary' disabled={loading || !formik.isValid}>
                                    {!loading && 'Save Changes'}
                                    {loading && (
                                        <span className='indicator-progress' style={{ display: 'block' }}>
                                            Please wait...{' '}
                                            <span className='spinner-border spinner-border-sm align-middle ms-2'></span>
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </Modal.Body>
                </Modal>
            </div>
        </>
    )
}

export default WeekendsAndWorkingDays;