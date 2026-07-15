import { resolveActiveOrgId } from '@utils/activeOrg';
import React from 'react'
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues } from "formik";
import { Modal } from "react-bootstrap";
import { MRT_ColumnDef } from "material-react-table";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import TextInput from "@app/modules/common/inputs/TextInput";
import { createNewEmployeeType, fetchEmployeeTypes, updateEmployeeTypeById } from "@services/options";
import { successConfirmation } from '@utils/modal';
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

const employeeTypeSchema = Yup.object({
    employeeType: Yup.string().required().label('Employee Type'),
    companyId: Yup.string(),
});

const initialState: IEmployeeType = {
    id: "",
    employeeType: "",
    companyId: "",
}

interface IEmployeeType {
    id: string;
    employeeType: string;
    companyId: string;
}

interface IEmployeeTypeResponse {
    id: string;
    type: string;
    companyId: string;
}

function EmployeeTypes() {
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<IEmployeeType[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<IEmployeeType>(initialState);
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const [companyId, setCompanyId] = useState<string>('');
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const [refresh, setRefresh] = useState(false)


  useEffect(() => {
      const loadEmployeeTypes = async () => {
          setLoading(true);
          try {
              const { data: { employeeTypes = [] } = {} } = await fetchEmployeeTypes();
              setData(employeeTypes?.map((des: IEmployeeTypeResponse) => ({
                  ...des,
                  employeeType: des.type,
                  employeeCount: 0
              })));
              let currCompanyId = employeeTypes[0]?.companyId;

              if (!currCompanyId) {
                  const { data: { companyOverview } } = await fetchCompanyOverview();
                  currCompanyId = (resolveActiveOrgId(companyOverview) ?? '');
                  // console.log("currCompanyId", currCompanyId);     
              }
              setCompanyId(currCompanyId);

          } catch (error) {
              console.error("Error fetching employee types:", error);
          } finally {
              setLoading(false);
          }
      };
      loadEmployeeTypes();
  }, [refresh]);

  const handleEditClick = (id: string) => {
      const employeeTypeData: any = data.find(des => des.id === id);
      if (employeeTypeData) {
          setInitialValues({
              id: employeeTypeData.id,
              employeeType: employeeTypeData.employeeType,
              companyId: employeeTypeData.companyId,
          });
          setEditMode(true);
          setShowModal(true);
      }
  };

  const columns = useMemo<MRT_ColumnDef<IEmployeeType>[]>(
      () => {
          const cols: MRT_ColumnDef<IEmployeeType>[] = [
              {
                  accessorKey: "employeeType",
                  header: "Employee Type",
                  Cell: ({ renderedCellValue }) => renderedCellValue
              },
              {
                  accessorKey: "employeeCount",
                  header: "Total Employees",
                  Cell: ({ row }: any) => {
                      const employeeCount = row.original?._count?.Employees || 0;
                      return <span>{employeeCount}</span>;
                  }
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
              await updateEmployeeTypeById(values);
              setLoading(false);
              successConfirmation('Employee Type updated successfully');
              setShowModal(false);
              setEditMode(false);
              return;
          }
          const payload = { companyId: companyId, employeeTypes: [values.employeeType] };
          await createNewEmployeeType(payload);
          setLoading(false);
          successConfirmation('Employee Type created successfully');
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
              title="Employee Types"
              subtitle="Manage employee type categories in your organization"
              icon="bi-people"
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
                    New Employee Type
                  </button>
                ) : null
              }
            >
              <ConfigSectionCard
                title={`${data.length} Employee Type${data.length !== 1 ? 's' : ''}`}
                description="View and manage all employee types configured in your organization"
                icon="bi-person-badge"
                iconColor="green"
                badge={{ label: `${data.length}`, color: '#16a34a', bg: C.successLight }}
                loading={loading}
              >
                <div style={{ marginTop: SP.md }}>
                  <MaterialTable
                    columns={columns}
                    data={data}
                    tableName="EmployeeTypes"
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
                        {editMode ? 'Edit Employee Type' : 'Create New Employee Type'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: SP.lg }}>
                    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={employeeTypeSchema}>
                        {(formikProps) => (
                            <Form>
                                <div style={{ marginBottom: SP.lg }}>
                                    <TextInput
                                        isRequired={true}
                                        label="Employee Type"
                                        formikField="employeeType"
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
                                        {!loading && (editMode ? 'Update Employee Type' : 'Create Employee Type')}
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

export default EmployeeTypes