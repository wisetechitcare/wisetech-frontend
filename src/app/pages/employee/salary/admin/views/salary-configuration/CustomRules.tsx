import { safeJsonParse } from '@utils/safeJson';
﻿import MaterialTable from "@app/modules/common/components/MaterialTable";
import TextInput from "@app/modules/common/inputs/TextInput";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { Button, Card, ListGroup, Modal } from "react-bootstrap";
import { RootState } from "@redux/store";
import { Form, Formik, FormikValues } from "formik";
import { MRT_ColumnDef } from "material-react-table";
import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import * as Yup from "yup";
import { fetchConfiguration, updateConfigurationById } from "@services/company";
import { successConfirmation } from "@utils/modal";
import { CUSTOM_SALARY } from "@constants/configurations-key";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

interface ICustomRules {
  name: string,
  period: number,
  deduction_amount: number,
  type: string
}

let initialState = {
  period: "",
  deduction_amount: ""
};

const customRulesSchema = Yup.object({
  period: Yup.number()
    .required()
    .min(1, "Period must be at least 1 day")
    .typeError("Period must be a valid number!")
    .label("Period"),
  deduction_amount: Yup.number()
    .required()
    .min(0, "Deduction amount cannot be less than 0%")
    .max(100, "Deduction amount cannot be more than 100%")
    .typeError("Deduction amount must be a valid number!")
    .label("Deduction Amount")
});

