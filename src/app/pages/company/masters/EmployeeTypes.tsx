import React from 'react'
import { useEffect, useMemo, useState } from "react";
import * as Yup from 'yup';
import { Form, Formik, FormikValues } from "formik";
import { Modal } from "react-bootstrap";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import MaterialTable from "app/modules/common/components/MaterialTable";
import TextInput from "app/modules/common/inputs/TextInput";
import { createNewEmployeeType, fetchEmployeeTypes, updateEmployeeTypeById } from "@services/options";
import { successConfirmation } from '@utils/modal';
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";

const employeeTypeSchema = Yup.object({
    employeeType: Yup.string().required().label('Employee Type'),
    companyId: Yup.string(),
});

let initialState: IEmployeeType = {
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
                  currCompanyId = companyOverview[0]?.id;
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
      () => [
          {
              accessorKey: "employeeType",
              header: "Employee Type",
              Cell: ({ renderedCellValue }) => renderedCellValue
          },
          {
              accessorKey: "employeeCount",
              header: "Total Employees",
              Cell: ({ row }: any) => row.original?._count?.Employees || "-NA-"
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
            <div className="d-flex flex-wrap justify-content-center align-items-center  mt-5">
                {/* {isAdmin && hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.create) &&  */}
                <div className="d-flex align-items-center justify-content-between w-100">
                    <h2 className=''>Employee Types</h2>
                    <div
                        className='card-toolbar text-end'
                        data-bs-toggle='tooltip'
                        data-bs-placement='top'
                        data-bs-trigger='hover'
                        title='Click to add a new Employee Type'
                    >
                        <button onClick={() => setShowModal(true)} className='btn btn-md btn-light-primary'>
                            <KTIcon iconName='plus' className='fs-2' />
                            New Employee Type
                        </button>
                    </div>

                </div>
            </div>
            <div className="">
                {/* {hasPermission(resourceNameMapWithCamelCase.designation, permissionConstToUseWithHasPermission.readOthers) && (
                )} */}
                <MaterialTable columns={columns} data={data} tableName="EmployeeTypes" employeeId={employeeId} />
            </div>
            <Modal show={showModal} onHide={handleClose} centered>
                <Modal.Header closeButton>
                    <Modal.Title>{editMode ? 'Edit ' : 'Create a new'} Employee Type</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik initialValues={initialValues} onSubmit={handleSubmit} validationSchema={employeeTypeSchema}>
                        {(formikProps) => (
                            <Form className='des-flex flex-column' placeholder={''}>
                                <div className="row">
                                    <div className="col-lg-12">
                                        <TextInput
                                            isRequired={true}
                                            label="Employee Type"
                                            formikField="employeeType"
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

export default EmployeeTypes