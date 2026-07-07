import MaterialTable from '@app/modules/common/components/MaterialTable';
import TextInput from '@app/modules/common/inputs/TextInput';
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
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';

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
        () => {
            const cols: MRT_ColumnDef<ITown>[] = [
                {
                    accessorKey: "name",
                    header: "Name",
                    Cell: ({ renderedCellValue }) => renderedCellValue
                },
            ];

            if (isAdmin) {
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
            <style>{KEYFRAMES}</style>
            <ConfigPageLayout
              title="Towns"
              subtitle="Manage towns and geographical locations"
              icon="bi-geo-alt"
              actions={
                isAdmin ? (
                  <button
                    onClick={() => setShowModal(true)}
                    style={{
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
                    New Town
                  </button>
                ) : null
              }
            >
              <ConfigSectionCard
                title={`${data.length} Town${data.length !== 1 ? 's' : ''}`}
                description="View and manage all towns and geographical locations"
                icon="bi-pin-map"
                iconColor="amber"
                badge={{ label: `${data.length}`, color: C.amber, bg: C.amberLight }}
                loading={loading}
              >
                <div style={{ marginTop: SP.md }}>
                  <MaterialTable
                    columns={columns}
                    data={data}
                    tableName="Towns"
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
            </ConfigPageLayout>

            <Modal show={showModal} onHide={handleClose} centered backdropClassName="modal-backdrop-blur">
                <Modal.Header closeButton style={{ borderBottom: `1px solid ${C.border}`, padding: `${SP.md} ${SP.lg}` }}>
                    <Modal.Title style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '16px', color: C.textPrimary }}>
                        {editMode ? 'Edit Town' : 'Create New Town'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: SP.lg }}>
                    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={townSchema}>
                        {(formikProps) => (
                            <Form>
                                <div style={{ marginBottom: SP.lg }}>
                                    <TextInput
                                        isRequired={true}
                                        label="Town Name"
                                        formikField="name"
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
                                        {!loading && (editMode ? 'Update Town' : 'Create Town')}
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

export default Towns