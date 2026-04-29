import { PageLink, PageTitle } from "@metronic/layout/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { KTCard, KTCardBody, KTIcon } from "@metronic/helpers";
import { deleteAnnouncementById, getAllAnnouncements, updateAnnouncementById } from "@services/company";
import { miscellaneousIcons } from "../../../../_metronic/assets/miscellaneousicons";
import dayjs from "dayjs";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, ShareWith } from "@constants/statistics";
import CreateAnnouncementButton from "@pages/dashboard/views/CreateAnnouncementButton";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { Modal } from "react-bootstrap";
import { Field, Form, Formik } from "formik";
import * as Yup from "yup";
import MultiSelectInput from "@pages/dashboard/views/MultiSelectInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import HighlightErrors from "@app/modules/errors/components/HighlightErrors";
import { fetchAllUsers } from "@services/users";
import { uploadUserAsset } from "@services/uploader";
import { IAnnouncement } from "@models/company";
import { hasPermission } from "@utils/authAbac";

const announcement: Array<PageLink> = [
    { title: "Company", path: "#", isSeparator: false, isActive: false },
    { title: "", path: "", isSeparator: true, isActive: false },
];

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

interface IAnnouncementEdit {
    id: number;
    title: string;
    content: string;
    imageUrl: string;
    fromDate: string;
    toDate: string;
    createdAt: string;
    description: string;
    shareWith: string;
}


