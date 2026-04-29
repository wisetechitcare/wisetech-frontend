import MaterialTable from "@app/modules/common/components/MaterialTable";
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
    const jsonObject = JSON.parse(configuration.configuration);
    setConfigurationRule(jsonObject);
    setConfigurationId(configuration.id);


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
    <div className="mb-10 mt-10 bg-white p-8" style={{ borderRadius: "15px" }}>
      <div>
        <h2>Custom Rules</h2>
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
        <Modal.Header closeButton>
          <Modal.Title>
            Edit {oldValue.name || "Custom Rule"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                placeholder={undefined}
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

                <div className="d-flex justify-content-end mt-4">
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
    </div>
  );
}

export default CustomRules;