function CustomRules() {
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const [configurationRule, setConfigurationRule] = useState({});
  const [configurationId, setConfigurationId] = useState('');
  const [configurationTable, setConfigurationTable] = useState<ICustomRules[]>([]);

  const [oldValue, setOldValue] = useState({ name: undefined, period: 0, deduction_amount: 0, type: '' });


  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const handleEdit = (rowDetails: any) => {
    setShow(true);
    setEditMode(true);
    initialState = {
      period: rowDetails.period,
      deduction_amount: rowDetails.deduction_amount
    };
    setOldValue(rowDetails);
  };



  const handleSubmit = async (values: any, actions: FormikValues) => {
    let config: any = configurationRule;

    // Find the key for the old value using the old name
    const oldKey = Object.keys(config).find(key => config[key].name === oldValue.name);
    
    if (oldKey) {
      // Update the existing entry with new values
      config[oldKey] = {
        ...config[oldKey],
        period: Number(values.period),
        deduction_amount: Number(values.deduction_amount)
      };
    }

    const payload = {
      module: CUSTOM_SALARY,
      configuration: config
    };

    try {
      setLoading(true);
      await updateConfigurationById(configurationId, payload);
      setLoading(false);
      successConfirmation('Custom Rule updated successfully');
      fetchPayrollConfiguration();
      setShow(false);
      setEditMode(false);
    } catch (err) {
      setLoading(false);
      fetchPayrollConfiguration();
    }
  };

  const handleClose = () => {
    setShow(false);
  };

  async function fetchPayrollConfiguration() {
    const { data: { configuration } } = await fetchConfiguration(CUSTOM_SALARY);
    const jsonObject = safeJsonParse(configuration?.configuration);
    setConfigurationRule(jsonObject);
    setConfigurationId(configuration?.id);


    const tableData = Object.keys(jsonObject).map((gpd: string) => {
      return {
        name: jsonObject[gpd].name,
        period: jsonObject[gpd].period,
        deduction_amount: jsonObject[gpd].deduction_amount,
        type: jsonObject[gpd].type
      }
    });

    setConfigurationTable(tableData);
  }

  useEffect(() => {
    fetchPayrollConfiguration();
  }, []);

  const columnsCustomRules = [
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => `${renderedCellValue?.charAt(0)?.toUpperCase() + renderedCellValue?.slice(1)}`,
    },
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue,
    },
    {
      accessorKey: "period",
      header: "Period",
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => Number(renderedCellValue) >1 ? `${renderedCellValue} days` : `${renderedCellValue} day`,
    },
    {
      accessorKey: "deduction_amount",
      header: "Deduction Amount",
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => `${renderedCellValue}% of daily salary`,
    },
    ...(isAdmin
      ? [
        {
          accessorKey: "actions",
          header: "Actions",
          enableSorting: false,
          muiTableHeadCellProps: {
            align: "right" as "right",
          },
          muiTableBodyCellProps: {
            align: "right" as "right",
          },
          Cell: ({ row }: any) => {
            const resEdit = hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.editOthers);
            return  (
              <div className="flex items-center justify-center space-x-4">
                {" "}
                {resEdit && <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                  onClick={() => handleEdit(row.original)}
                >
                  <KTIcon
                    iconName="pencil"
                    className=" inline fs-4 text-red-500"
                  />
                </button>}
                {!resEdit && "Not Allowed"}
              </div>
            )
          }
        },
      ]
      : []),
  ];

  return (
    <div className="mb-10 sc-container" style={{ padding: '28px', backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px solid #E1E3EA' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #fdf3f4 0%, #fff8f8 100%)',
        borderRadius: '12px',
        border: '1px solid rgba(157,65,65,0.1)',
        marginBottom: '20px',
      }}>
        <div style={{
          width: '34px', height: '34px', borderRadius: '9px',
          background: 'linear-gradient(135deg, #9d4141 0%, #b85555 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 10px rgba(157,65,65,0.25)', flexShrink: 0,
        }}>
          <i className="bi bi-sliders" style={{ fontSize: '15px', color: '#fff' }} />
        </div>
        <div>
          <h2 style={{ fontFamily: 'Barlow, sans-serif', fontWeight: 700, fontSize: '16px', color: '#181C32', margin: 0, letterSpacing: '-0.2px' }}>
            Custom Rules
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#A1A5B7', margin: 0, fontWeight: 400 }}>
            Configure custom salary deduction rules and periods
          </p>
        </div>
      </div>
      <MaterialTable
        columns={columnsCustomRules}
        hideFilters={true}
        data={configurationTable}
        hideExportCenter={true}
        employeeId={employeeId}
        enableBottomToolbar={false}
        muiTableHeadCellStyle={{
          boxShadow: "none",
          margin: "0px",
        }}
        muiTablePaperStyle={{
          boxShadow: "none",
        }}
        muiTableProps={{
          sx: {
            "& .MuiTableBody-root .MuiTableCell-root": {
              borderBottom: "none",
              paddingY: "5px",
            },
            "& .MuiTableBody-root .MuiTableRow-root": {},
          },
        }}
        tableName="ecustomRulesSchema"
      />

      {(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.create) && hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers)) && <div
        className="py-1 rounded-3 my-4 d-flex justify-content-end align-items-start"
        style={{ paddingRight: "1.25rem" }}
      >
        {/* <button
          className="d-flex justify-content-between align-items-end bg-primary  btn btn-lg btn-primary fs-5 w-auto"
          onClick={() => handleNew()}
        >
          Add New
        </button> */}
      </div>}

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Body className="sc-modal-body" style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '28px 32px',
        }}>
          <div className="d-flex justify-content-between align-items-center mb-5">
            <div className="sc-modal-title" style={{
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 700,
              fontSize: '20px',
              color: '#181C32',
              letterSpacing: '-0.4px',
            }}>
              Edit {oldValue.name || "Custom Rule"}
            </div>
            <button 
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                color: '#A1A5B7',
                cursor: 'pointer'
              }}
            >
              <i className="bi bi-x"></i>
            </button>
          </div>
          <Formik
            initialValues={initialState}
            onSubmit={handleSubmit}
            validationSchema={customRulesSchema}
            enableReinitialize={true}
          >
            {(formikProps) => (
              <Form
                className="d-flex flex-column"
                noValidate
                id="custom_rules_form"
               
              >
                <div className="row">
                  <div className="col-lg-12">
                    <TextInput
                      isRequired={true}
                      label="Period (Days)"
                      margin="mb-7"
                      formikField="period"
                      type="number"
                    />
                  </div>

                  <div className="col-lg-12">
                    <TextInput
                      isRequired={true}
                      label="Deduction Amount of a day (%)"
                      margin="mb-7"
                      formikField="deduction_amount"
                      type="number"
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-end sc-form-footer mt-5 pt-4" style={{ borderTop: '1px solid #E1E3EA' }}>
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #E1E3EA',
                      borderRadius: '8px',
                      color: '#3F4254',
                      height: '44px',
                      padding: '0 24px',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: 'pointer',
                      marginRight: '12px',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !formikProps.isValid}
                    style={{
                      backgroundColor: '#9d4141',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      height: '44px',
                      padding: '0 28px',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: (loading || !formikProps.isValid) ? 'not-allowed' : 'pointer',
                      opacity: (loading || !formikProps.isValid) ? 0.7 : 1,
                      boxShadow: '0 4px 12px rgba(157, 65, 65, 0.2)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseOver={(e) => { if (!loading && formikProps.isValid) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={(e) => { if (!loading && formikProps.isValid) e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {!loading && "Save Rule"}
                    {loading && (
                      <>
                        Saving... <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                      </>
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default CustomRules;