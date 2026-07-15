import { resolveActiveOrgId } from '@utils/activeOrg';
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues } from "formik";
import { Modal } from "react-bootstrap";
import { MRT_ColumnDef } from "material-react-table";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import TextInput from "@app/modules/common/inputs/TextInput";
import { createDesignation, fetchDesignations, updateDesignationById } from "@services/options";
import { successConfirmation } from '@utils/modal';
import { ICompanyDesignation } from "@models/company";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';

const designationSchema = Yup.object({
    role: Yup.string().required().label('Designation Name'),
    companyId: Yup.string(),
    isActive: Yup.boolean(),
});

const initialState: ICompanyDesignation = {
    role: "",
    companyId: "",
    isActive: false
}

interface Designation {
    id: string;
    role: string;
    comanyId: string;
}

function Designations() {
    const [showModal, setShowModal] = useState(false);
    const [data, setData] = useState<Designation[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [designationId, setDesignationId] = useState('')
    const [loading, setLoading] = useState(false);
    const [initialValues, setInitialValues] = useState<ICompanyDesignation>(initialState);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const [companyId, setCompanyId] = useState<string>('');
    const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);


    useEffect(() => {
        const loadDesignations = async () => {
            setLoading(true);
            try {
                const { data: { designations = [] } = {} } = await fetchDesignations();
                setData(designations?.map((des: Designation) => ({
                    ...des,
                    employeeCount: 0
                })));
                let currCompanyId = designations[0]?.companyId;

                if (!currCompanyId) {
                    const { data: { companyOverview } } = await fetchCompanyOverview();
                    currCompanyId = (resolveActiveOrgId(companyOverview) ?? '');
                }
                setCompanyId(currCompanyId);


            } catch (error) {
                console.error("Error fetching designations:", error);
            } finally {
                setLoading(false);
            }
        };
        loadDesignations();
    }, []);

    const handleEditClick = (id: string) => {
        setDesignationId(id);
        const designation: any = data.find(des => des.id === id);
        if (designation) {
            setInitialValues({
                role: designation.role,
                companyId: designation.companyId,
                isActive: false
            });
            setEditMode(true);
            setShowModal(true);
        }
    };

    const columns = useMemo<MRT_ColumnDef<Designation>[]>(
        () => {
            const cols: MRT_ColumnDef<Designation>[] = [
                {
                    accessorKey: "role",
                    header: "Designation Name",
                    Cell: ({ renderedCellValue }) => renderedCellValue
                },
                {
                    accessorKey: "employeeCount",
                    header: "Total Employees",
                    Cell: ({ row }: any) => {
                        const employeeCount = row.original._count?.Employees || 0;
                        return <span>{employeeCount}</span>;
                    }
                },
            ];

            if (isAdmin && hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.editOthers)) {
                cols.push({
                    accessorKey: "actions",
                    header: "Actions",
                    Cell: ({ row }: any) => (
                        <button
                            className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                            onClick={() => handleEditClick(row.original.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <i className="bi bi-pencil" style={{ fontSize: '16px' }} />
                        </button>
                    ),
                });
            }

            return cols;
        },
        [isAdmin, data]
    );

    const handleClose = () => {
        setShowModal(false);
        setEditMode(false);
        setInitialValues(initialState);
        setDesignationId("");
    };

    const handleSubmit = async (values: any, actions: FormikValues) => {
        try {
            setLoading(true);
            if (editMode) {
                await updateDesignationById(designationId, values);
                setLoading(false);
                successConfirmation('Designation updated successfully');
                setShowModal(false);
                setEditMode(false);
                // Refresh data
                const { data: { designations = [] } = {} } = await fetchDesignations();
                setData(designations);
                return;
            }
            const payload = [{ isActive: true, companyId: companyId, role: values.role }];
            await createDesignation(payload);
            setLoading(false);
            successConfirmation('Designation created successfully');
            setShowModal(false);
            // Refresh data
            const { data: { designations = [] } = {} } = await fetchDesignations();
            setData(designations);
        } catch (err) {
            setLoading(false);
        }
    };

    return (
        <>
            <style>{KEYFRAMES}</style>
            <ConfigPageLayout
              title="Designations"
              subtitle="Manage job designations and roles in your organization"
              icon="bi-briefcase"
              actions={
                isAdmin && hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.create) ? (
                  <button
                    onClick={() => setShowModal(true)}
                    style={{
                      ...{
                        backgroundColor: C.primary,
                        color: '#fff',
                        border: 'none',
                        borderRadius: RADIUS.md,
                        padding: '8px 16px',
                        fontFamily: FONT.body,
                        fontWeight: 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: `0 4px 12px ${C.primaryShadow}`,
                        transition: 'all 0.2s ease',
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 18px ${C.primaryShadowMd}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 12px ${C.primaryShadow}`;
                    }}
                  >
                    <i className="bi bi-plus-lg" style={{ fontSize: '14px' }} />
                    New Designation
                  </button>
                ) : null
              }
            >
              {hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.readOthers) && (
                <ConfigSectionCard
                  title={`${data.length} Designation${data.length !== 1 ? 's' : ''}`}
                  description="View and manage all designations configured in your organization"
                  icon="bi-list-ul"
                  iconColor="blue"
                  badge={{ label: `${data.length}`, color: C.info, bg: C.infoLight }}
                  loading={loading}
                >
                  <div style={{ marginTop: SP.md }}>
                    <MaterialTable
                      columns={columns}
                      data={data}
                      tableName="Designations"
                      employeeId={employeeId}
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
                  </div>
                </ConfigSectionCard>
              )}
            </ConfigPageLayout>

            <Modal show={showModal} onHide={handleClose} centered backdropClassName="modal-backdrop-blur">
                <Modal.Header closeButton style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}>
                    <Modal.Title style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '16px', color: C.textPrimary }}>
                        {editMode ? 'Edit Designation' : 'Create New Designation'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: SP.lg }}>
                    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={designationSchema}>
                        {(formikProps) => (
                            <Form>
                                <div style={{ marginBottom: SP.lg }}>
                                    <TextInput
                                        isRequired={true}
                                        label="Designation Name"
                                        formikField="role"
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: SP.md, paddingTop: SP.lg }}>
                                  <button
                                    type='button'
                                    onClick={handleClose}
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
                                      disabled={loading || !formikProps.isValid}
                                      style={{
                                        backgroundColor: loading || !formikProps.isValid ? `${C.primary}80` : C.primary,
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: RADIUS.md,
                                        padding: '8px 16px',
                                        fontFamily: FONT.body,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        cursor: loading || !formikProps.isValid ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!loading && formikProps.isValid) {
                                          e.currentTarget.style.transform = 'translateY(-2px)';
                                          e.currentTarget.style.boxShadow = `0 6px 18px ${C.primaryShadowMd}`;
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                    >
                                        {!loading && (editMode ? 'Update Designation' : 'Create Designation')}
                                        {loading && (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: `2px solid rgba(255,255,255,0.3)`, borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />
                                                Please wait...
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </Form>
                        )}
                    </Formik>
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
    );
}

export default Designations;
