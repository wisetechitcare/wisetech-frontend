import React from "react";
import { useEffect, useState } from "react";
import { createAnnouncement, getAllAnnouncements } from "@services/company";
import { RootState, store } from "@redux/store";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, ShareWith } from "@constants/statistics";
import { useSelector } from "react-redux";
import { Button, Modal } from "react-bootstrap";
import { Field, Form, Formik, FormikValues } from "formik";
import TextInput from "@app/modules/common/inputs/TextInput";
import { uploadUserAsset } from "@services/uploader";
import DateInput from "@app/modules/common/inputs/DateInput";
import HighlightErrors from "@app/modules/errors/components/HighlightErrors";
import * as Yup from "yup";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { fetchAllUsers } from "@services/users";
import MultiSelectInput from "@pages/dashboard/views/MultiSelectInput";
import FileInput from "@app/modules/common/inputs/FileInput";
import { KTIcon } from "@metronic/helpers";
import { hasPermission } from "@utils/authAbac";

const announcementSchema = Yup.object({
  title: Yup.string().required("Title is required"),
  description: Yup.string().required("Description is required"),
  shareWith: Yup.string().required("Share with is required"),
  fromDate: Yup.string().required("From date is required"),
  toDate: Yup.string().required("To date is required"),
  selectedUsers: Yup.array(
    Yup.object().shape({
      id: Yup.string(),
    })
  ),
  imageUrl: Yup.string().required("Image is required"),
});

