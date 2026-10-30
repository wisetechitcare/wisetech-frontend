import { PageLink, PageTitle } from "@metronic/layout/core";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { PageHeadingTitle } from "@metronic/layout/components/header/page-title/PageHeadingTitle";
import { KTCard, KTCardBody, KTIcon } from "@metronic/helpers";
import { deleteAnnouncementById, getAllAnnouncements } from "@services/company";
import { miscellaneousIcons } from "../../../../_metronic/assets/miscellaneousicons";
import dayjs from "dayjs";
import { ShareWith } from "@constants/statistics";
import CreateAnnouncementButton from "@pages/dashboard/views/CreateAnnouncementButton";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { confirmDialog } from "@app/modules/common/components/ui";
import { IAnnouncement } from "@models/company";
import { canSection } from "@utils/can";
import AnnouncementFormDialog from "./AnnouncementFormDialog";
import { Button } from "@/ds/ui/button";

const announcement: Array<PageLink> = [
    { title: "Company", path: "#", isSeparator: false, isActive: false },
    { title: "", path: "", isSeparator: true, isActive: false },
];

function Announcements() {
    const canWrite = canSection("settings.announcements", "write");
    const [showEditModal, setShowEditModal] = useState(false);
    const [announcementsList, setAnnouncementsList] = useState<IAnnouncement[]>(
        []
    );
    const [announcementToBeEdited, setAnnouncementToBeEdited] =
        useState<IAnnouncement | null>(null);
    const [refetch, setRefetch] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 7;

    const handleShowEditModal = (announcement: IAnnouncement) => {
        setShowEditModal(true);
        setAnnouncementToBeEdited(announcement);
    };

    const handleEditClose = () => {
        setShowEditModal(false);
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
                successConfirmation("Announcement deleted.");
                setRefetch(!refetch);
            } else {
                errorConfirmation("Failed to delete announcement");
            }
        } catch (error) {
            console.error("Error deleting announcement:", error);
            errorConfirmation("Failed to delete announcement");
        }
    };

    const handleConfirmDelete = async (item: IAnnouncement) => {
        if (!item.id) return;
        const confirmed = await confirmDialog({
            title: "Delete Announcement",
            text: `Are you sure you want to delete "${item.title}"?`,
            confirmText: "Delete",
            cancelText: "Cancel",
            danger: true,
        });
        if (!confirmed) return;
        await handleDelete(item.id);
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
                            {canWrite && (
                                <div className="card-toolbar text-end">
                                    <CreateAnnouncementButton
                                        setRefetch={setRefetch}
                                        refetch={refetch}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <KTCard className="shadow-sm my-5">
                    {/* Announcements are for everyone to read: Read lists them; New / edit / delete need Write. */}
                    {canSection("settings.announcements", "read") && (
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
                                                        {canWrite && <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            aria-label="Edit announcement"
                                                            onClick={() => handleShowEditModal(announcement)}
                                                        >
                                                            <KTIcon
                                                                iconName="pencil"
                                                                className="fs-3 cursor-pointer"
                                                            />
                                                        </Button>}

                                                        {canWrite && <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            aria-label="Delete announcement"
                                                            onClick={() => handleConfirmDelete(announcement)}
                                                        >
                                                            <KTIcon
                                                                iconName="trash"
                                                                className="fs-3 cursor-pointer"
                                                            />
                                                        </Button>}
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
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Previous page"
                                        disabled={currentPage === 0}
                                        onClick={() => currentPage > 0 && handlePageChange(currentPage - 1)}
                                    >
                                        <KTIcon iconName="arrow-left" className="fs-2" />
                                    </Button>
                                    <span className="fs-5">
                                        {currentPage + 1} / {totalPages}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Next page"
                                        disabled={currentPage >= totalPages - 1}
                                        onClick={() => currentPage < totalPages - 1 && handlePageChange(currentPage + 1)}
                                    >
                                        <KTIcon iconName="arrow-right" className="fs-2" />
                                    </Button>
                                </div>
                            )}
                        </KTCardBody>
                    )}
                </KTCard>
            </div>

            <AnnouncementFormDialog
                open={showEditModal}
                onClose={handleEditClose}
                announcement={announcementToBeEdited}
                onSaved={() => setRefetch(!refetch)}
            />
        </>
    );
}

export default Announcements;
