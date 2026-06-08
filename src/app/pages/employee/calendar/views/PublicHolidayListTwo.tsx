import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useMemo, useState, useEffect } from "react";
import { MRT_ColumnDef } from "material-react-table";
import { deletePublicHolidayById, fetchPublicHolidays } from "@services/company";
import dayjs from 'dayjs';
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { KTIcon } from "@metronic/helpers";
import { errorConfirmation, successConfirmation, deleteConfirmation } from "@utils/modal";
import { Modal } from "react-bootstrap";
import PublicHoliday from "@pages/company/PublicHoliday";
import { IPublicHolidayUpdate } from "@models/company";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { useEventBus } from "@hooks/useEventBus";

interface PublicHoliday {
    id: string,
    date: string,
    day: string,
    name: string,
    type: string
}

function PublicHolidaysListTwo({ getNotification, selectedYear }: { getNotification: any, selectedYear?: number }) {
    const dispatch = useDispatch();
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [refetch, setRefetch] = useState(false);
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [rawHolidaysData, setRawHolidaysData] = useState<IPublicHolidayUpdate[]>([]);
    const [currentEditHolidayData, setCurrentEditHolidayData] = useState<IPublicHolidayUpdate | null>(null);
    const [loading, setLoading] = useState(false);
    const [holidayNameForEditMode, setHolidayNameForEditMode] = useState('');
    const currentYear = (selectedYear || new Date().getFullYear()) + '';
    const [showEditModal, setShowEditModal] = useState(false);
    const [holidaysList, setHolidaysList] = useState<[{ label: string, value: string }]>();
    const country = 'India';
    const handleEdit = (row: any) => {
        setShowEditModal(true)
        const id = row?.id;
        const holiday = rawHolidaysData.find(holiday => holiday.id === id);

        const holidayObject = holidaysList?.find(holidayVal => holidayVal.value === holiday?.holidayId);
        if (holiday) {
            const finalDate = holiday?.date.toString();
            const [day, month, year] = finalDate.split('-');
            const date = `${year}-${month}-${day}`;
            
            setCurrentEditHolidayData({
                ...holiday,
                date: date,
            });
            setHolidayNameForEditMode(holidayObject?.label || '');
        }
    }

    const handleDelete = async (row: any) => {
        const confirmed = await deleteConfirmation('Are you sure you want to delete this holiday?');
        
        if (confirmed) {
            try {
                const res = await deletePublicHolidayById(row?.id as string);
                if (!res?.hasError) {
                    setRefetch(prev => !prev);
                  
                }
            } catch (error) {
                console.log("error: ", error);
                errorConfirmation('Failed to delete public holiday!');
            }
        }
    }

    const getAllPublicHolidays = async () => {
        setLoading(true);
        try {
            const { data: { publicHolidays } } = await fetchPublicHolidays(currentYear, country)            
            const transformedRes2: IPublicHolidayUpdate[] = publicHolidays.map((holiday: any) => ({
                id: holiday.id,
                date: dayjs(holiday.date).format('DD-MM-YYYY'),
                holidayId: holiday?.holidayId,
                isFixed: holiday?.isFixed,
                isActive: holiday?.isActive,
                isWeekend: holiday?.isWeekend,
                colorCode: holiday?.colorCode,
                observedIn: holiday?.observedIn,
                companyId: holiday?.companyId,
                from: holiday?.from,
                to: holiday?.to,
            }));

            const res = publicHolidays?.map((holiday: any) => ({
                label: holiday?.holiday?.name,
                value: holiday?.holiday?.id
            }));

            setHolidaysList(res);
            setRawHolidaysData(transformedRes2);
            const transformedRes = publicHolidays.map((holiday: any) => ({
                id: holiday.id,
                date: dayjs(holiday.date).format('DD-MM-YYYY'),
                day: dayjs(holiday.date).format('dddd'),
                name: holiday?.holiday?.name,
                type: holiday?.isFixed ? 'Fixed' : 'Not Fixed'
            }));

            setHolidays(transformedRes);

            } catch (error) {
                console.error("Error fetching Public Holidays:", error);
            } finally {
                setLoading(false);
            }
        };

    // fetch on component mount
    useEventBus("holidayUpdated", () => {
        getAllPublicHolidays();
    });
    useEffect(() => {
        getAllPublicHolidays();
    }, [country, currentYear, refetch, getNotification, selectedYear]);

    const columns = useMemo<MRT_ColumnDef<PublicHoliday>[]>(() => [
        {
            accessorKey: 'date',
            header: 'Holiday Date',
            Cell: ({ renderedCellValue }) => renderedCellValue,
        },
        {
            accessorKey: 'day',
            header: 'Day',
            Cell: ({ renderedCellValue }) => renderedCellValue,
        },
        {
            accessorKey: 'name',
            header: 'Name',
            Cell: ({ renderedCellValue }) => renderedCellValue,
        },
        {
            accessorKey: 'type',
            header: 'Type',
            Cell: ({ renderedCellValue }) => renderedCellValue,
        },
        ...(isAdmin ? [{
            accessorKey: 'actions',
            header: 'Actions',
            Cell: ({ row }: any) => {
                const allowdEdit = hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers);
                const allowDelete = hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.deleteOthers);
                return <div className="flex items-center justify-center space-x-4">
                {" "}
                {allowdEdit && <button
                    className="btn btn-icon btn-active-color-primary btn-sm w-[20px]"
                    onClick={() => handleEdit(row.original)}
                >
                    <KTIcon iconName="pencil" className=" inline fs-4 text-red-500" />
                </button>}
                {allowDelete && <button
                    className="btn btn-icon btn-active-color-primary btn-sm w-4"
                    onClick={() => handleDelete(row.original)}
                >
                    <KTIcon iconName="trash" className="inline fs-4 text-red-500" />
                </button>}
                {!allowdEdit && !allowDelete && "Not Allowed"}
            </div>
            },
        }] : []),
    ], [holidays])

    return (
        <>
            <div className="px-lg-0 px-1">
               {hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.readOthers) && <MaterialTable columns={columns} data={holidays} tableName="Public Holidays Lists" />}
            </div>
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Holiday</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <PublicHoliday onClose={() => setShowEditModal(false)} setShowNewHolidayForm={setShowEditModal} isEditMode={true} editData={currentEditHolidayData || undefined} holidayNameForEditMode={holidayNameForEditMode} setRefetch={setRefetch} />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default PublicHolidaysListTwo;