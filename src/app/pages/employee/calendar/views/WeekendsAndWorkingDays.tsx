import MaterialTable from '@app/modules/common/components/MaterialTable';
import { parseWorkingDays } from '@utils/workingDays';
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics';
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
import {
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';

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
                    const weekendMesages = getWeekendSentenceBasedOnWorkingDaysJson(parseWorkingDays(branch?.workingAndOffDays));
                    
                    return {
                        id: branch.id,
                        // Show the owning org/sub-org so duplicate branch names (e.g. two
                        // "Jogeshwari", "VASHI" vs "Vashi") are no longer ambiguous.
                        orgName: branch.company?.name ?? '—',
                        branchName: branch.name,
                        type: weekendMesages ? `Every ${weekendMesages}` : 'No Holidays',
                        workingAndOffDays: parseWorkingDays(branch?.workingAndOffDays),
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

    const columns = useMemo<MRT_ColumnDef<weekends>[]>(() => {
        const cols: MRT_ColumnDef<weekends>[] = [
            {
                accessorKey: 'branchName',
                header: 'Branch Name',
                Cell: ({ renderedCellValue }) => <span>{renderedCellValue}</span>,
            },
            {
                accessorKey: 'type',
                header: 'Holiday Schedule',
                Cell: ({ renderedCellValue }) => <span>{renderedCellValue}</span>,
            },
        ];

        if (isAdmin && hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.editOthers)) {
            cols.push({
                accessorKey: 'actions',
                header: 'Actions',
                Cell: ({ row }: any) => (
                    <button
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: C.primary,
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        onClick={() => handleEdit(row.original)}
                        onMouseEnter={(e) => e.currentTarget.style.color = C.primaryMid}
                        onMouseLeave={(e) => e.currentTarget.style.color = C.primary}
                    >
                        <i className="bi bi-pencil" style={{ fontSize: '16px' }} />
                    </button>
                ),
            });
        }

        return cols;
    }, [weekends, isAdmin]);

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
            <style>{KEYFRAMES}</style>
            <ConfigSectionCard
                title="Weekends & Working Days"
                description="Configure working days and weekend schedules for each branch"
                icon="bi-calendar-week"
                iconColor="teal"
                badge={{ label: `${weekends.length}`, color: C.teal, bg: C.tealLight }}
                loading={loading}
            >
                <div style={{ marginTop: SP.md }}>
                    {hasPermission(resourceNameMapWithCamelCase.branch, permissionConstToUseWithHasPermission.readOthers) &&
                        <MaterialTable
                            columns={columns}
                            data={weekends}
                            tableName="Weekends And Working Days"
                            enableBottomToolbar={false}
                            employeeId={employeeIdCurrent}
                            muiTableProps={{
                                sx: {
                                    '& .MuiTableCell-head': {
                                        backgroundColor: C.bgSection,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        color: C.textPrimary,
                                        fontFamily: FONT.body,
                                    },
                                },
                            }}
                        />
                    }
                </div>
            </ConfigSectionCard>

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
            }} centered backdropClassName="modal-backdrop-blur">
                <Modal.Header closeButton style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}>
                    <Modal.Title style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '16px', color: C.textPrimary }}>
                        Customize Weekend Days
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: SP.lg }}>
                        <form onSubmit={formik.handleSubmit} noValidate>
                            <div style={{ marginBottom: SP.lg }}>
                                <p style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '14px', color: C.textPrimary, marginBottom: SP.md }}>
                                    Select Days Off (Weekend Days)
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SP.md }}>
                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: SP.sm, cursor: 'pointer' }}>
                                            <input
                                                type='checkbox'
                                                id={day}
                                                checked={(formik.values as any)[day]}
                                                {...formik.getFieldProps(day)}
                                                style={{
                                                    width: '18px',
                                                    height: '18px',
                                                    cursor: 'pointer',
                                                    accentColor: C.primary,
                                                    borderRadius: '4px',
                                                }}
                                            />
                                            <span style={{ fontFamily: FONT.body, fontSize: '13px', color: C.textPrimary, fontWeight: 500 }}>
                                                {day.charAt(0).toUpperCase() + day.slice(1)}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: SP.md, paddingTop: SP.lg, borderTop: `1px solid ${C.border}` }}>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setShowWeekendDaysModal(false);
                                        setCurrWeekendId('');
                                        formik.resetForm();
                                    }}
                                    style={{
                                        backgroundColor: C.bgCard,
                                        color: C.textSecondary,
                                        border: `1px solid ${C.border}`,
                                        borderRadius: RADIUS.md,
                                        padding: '8px 16px',
                                        fontFamily: FONT.body,
                                        fontWeight: 500,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = C.bgSection;
                                        e.currentTarget.style.borderColor = C.borderDark;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = C.bgCard;
                                        e.currentTarget.style.borderColor = C.border;
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type='submit'
                                    disabled={loading || !formik.isValid}
                                    style={{
                                        backgroundColor: loading || !formik.isValid ? `${C.primary}80` : C.primary,
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: RADIUS.md,
                                        padding: '8px 16px',
                                        fontFamily: FONT.body,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: loading || !formik.isValid ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading && formik.isValid) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = `0 6px 18px ${C.primaryShadowMd}`;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {!loading && 'Save Changes'}
                                    {loading && (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />
                                            Saving...
                                        </span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </Modal.Body>
                </Modal>

            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
              .modal-backdrop-blur {
                background-color: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(2px);
              }
            `}</style>
        </>
    )
}

export default WeekendsAndWorkingDays;