function CreateAnnouncementButton({
  setRefetch,
  refetch,
  style="btn btn-primary",
  showPlusIcon = false
}: {
  setRefetch: (value: boolean) => void;
  refetch: boolean;
  style?: string;
  showPlusIcon?: boolean;
}) {

  const [whomToShareWith, setWhomToShareWith] = useState(ShareWith.EVERYONE);
  const [selectedMembersList, setSelectedMembersList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );

  const userId = useSelector((state: RootState) => state.auth.currentUser.id);

  useEffect(() => {
    if (whomToShareWith != ShareWith.SELECTED_MEMBERS) return;
    async function getAllUsers() {
      try {
        const {
          data: { users },
        } = await fetchAllUsers();
        setAllUsersList(users);
      } catch (error) {
        console.error("Failed to fetch users");
      }
    }
    getAllUsers();
  }, [whomToShareWith]);

  const handleNew = () => {
    setShow(true);
  };

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any
  ) => {
    const {
      target: { files },
    } = event;
    if (files && files.length > 0) {
      const form = new FormData();
      form.append("file", files[0]);
      if (!userId) return;
      try {
        const {
          data: { path },
        } = await uploadUserAsset(form, userId);

        formikProps.setFieldValue("imageUrl", path);
      } catch (error) {
        console.error("Failed to upload file. Please try again.");
      }
    }
  };

  const handleSubmit = async (values: any, actions: FormikValues) => {

    if(whomToShareWith===ShareWith.SELECTED_MEMBERS && values.selectedUsers?.length === 0){
        errorConfirmation("Selected Users Is Required")
        return;
    }

    const res = await createAnnouncement(values);

    if (res && !res.hasError) {
      successConfirmation("Announcement created successfully");
      setShow(false);
      setRefetch(!refetch);
    } else {
      errorConfirmation(
        "Failed to create announcement, please try again later"
      );
    }
  };

  return (
    <>
      <div className="d-flex justify-content-end px-4">
         {hasPermission(resourceNameMapWithCamelCase.announcement, permissionConstToUseWithHasPermission.create) && <button className={`${style}`} onClick={handleNew} style={{backgroundColor:'#AA393D', color:'White', padding:'10px 20px', borderRadius:'5px'}}>
        {/* {showPlusIcon && <KTIcon iconName='plus' className='fs-3' />} */}
        New Announcement
      </button>}
      </div>
      <Modal show={show} onHide={() => setShow(false)}>
        <Modal.Header closeButton>
          <Modal.Title>New Announcement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={{
              title: "",
              description: "",
              shareWith: ShareWith.EVERYONE,
              fromDate: "",
              toDate: "",
              selectedUsers: [],
              imageUrl: "",
            }}
            onSubmit={handleSubmit}
            validationSchema={announcementSchema}
            enableReinitialize={true} // Allow reinitializing when initialValues change
          >
            {(formikProps) => (
              <Form
                className="d-flex flex-column"
                noValidate
                id="employee_reimbursement_form"
                placeholder={undefined}
              >
                <div className="row d-flex flex-direction-column">
                  <label className="col-lg-4 col-form-label fs-6 small">
                    Share With
                  </label>
                  <div className="d-flex flex-column mb-7 fv-row">
                    <span className="form-check form-check-custom form-check-solid">
                      <div key={ShareWith.EVERYONE}>
                        <Field
                          className="form-check-input"
                          type="radio"
                          name="shareWith"
                          value={ShareWith.EVERYONE}
                          checked={whomToShareWith === ShareWith.EVERYONE}
                          onChange={() => {
                            setWhomToShareWith(ShareWith.EVERYONE);
                            formikProps.setFieldValue(
                              "shareWith",
                              ShareWith.EVERYONE
                            );
                          }}
                        />
                        <span className="px-2">{"Everyone"}</span>
                      </div>
                      <div key={ShareWith.SELECTED_MEMBERS}>
                        <Field
                          className="form-check-input"
                          type="radio"
                          name="shareWith"
                          value={ShareWith.SELECTED_MEMBERS}
                          checked={
                            whomToShareWith === ShareWith.SELECTED_MEMBERS
                          }
                          onChange={() => {
                            setWhomToShareWith(ShareWith.SELECTED_MEMBERS);
                            formikProps.setFieldValue(
                              "shareWith",
                              ShareWith.SELECTED_MEMBERS
                            );
                          }}
                        />
                        <span className="px-2">{"Selected Members"}</span>
                      </div>
                    </span>
                  </div>
                </div>
                {whomToShareWith === ShareWith.SELECTED_MEMBERS && (
                  <div className="row">
                    <div className="col-lg-12">
                      <MultiSelectInput
                        label="Select Users"
                        options={allUsersList}
                        value={formikProps.values.selectedUsers}
                        onChange={formikProps.setFieldValue}
                        // closeMenuOnSelect={false}
                        placeholder="Select Users"
                        formikField="selectedUsers"
                        margin="mb-4"
                        isRequired={true}
                      />
                      
                    </div>
                  </div>
                )}
                <div className="row">
                  <div className="col-lg-12">
                    <TextInput
                      isRequired={true}
                      label="Announcement Title"
                      margin="mb-4"
                      formikField="title"
                    />
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-lg-6 ">
                    <DateInput
                      isRequired={true}
                      inputLabel={"Select From Date"}
                      formikProps={formikProps}
                      formikField="fromDate"
                      placeHolder={"Select Date"}
                    />
                  </div>
                  <div className="col-lg-6">
                    <DateInput
                      isRequired={true}
                      inputLabel={"Select To Date"}
                      formikProps={formikProps}
                      formikField="toDate"
                      placeHolder={"Select Date"}
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-lg-12 mb-4">
                    <label className="mb-3 fw-bold required">
                      Choose Icon/Image
                    </label>

                    <input
                      type="file"
                      className="form-control form-control-lg form-control-solid"
                      required={true}
                      accept=".png, .jpg, .jpeg, .svg"
                      onChange={(event) => uploadFile(event, formikProps)}
                    />
                    {formikProps.touched.imageUrl &&
                      formikProps.errors.imageUrl && (
                        <div className="fv-plugins-message-container">
                          <div className="fv-help-block">
                            {formikProps.errors.imageUrl}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
                <div className={`d-flex flex-column fv-row mb-4`}>
                  <label className="d-flex align-items-center fs-6 form-label mb-2">
                    <span className={`required`}>Description</span>
                  </label>

                  <Field name={"description"}>
                    {({ field }: { field: any }) => {
                      const handleChange = (
                        e: React.ChangeEvent<HTMLTextAreaElement>
                      ) => {
                        const { value } = e.target;

                        field.onChange(e);
                      };
                      return (
                        <textarea
                          {...field}
                          className={`employee__form_wizard__input form-control `}
                          onChange={handleChange}
                          rows={5}
                        />
                      );
                    }}
                  </Field>

                  <HighlightErrors
                    isRequired={true}
                    formikField={"description"}
                  />
                </div>

                <div className="d-flex justify-content-start">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !formikProps.isValid}
                  >
                    {/* || !formikProps.isValid */}
                    {!loading && "Post"}
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

export default CreateAnnouncementButton;
