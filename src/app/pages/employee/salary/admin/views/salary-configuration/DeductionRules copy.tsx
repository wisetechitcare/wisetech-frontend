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
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import { fetchConfiguration, updateConfigurationById } from "@services/company";
import { successConfirmation } from "@utils/modal";
import { DEDUCTIONS } from "@constants/configurations-key";
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

const deductionTypeSchema = Yup.object({
  name: Yup.string().required().label("Name"),
  value: Yup.number().required().typeError("Value must be a valid number!").label("Value"),
  type: Yup.string().required().label("Type")
});

function DeductionRules() {
  const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);

  const [configurationRule, setConfigurationRule] = useState({});
  const [configurationId, setConfigurationId] = useState('');
  const [configurationTable, setConfigurationTable] = useState<ISalary[]>([]);

  const [oldValue, setOldValue] = useState({ name: undefined, value: '', type: '' });

  const options = [{ value: 'percentage', label: 'Percentage' }, { value: 'number', label: 'Number' }];

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);

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
    setEditMode(false);
    initialState = {
      name: '',
      value: '',
      type: ''
    }
    setOldValue({ name: undefined, value: '', type: '' });
  };

  const handleDelete = async (rowDetails: any) => {
    let config: any = configurationRule;

    delete config[rowDetails.name];

    const payload = {
      module: DEDUCTIONS,
      configuration: config
    };

    await updateConfigurationById(configurationId, payload);
    successConfirmation('Deductions Rule deleted successfully');
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
      module: DEDUCTIONS,
      configuration: config
    };

    try {
      setLoading(true);
      if (editMode) {
        await updateConfigurationById(configurationId, payload);
        setLoading(false);
        successConfirmation('Deductions Rule updated successfully');
        fetchPayrollConfiguration();
        setShow(false);
        setEditMode(false);
        return;
      }

      await updateConfigurationById(configurationId, payload);
      setLoading(false);
      successConfirmation('Deductions Rule created successfully');
      fetchPayrollConfiguration();
      setShow(false);
    } catch (err) {
      fetchPayrollConfiguration();
      setLoading(false);
    }
  };

  const handleClose = () => {
    setShow(false);
  };

  async function fetchPayrollConfiguration() {
    const { data: { configuration } } = await fetchConfiguration(DEDUCTIONS);
    const jsonObject = JSON.parse(configuration.configuration);
    setConfigurationRule(jsonObject);
    setConfigurationId(configuration.id);

    // console.log(jsonObject);

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

  const columnsDeductionRules = [
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
      Cell: ({ renderedCellValue }: any) => renderedCellValue,
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
            return (
              <div className="flex items-center space-x-4 w-[100%]">
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
                {resDelete && <button
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
    <div className="mb-10 bg-white p-8" style={{ borderRadius: "15px" }}>
      <div>
        <h2>Deductions Rules</h2>
      </div>
      <MaterialTable
        columns={columnsDeductionRules}
        data={configurationTable}
        hideExportCenter={true}
        hideFilters={true}
        employeeId={employeeId}
        enableBottomToolbar={false}
        muiTableHeadCellStyle={{
          boxShadow: "none",
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
          },
        }}
        tableName="Deductions Rules"
      />

      {(hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.create) && hasPermission(resourceNameMapWithCamelCase.salary, permissionConstToUseWithHasPermission.readOthers)) && <div
        className="py-1 rounded-3 my-4 d-flex justify-content-end align-items-start"
        style={{ paddingRight: "1.25rem" }}
      >
        <button
          className="d-flex justify-content-between align-items-end bg-primary  btn btn-lg btn-primary fs-5 w-auto"
          onClick={() => handleNew()}
        >
          Add New
        </button>
      </div>}

      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode ? "Edit Deduction Rule" : "New Deduction Rule"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={initialState}
            onSubmit={handleSubmit}
            validationSchema={deductionTypeSchema}
            enableReinitialize={true}
          >
            {(formikProps) => (
              <Form
                className="d-flex flex-column"
                noValidate
                id="deduction_rules_form"
                placeholder={undefined}
              >
                <div className="row">
                  <div className="col-lg-6">
                    <TextInput
                      isRequired={true}
                      label="Enter Name"
                      margin="mb-7"
                      formikField="name"
                    />
                  </div>

                  <div className="col-lg-6">
                    <TextInput
                      isRequired={true}
                      label="Enter Value"
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

export default DeductionRules;