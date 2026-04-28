import MaterialTable from "@app/modules/common/components/MaterialTable";
import TextInput from "@app/modules/common/inputs/TextInput";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import {
  IReimbursementType,
  IReimbursementTypeCreate,
  IReimbursementTypeFetch,
} from "@models/employee";

import { RootState } from "@redux/store";
import { createNewReimbursementType } from "@services/options";
import { uploadUserAsset } from "@services/uploader";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import {
  createReimbursementType,
  deleteReimbursementTypeByItsId,
  fetchAllReimbursementTypesFromDb,
  updateReimbursementTypeById,
} from "@utils/statistics";
import { Form, Formik, FormikValues } from "formik";
import { MRT_ColumnDef } from "material-react-table";
import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "react-bootstrap";
import { useSelector } from "react-redux";
import * as Yup from "yup";

const reimbursementTypeSchema = Yup.object({
  type: Yup.string().required().label("Name"),
  icon: Yup.string().label("Icon"),
});

let initialState = {
  type: "",
  icon: "",
};

function Settings() {
  const [reimbursementTypeData, setReimbursementTypeData] = useState<
    IReimbursementTypeFetch[]
  >([]);
  const isAdmin = useSelector(
    (state: RootState) => state.auth.currentUser.isAdmin
  );
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [fetchAgain, setFetchAgain] = useState(false);
  
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);

  const [selectedReimbursement, setSelectedReimbursement] =
    useState<IReimbursementTypeFetch | null>(null);

  const handleDelete = async (rowDetails: IReimbursementTypeFetch) => {
    // console.log("Deleted reimbursemenetType of: ", rowDetails.id);
    if (!rowDetails || !rowDetails.id) {
      console.log("return because of !rowDetails || !rowDetails.id");
      return;
    }
    const val = await deleteConfirmation(
      "Reimbursement Type Deleted Successfully!"
    );

    if (val) {
      const res = await deleteReimbursementTypeByItsId(rowDetails?.id);
      setFetchAgain((prev) => !prev);
    }
  };

  const columns = useMemo<MRT_ColumnDef<IReimbursementType>[]>(
    () => [
      {
        accessorKey: "icon",
        header: "Icon",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => {
          if (renderedCellValue == "") return <img style={{ width: "50px", height: "50px", borderRadius: "50px", margin: "5px 0px" }} alt="Icon" src={'https://wise-tech-asset-store.s3.ap-south-1.amazonaws.com/15658e56-ee9c-4ac3-abfa-ce8734f7978a/0aa9fbc3296053c60f12004b96021ab31ba20d3650'} />
          return <img style={{ width: "50px", height: "50px", borderRadius: "50px", margin: "5px 0px" }} alt="Icon" src={renderedCellValue} />
        },
      },
      {
        accessorKey: "type",
        header: "Name",
        enableSorting: false,
        enableColumnActions: false,
        Cell: ({ renderedCellValue }: any) => renderedCellValue,
      },
      ...(isAdmin
        ? [
          {
            accessorKey: "actions",
            header: "Actions",
            enableSorting: false,
            enableColumnActions: false,
            Cell: ({ row }: any) => (
              <div className="flex items-center justify-center space-x-4">
                {" "}
                <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                  onClick={() => handleEdit(row.original)}
                >
                  <KTIcon
                    iconName="pencil"
                    className=" inline fs-4 text-red-500"
                  />
                  {/* Edit */}
                </button>
                <button
                  className="btn btn-icon btn-active-color-primary btn-sm w-4"
                  onClick={() => handleDelete(row.original)}
                >
                  <KTIcon
                    iconName="trash"
                    className="inline fs-4 text-red-500"
                  />
                  {/* Delete */}
                </button>
              </div>
            ),
          },
        ]
        : []),
    ],
    []
  );
  const handleClose = () => {
    setShow(false);
    setEditMode(false);
  };

  const handleNew = async () => {
    setReimbursementTypeData([]);

    initialState = {
      type: "",
      icon: "",
    };

    setShow(true);
    setEditMode(false);
  };

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any,
    fileMaxUploadSize: number
  ) => {
    const {
      target: { files },
    } = event;
    if (files && files[0].size > fileMaxUploadSize) {
      alert("File size should not exceed 5 MB");
      // Optionally, set Formik error:
      // formikProps.setFieldError('document', 'File size should not exceed 2 MB');
      event.target.value = ""; // Clear the input
      return;
    }
    if (files && files.length > 0) {
      const form = new FormData();
      form.append("file", files[0]);
      try {
        const { data: { path } } = await uploadUserAsset(form, userId);
        formikProps.setFieldValue("icon", path, true);
        console.log("File uploaded successfully!", path);
      } catch (error) {
        console.error("Failed to upload file. Please try again.");
      }
    }
  };

  const handleEdit = async (rowDetails: IReimbursementTypeFetch) => {
    // console.log("rowDetails: ", rowDetails);

    const rowId = rowDetails.id;

    if (rowDetails) {
      setSelectedReimbursement(rowDetails);
      setEditMode(true);
      setShow(true);
    }
  };

  const handleSubmit = async (values: any, actions: FormikValues) => {
    setLoading(true);

    try {
      // Filter out properties with empty string values
      const payload: IReimbursementTypeCreate = {
        ...values,
        type: values.type,
        icon: values.icon,
      };

      // values.employeeId = employeeId;
      setLoading(true);
      if (editMode && selectedReimbursement) {
        await updateReimbursementTypeById(payload, selectedReimbursement.id);
        successConfirmation("Reimbursement Type updated successfully");
      } else {
        // console.log("payload: ", payload);
        await createReimbursementType(payload);
        successConfirmation("Reimbursement type created successfully");
      }
      setLoading(false);
      setShow(false);
      setEditMode(false);
      setFetchAgain((prev) => !prev);
      setSelectedReimbursement(null);
    } catch (err) {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReimbursementTypesFromDb().then((res) => {
      // console.log("res: ", res);
      setReimbursementTypeData(res);
    });
  }, [show, fetchAgain, selectedReimbursement]);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4">
        <h2 >Reimbursement Categories</h2>

        <div className="d-flex justify-content-end align-items-center pe-4">
          <button
            className="btn btn-lg btn-primary d-flex align-items-center fs-5"
            onClick={handleNew}
          >
            Add New Category
          </button>
        </div>
      </div>

      <MaterialTable
        columns={columns}
        data={reimbursementTypeData}
        hideExportCenter={true}
        employeeId={employeeId}
        muiTableProps={{
          sx: {
            "& .MuiTableBody-root .MuiTableCell-root": {
              borderBottom: "none",
              paddingY: "5px",
            },
            "& .MuiTableBody-root .MuiTableRow-root": {
              // padding: '0px',
            },
            "& .css-1huu0oi-MuiTableCell-root": {
              width: "auto",
            },
          },
        }}
        tableName="Reimbursements"
      />
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editMode
              ? "Edit Reimbursement Category"
              : "New Reimbursement Category"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={
              editMode && selectedReimbursement
                ? selectedReimbursement
                : initialState
            }
            onSubmit={handleSubmit}
            validationSchema={reimbursementTypeSchema}
            enableReinitialize={true} // Allow reinitializing when initialValues change
          >
            {(formikProps) => (
              <Form
                className="d-flex flex-column"
                noValidate
                id="employee_reimbursement_form"
                placeholder={undefined}
              >
                <div className="row">
                  <div className="col-lg-6">
                    <TextInput
                      isRequired={true}
                      label="Enter Name"
                      margin="mb-7"
                      formikField="type"
                    />
                  </div>

                  <div className="col-lg-6">
                    <label className="mb-3 fw-bold">Choose Icon</label>
                    <input
                      type="file"
                      className="form-control form-control-lg form-control-solid"
                      required={(editMode && selectedReimbursement) ? false : true}
                      accept=".svg"
                      // accept=".png, .jpg, .jpeg, .svg"
                      onChange={(event) => uploadFile(event, formikProps, 128 * 1024)}
                    />
                    {formikProps.touched.icon && formikProps.errors.icon && (
                      <div className="fv-plugins-message-container">
                        <div className="fv-help-block">
                          {formikProps.errors.icon}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="d-flex justify-content-start">
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
    </>
  );
}

export default Settings;
