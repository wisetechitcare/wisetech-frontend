import MaterialTable from "@app/modules/common/components/MaterialTable";
import TextInput from "@app/modules/common/inputs/TextInput";
import { KTIcon } from "@metronic/helpers";
import { Modal } from "react-bootstrap";
import { RootState } from "@redux/store";
import { Form, Formik, FormikValues } from "formik";
import { MRT_ColumnDef } from "material-react-table";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import * as Yup from "yup";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import { fetchConfiguration, updateConfigurationById } from "@services/company";
import { GROSS_PAY } from "@constants/configurations-key";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

interface ISalary {
  name: string,
  value: string,
  type: string
}

let initialState = {
  name: "",
  value: "",
  type: ""
};

const grossPayTypeSchema = Yup.object({
  name: Yup.string().required().label("Name"),
  value: Yup.number().required().typeError("Value must be a valid number!").label("Value"),
  type: Yup.string().required().label("Type")
});

const GrossPayDistribution = () => {
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const [configurationRule, setConfigurationRule] = useState({});
  const [configurationId, setConfigurationId] = useState('');
  const [configurationTable, setConfigurationTable] = useState<ISalary[]>([]);

  const [oldValue, setOldValue] = useState({ name: undefined, value: '', type: '' });

  const options = [{ value: 'percentage', label: 'Percentage' }, { value: 'number', label: 'Number' }];

  const [grossPayDataError, setgrossPayDataError] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isBasicSalaryRow, setIsBasicSalaryRow] = useState(false);

  const handleEdit = (rowDetails: any) => {
    setShow(true);
    setEditMode(true);
    initialState = {
      name: rowDetails.name,
      value: rowDetails.value,
      type: rowDetails.type
    };
    setOldValue(rowDetails);
  };

  const handleNew = () => {
    setShow(true);
    setIsBasicSalaryRow(false);
    setEditMode(false);
    initialState = {
      name: '',
      value: '',
      type: ''
    }
    setOldValue({ name: undefined, value: '', type: '' });
  };

  const handleDelete = async (rowDetails: any) => {
    const sure = await deleteConfirmation('Gross Pay Rule deleted successfully')
    if(!sure) return;
    let config: any = configurationRule;

    delete config[rowDetails.name];

    const payload = {
      module: GROSS_PAY,
      configuration: config
    };

    await updateConfigurationById(configurationId, payload);
    // successConfirmation('Gross Pay Rule deleted successfully');
    fetchPayrollConfiguration();
  };

  const handleSubmit = async (values: any, actions: FormikValues) => {
    let config: any = configurationRule;

    if (oldValue.name !== undefined) {
      const keys = Object.keys(config);
      const position = keys.indexOf(oldValue.name);

      const entries = Object.entries(config);
      entries.splice(position, 1, [values.name, values.value]);

      config = Object.fromEntries(entries);
    }

    config[values.name] = { name: values.name, value: Number(values.value), type: values.type };

    const payload = {
      module: GROSS_PAY,
      configuration: config
    };

    try {
      setLoading(true);
      if (editMode) {
        await updateConfigurationById(configurationId, payload);
        setLoading(false);
        successConfirmation('Gross Pay Rule updated successfully');
        fetchPayrollConfiguration();
        setShow(false);
        setEditMode(false);
        return;
      }

      await updateConfigurationById(configurationId, payload);
      setLoading(false);
      successConfirmation('Gross Pay Rule created successfully');
      fetchPayrollConfiguration();
      setShow(false);
    } catch (err) {
      fetchPayrollConfiguration();
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    setIsBasicSalaryRow(false);
  };

  async function fetchPayrollConfiguration() {
    const { data: { configuration } } = await fetchConfiguration(GROSS_PAY);
    const jsonObject = JSON.parse(configuration.configuration);
    setConfigurationRule(jsonObject);
    setConfigurationId(configuration.id);
    const tableData = Object.keys(jsonObject).map((gpd: string) => {
      return {
        name: gpd,
        value: jsonObject[gpd].value,
        type: jsonObject[gpd].type
      }
    });
    setConfigurationTable(tableData);
  }

  useEffect(() => {
    fetchPayrollConfiguration();
  }, []);

  useEffect(() => {
    let totalPercentage = 0;

    configurationTable.forEach((ele) => {
      totalPercentage += parseFloat(ele.value);
    });

    if (totalPercentage > 100) {
      setgrossPayDataError(true);
    } else {
      setgrossPayDataError(false);
    }
  }, [configurationTable]);



  const columnsGrossPay = [
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => renderedCellValue,
    },
    {
      accessorKey: "value",
      header: "Value",
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => `${renderedCellValue}`,
    },
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: false,
      enableColumnActions: false,
      Cell: ({ renderedCellValue }: any) => `${renderedCellValue?.charAt(0)?.toUpperCase() + renderedCellValue?.slice(1)}`,
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
            const resDelete = hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.deleteOthers);
            
            const rowName = row.original.name?.toLowerCase()?.split(" ")?.join("");
            console.log("rowName:: ",rowName);
            const isBasicSalaryRowCurr = rowName === "basicsalary";
            console.log("isBasicSalaryRow:: ",isBasicSalaryRowCurr);
            return (
              <div className="">
                {" "}
                {resEdit && <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                  onClick={() => {
                    setIsBasicSalaryRow(isBasicSalaryRowCurr);
                    handleEdit(row.original);
                  }}
                >
                  <KTIcon
                    iconName="pencil"
                    className=" inline fs-4 text-red-500"
                  />
                </button>}
                {resDelete && !isBasicSalaryRowCurr && <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-4"
                  onClick={() => handleDelete(row.original)}
                >
                  <KTIcon
                    iconName="trash"
                    className="inline fs-4 text-red-500"
                  />
                </button>}
                {!resEdit && !resDelete && "Not Allowed"}
              </div>
            )
          }
        },
      ]
      : []),
  ];

  return (
    <div className="mb-10 p-8" style={{ backgroundColor: '#f8f9fa', borderRadius: '16px', border: '1px solid #E1E3EA' }}>
      <div className="d-flex justify-content-between align-items-center mb-6">
        <h2 style={{
          fontFamily: 'Barlow, sans-serif',
          fontWeight: 700,
          fontSize: '24px',
          color: '#181C32',
          letterSpacing: '-0.5px',
          margin: 0
        }}>Gross Pay Distribution</h2>
        
        {(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.create) && hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers)) && (
          <button
            className="btn btn-sm d-flex align-items-center gap-2"
            onClick={() => handleNew()}
            style={{
              backgroundColor: '#9d4141',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(157, 65, 65, 0.15)',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(157, 65, 65, 0.2)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(157, 65, 65, 0.15)'; }}
          >
            <i className="bi bi-plus-lg"></i> Add New Category
          </button>
        )}
      </div>
      <MaterialTable
        columns={columnsGrossPay}
        data={configurationTable}
        hideFilters={true}
        hideExportCenter={true}
        enableBottomToolbar={false}
        employeeId={employeeId}
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
            "& .MuiTableFooter-root	": {
              display: "none",
            },
          },
        }}
        tableName="Gross Pay Distribution"
      />
      {grossPayDataError && (
        <div style={{
          backgroundColor: '#fff5f8',
          border: '1px dashed #f1416c',
          borderRadius: '8px',
          padding: '16px',
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="bi bi-exclamation-triangle-fill fs-3 text-danger"></i>
          <p className="text-danger mb-0 fw-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
            Total value is more than 100% please verify and rebalance
          </p>
        </div>
      )}

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Body style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '32px 40px',
        }}>
          <div className="d-flex justify-content-between align-items-center mb-5">
            <div style={{
              fontFamily: 'Barlow, sans-serif',
              fontWeight: 700,
              fontSize: '22px',
              color: '#181C32',
              letterSpacing: '-0.5px',
            }}>
              {editMode ? "Edit Distribution Category" : "New Distribution Category"}
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
            validationSchema={grossPayTypeSchema}
          >
            {(formikProps) => (
              <Form
                className="d-flex flex-column"
                noValidate
                id="gross_pay_distribution_form"
               
              >
                <div className="row">
                  <div className="col-lg-6">
                    <TextInput
                      isRequired={true}
                      label="Enter Name"
                      margin="mb-7"
                      formikField="name"
                      readonly={isBasicSalaryRow}
                    />
                  </div>

                  <div className="col-lg-6">
                    <TextInput
                      isRequired={true}
                      label="Enter value"
                      margin="mb-7"
                      formikField="value"
                    />
                  </div>

                  <div className="col-lg-12">
                    <DropDownInput
                      isRequired={true}
                      formikField="type"
                      inputLabel="Enter Type"
                      options={options} />
                  </div>
                </div>

                <div className="d-flex justify-content-end mt-5 pt-4" style={{ borderTop: '1px solid #E1E3EA' }}>
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
                    {!loading && "Save Category"}
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

export default GrossPayDistribution;