function Announcements() {
    const isAdmin = useSelector(
        (state: RootState) => state.auth.currentUser.isAdmin
    );
    const [whomToShareWith, setWhomToShareWith] = useState(ShareWith.EVERYONE);
    const [showEditModal, setShowEditModal] = useState(false);
    const [announcementsList, setAnnouncementsList] = useState<IAnnouncement[]>(
        []
    );
    const [announcementToBeDeleted, setAnnouncementToBeDeleted] =
        useState<IAnnouncement | null>(null);
    const [announcementToBeEdited, setAnnouncementToBeEdited] =
        useState<IAnnouncement | null>(null);
    const [loading, setLoading] = useState(false);
    const [refetch, setRefetch] = useState(false);
    const [allUsersList, setAllUsersList] = useState([]);
    const [showDeleteModal, setshowDeleteModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const userId = useSelector((state: RootState) => state.auth.currentUser.id);
    const itemsPerPage = 7;
     console.log("announcementsList ==========================>",announcementsList);
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

    const handleShowEditModal = (announcement: IAnnouncement) => {
        setShowEditModal(true);
        setAnnouncementToBeEdited(announcement);
    };

    const handleEditClose = () => {
        setShowEditModal(false);
        // setAnnouncementToBeEdited(null);
    };

    // useEffect(() => {
    //     console.log("announcementToBeEdited", announcementToBeEdited);
    // }, [announcementToBeEdited])

    const handleDeleteClose = () => {
        setshowDeleteModal(false);
        setAnnouncementToBeDeleted(null);
    };

    const handleShowDeleteModal = (announcement: IAnnouncement) => {
        setshowDeleteModal(true);
        setAnnouncementToBeDeleted(announcement);
    };

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const {
                    data: { announcements },
                } = await getAllAnnouncements();
                setAnnouncementsList(announcements);
            } catch (error) {
                console.error("Error fetching announcements:", error);
            }
        };
        fetchAnnouncements();
    }, [refetch]);

    const handleDelete = async (id: string) => {
        try {
            const res = await deleteAnnouncementById(id);
            if (!res?.hasError) {
                successConfirmation("Announcement deleted successfully");
                setRefetch(!refetch);
            } else {
                errorConfirmation("Failed to delete announcement");
            }
        } catch (error) {
            console.error("Error deleting announcement:", error);
            errorConfirmation("Failed to delete announcement");
        }
        setshowDeleteModal(false);
    };

    const handleEdit = async (announcement: IAnnouncement) => {
        announcement.shareWith = whomToShareWith;
        if (announcement?.fromDate) announcement.fromDate = dayjs(announcement?.fromDate).format("YYYY-MM-DD");
        if (announcement?.toDate) announcement.toDate = dayjs(announcement?.toDate).format("YYYY-MM-DD");
        const res = await updateAnnouncementById(announcement, announcement.id);
        if (!res?.hasError) {
            successConfirmation("Announcement updated successfully");
            setRefetch(!refetch);
        } else {
            errorConfirmation("Failed to update announcement");
        }
        setShowEditModal(false);
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


    // Filter out expired announcements (where toDate has passed)
    // const filteredAnnouncementsList = useMemo(() => {
    //     const now = new Date().getTime();
    //     return announcementsList.filter((announcement) => {
    //         const toTime = new Date(announcement.toDate).getTime();
    //         return toTime >= now; // Only show announcements where toDate is in the future or current
    //     });
    // }, [announcementsList]); 

    // const { paginatedData, totalPages } = useMemo(() => {
    //     const total = Math.ceil(filteredAnnouncementsList.length / itemsPerPage) || 1;
    //     const paginated = filteredAnnouncementsList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
    //     return { paginatedData: paginated, totalPages: total };
    // }, [filteredAnnouncementsList, currentPage, itemsPerPage]);

    const { paginatedData, totalPages } = useMemo(() => {
        const total = Math.ceil(announcementsList.length / itemsPerPage) || 1;
        const paginated = announcementsList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
        return { paginatedData: paginated, totalPages: total };
    }, [announcementsList, currentPage, itemsPerPage]);

    // Handler for pagination
    const handlePageChange = useCallback((newPage: number) => {
        setCurrentPage(newPage);
    }, []);

    return (
        <>
            <PageTitle breadcrumbs={announcement}>Announcements</PageTitle>
            <div className="px-lg-9 px-4 py-3">
                <div className="d-flex align-items-center justify-content-between w-100 ">
                    <PageHeadingTitle />
                    <div >
                        <div className="col-lg-12">
                            {isAdmin && (
                                <div className="card-toolbar text-end">
                                    <CreateAnnouncementButton
                                        setRefetch={setRefetch}
                                        refetch={refetch}
                                        style="btn btn-sm btn-light-primary"
                                        showPlusIcon
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <KTCard className="shadow-sm my-5">
                    {hasPermission(resourceNameMapWithCamelCase.announcement, permissionConstToUseWithHasPermission.readOthers) && (
                        <KTCardBody>
                            {paginatedData?.length > 0 &&
                                paginatedData.map((announcement) => {
                                    const now = new Date().getTime();
                                    const fromTime = new Date(announcement.fromDate).getTime();
                                    const toTime = new Date(announcement.toDate).getTime();
                                    const isLive = fromTime <= now && toTime >= now;
                                    const notStarted = fromTime > now;
                                    return (
                                        <div key={announcement?.id} className="d-flex my-5 gap-8">
                                            <div
                                                style={{
                                                    position: "relative",
                                                    width: "105px",
                                                    height: "75px", 
                                                    overflow: "hidden",
                                                    borderRadius: "5px", 
                                                }}
                                                className="my-auto"
                                            >
                                                <img
                                                    src={announcement.imageUrl}
                                                    alt=""
                                                    className="rounded"
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        display: "block",
                                                    }}
                                                />

                                                {!isLive && (
                                                    <div
                                                        style={{
                                                            position: "absolute",
                                                            inset: 0,
                                                            backgroundColor: "rgba(128, 128, 128, 0.5)",
                                                        }}
                                                    ></div>
                                                )}
                                            </div>
                                            

                                            <div
                                                className="d-flex align-items-center justify-content-center flex-column gap-4"
                                                style={{
                                                    width: "100%",
                                                    marginRight: "auto",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "100%",
                                                        marginRight: "auto",
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        justifyContent: "space-between",
                                                        
                                                    }}
                                                    className="position-relative"
                                                >
                                                    <h3
                                                        style={{
                                                            fontSize: "14px",
                                                            fontFamily: "Inter",
                                                            fontWeight: "500",
                                                        }}
                                                        // className="truncate-text-mobile"
                                                    >
                                                        {announcement.title}
                                                    </h3>
                                                    <div className="d-flex ">
                                                        {hasPermission(resourceNameMapWithCamelCase.announcement, permissionConstToUseWithHasPermission.editOthers) && <div
                                                            className="btn p-0 btn-active-color-primary btn-sm"
                                                            onClick={() => handleShowEditModal(announcement)}
                                                        >
                                                            <KTIcon
                                                                iconName="pencil"
                                                                className="fs-3 cursor-pointer"
                                                            />
                                                        </div>}

                                                        {hasPermission(resourceNameMapWithCamelCase.announcement, permissionConstToUseWithHasPermission.deleteOthers) && <div
                                                            className="btn p-0 btn-active-color-primary btn-sm"
                                                            onClick={() => handleShowDeleteModal(announcement)}
                                                        >
                                                            <KTIcon
                                                                iconName="trash"
                                                                className="fs-3 cursor-pointer"
                                                            />
                                                        </div>}
                                                    </div>
                                                </div>
                                                <div
                                                    className="d-flex flex-wrap flex-row align-items-start justify-content-start w-full"
                                                    style={{ marginRight: "auto" }}

                                                >
                                                    {isLive ? (
                                                        <div className="d-flex flex-row align-items-center justify-content-start gap-1">
                                                            <div
                                                                style={{
                                                                    padding: "3px",
                                                                    borderRadius: "100%",
                                                                    backgroundColor: "#1AD148",
                                                                    color: "#fff",
                                                                }}
                                                            ></div>
                                                            <div
                                                                style={{
                                                                    color: "#1AD148",
                                                                    fontFamily: "Inter",
                                                                    fontSize: "12px",
                                                                    fontWeight: "500",
                                                                }}
                                                            >
                                                                Live
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex flex-row align-items-center justify-content-start gap-1">
                                                            <div
                                                                style={{
                                                                    padding: "3px",
                                                                    borderRadius: "100%",
                                                                    backgroundColor: "#94A4BB",
                                                                    color: "#fff",
                                                                }}
                                                            ></div>
                                                            <div
                                                                style={{
                                                                    color: "#94A4BB",
                                                                    fontFamily: "Inter",
                                                                    fontSize: "12px",
                                                                    fontWeight: "500",
                                                                }}
                                                            >
                                                                {notStarted ? "Not Started" : "Ended"}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <img
                                                        src={miscellaneousIcons.Rectangle95}
                                                        alt=""
                                                        className="d-none d-md-inline mx-3 "
                                                    />
                                                    <div
                                                        style={{
                                                            color: "#94A4BB",
                                                            fontFamily: "Inter",
                                                            fontSize: "12px",
                                                            fontWeight: "500",
                                                        }}
                                                    >
                                                        {dayjs(announcement.fromDate).format("DD MMM YYYY")} -{" "}
                                                        {dayjs(announcement.toDate).format("DD MMM YYYY")}
                                                    </div>
                                                    <img
                                                        src={miscellaneousIcons.Rectangle95}
                                                        alt=""
                                                        className="d-none d-md-inline mx-3"
                                                    />
                                                    <div
                                                        className="d-flex flex-row align-items-center justify-content-start gap-1"
                                                        style={{
                                                            color: "#94A4BB",
                                                            fontFamily: "Inter",
                                                            fontSize: "12px",
                                                            fontWeight: "500",
                                                        }}
                                                    >
                                                        {announcement?.shareWith === ShareWith.EVERYONE ? (
                                                            <img src={miscellaneousIcons.people} alt="" />
                                                        ) : (
                                                            <img src={miscellaneousIcons.singlePerson} alt="" />
                                                        )}
                                                        <div>
                                                            {announcement?.shareWith === ShareWith.EVERYONE
                                                                ? "Everyone"
                                                                : announcement?.shareWith === ShareWith.DEPARTMENT
                                                                    ? "Department"
                                                                    : "Selected Members"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            {announcementsList?.length === 0 && <div style={{ minHeight: "50vh", backgroundColor: '#F9FBFF' }} className="card d-flex justify-content-center align-items-center">
                                <div className="d-flex flex-column align-items-center justify-content-center" style={{ color: "#9CAFC9" }}>
                                    <img src={miscellaneousIcons.announcementsIcon} alt="" />
                                    <div className="fs-14 text-center">No announcements found</div>
                                </div>
                            </div>}
                            {/* Pagination section */}

                            {announcementsList.length > itemsPerPage && (
                                <div className="d-flex justify-content-center mt-3 gap-3">
                                    <div
                                        className={`fs-2 cursor-pointer ${currentPage === 0 ? "text-muted" : ""}`}
                                        onClick={() => currentPage > 0 && handlePageChange(currentPage - 1)}
                                        style={{ color: currentPage === 0 ? "gray" : "#000", cursor: currentPage === 0 ? "not-allowed" : "pointer" }}
                                    >
                                        <KTIcon iconName="arrow-left" className="fs-2" />
                                    </div>
                                    <span className="fs-5">
                                        {currentPage + 1} / {totalPages}
                                    </span>
                                    <div
                                        className={`fs-2 cursor-pointer ${currentPage >= totalPages - 1 ? "text-muted" : ""}`}
                                        onClick={() => currentPage < totalPages - 1 && handlePageChange(currentPage + 1)}
                                        style={{ color: currentPage >= totalPages - 1 ? "gray" : "#000", cursor: currentPage >= totalPages - 1 ? "not-allowed" : "pointer" }}
                                    >
                                        <KTIcon iconName="arrow-right" className="fs-2" />
                                    </div>
                                </div>
                            )}
                        </KTCardBody>
                    )}
                </KTCard>
            </div>

            <Modal
                show={showDeleteModal}
                onHide={handleDeleteClose}
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
            >
                <Modal.Body>
                    <div className="d-flex flex-column align-items-center justify-content-center gap-5">
                        <Modal.Title
                            id="contained-modal-title-vcenter"
                            className="d-flex flex-row align-items-center justify-content-center w-100"
                        >
                            <div className="fs-2">Delete Announcement</div>
                        </Modal.Title>
                        <div className="fs-14 text-center text-primary">
                            Are you sure you want to delete this announcement?
                        </div>
                        <div className="fs-14 border p-3 rounded">
                            {announcementToBeDeleted?.title}
                        </div>
                        <div className="d-flex gap-4">
                            <button
                                className="btn btn-sm btn-light-primary py-2"
                                onClick={handleDeleteClose}
                            >
                                Cancel
                            </button>
                            {announcementToBeDeleted?.id && (
                                <button
                                    className="btn btn-sm btn-primary py-2"
                                    onClick={() => handleDelete((announcementToBeDeleted?.id))}
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            <Modal show={showEditModal} onHide={handleEditClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Announcement</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Formik
                        initialValues={announcementToBeEdited!}
                        onSubmit={handleEdit}
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
                                    <label className="col-lg-4 col-form-label  fs-6 small">
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
                                                value={formikProps.values?.selectedUsers}
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

export default Announcements;
