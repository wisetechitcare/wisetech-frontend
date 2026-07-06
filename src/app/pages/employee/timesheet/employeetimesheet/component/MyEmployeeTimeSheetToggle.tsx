import dayjs, { Dayjs } from "dayjs";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import DetailsModal from "@pages/employee/leads/lead/DetailsModal";
import { AppDispatch, RootState } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { selectIsInitialized, initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import MyEmployeesTimeSheetPorject from "./MyEmployeesTimeSheetPorject";

export type ToggleItemsCallBackFunctions = {
    daily: (date: Dayjs, endDate: Dayjs) => void;
    weekly: (date: Dayjs, endDate: Dayjs) => void;
    monthly: (date: Dayjs, endDate: Dayjs) => void;
    yearly: (date: Dayjs, endDate: Dayjs) => void;
};

interface MaterialToggleProps {
    toggleItemsActions?: ToggleItemsCallBackFunctions;
    fromAdmin?: boolean;
    dateSettingsEnabled: boolean;
}

const templateData = [
    {
        id: 'blank',
        title: 'Blank Project',
        description: ""
    },
    {
        id: 'mep',
        title: 'MEP project',
        description: 'Template',
    },
    {
        id: 'web-dev',
        title: 'Web Development Template',
        description: 'Template',
    }
];

const MyEmployeeTimeSheetToggle = ({
    toggleItemsActions,
    fromAdmin = false,
    dateSettingsEnabled,
}: MaterialToggleProps) => {
    const today = useMemo(() => dayjs(), []);

    // Core state
    const [alignment, setAlignment] = useState("daily");
    const [startDate, setStartDate] = useState<Dayjs | null>(today);
    const [endDate, setEndDate] = useState<Dayjs | null>(today);
    const [showModal, setShowModal] = useState(false);
    
    // Date navigation states
    const [currentDay, setCurrentDay] = useState(today);
    const [currentWeekStart, setCurrentWeekStart] = useState(today.startOf("week").add(1, "day"));
    const [currentMonthStart, setCurrentMonthStart] = useState(today.startOf("month"));
    const [currentYearStart, setCurrentYearStart] = useState<Dayjs | null>(null);
    const [currentYearEnd, setCurrentYearEnd] = useState<Dayjs | null>(null);
    const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");
    
    const dispatch = useDispatch<AppDispatch>();
    const isInitialized = useSelector(selectIsInitialized);
    const employeeId = useSelector((state: RootState) => state?.employee?.currentEmployee?.id);

    // Initialize fiscal year once
    const initializeFiscalYear = useCallback(async () => {
        try {
            const { startDate: fiscalStartDate, endDate: fiscalEndDate } = await generateFiscalYearFromGivenYear(today);
            const fiscalStart = dayjs(fiscalStartDate);
            const fiscalEnd = dayjs(fiscalEndDate);
            
            setCurrentYearStart(fiscalStart);
            setCurrentYearEnd(fiscalEnd);
            setFiscalYearDisplay(
                `${fiscalStart.format("YYYY")} - ${fiscalEnd.format("YYYY")}`
            );
        } catch (error) {
            console.error("Error initializing fiscal year:", error);
        }
    }, []); 

    // Calculate dates based on alignment and current navigation state
    const calculateDatesForAlignment = useCallback((alignmentType: string) => {
        let start: Dayjs;
        let end: Dayjs;

        switch (alignmentType) {
            case "daily":
                start = currentDay;
                end = currentDay;
                break;
            case "weekly":
                start = currentWeekStart;
                end = dateSettingsEnabled && currentWeekStart.add(6, "day").isAfter(today)
                    ? today
                    : currentWeekStart.add(6, "day");
                break;
            case "monthly":
                start = currentMonthStart;
                end = dateSettingsEnabled && currentMonthStart.isSame(today, "month")
                    ? today
                    : currentMonthStart.endOf("month");
                break;
            case "yearly":
                if (!currentYearStart || !currentYearEnd) return { start: today, end: today };
                start = currentYearStart;
                end = dateSettingsEnabled && 
                      today.isSameOrAfter(currentYearStart) && 
                      today.isSameOrBefore(currentYearEnd)
                    ? today
                    : currentYearEnd;
                break;
            default:
                start = today;
                end = today;
        }

        return { start, end };
    }, [currentDay, currentWeekStart, currentMonthStart, currentYearStart, currentYearEnd, dateSettingsEnabled, today]);

    // Update dates when alignment or navigation state changes
    const updateDates = useCallback(() => {
        const { start, end } = calculateDatesForAlignment(alignment);
        setStartDate(start);
        setEndDate(end);
        
        // Call callback functions
        const callbackMap = {
            daily: toggleItemsActions?.daily,
            weekly: toggleItemsActions?.weekly,
            monthly: toggleItemsActions?.monthly,
            yearly: toggleItemsActions?.yearly,
        };
        
        const callback = callbackMap[alignment as keyof typeof callbackMap];
        if (callback) {
            callback(start, end);
        }
    }, [alignment, calculateDatesForAlignment, toggleItemsActions]);

    // Navigation functions
    const navigateDaily = useCallback((direction: "prev" | "next") => {
        const offset = direction === "prev" ? -1 : 1;
        setCurrentDay(prev => prev.add(offset, "day"));
    }, []);

    const navigateWeekly = useCallback((direction: "prev" | "next") => {
        const offset = direction === "prev" ? -1 : 1;
        setCurrentWeekStart(prev => prev.add(offset, "week"));
    }, []);

    const navigateMonthly = useCallback((direction: "prev" | "next") => {
        const offset = direction === "prev" ? -1 : 1;
        setCurrentMonthStart(prev => prev.add(offset, "month"));
    }, []);

    const navigateYearly = useCallback(async (direction: "prev" | "next") => {
        if (!currentYearStart) return;
        
        try {
            const offset = direction === "prev" ? -1 : 1;
            const newFiscalYearDate = currentYearStart.add(offset, "year");
            
            const { startDate: fiscalStartDate, endDate: fiscalEndDate } = await generateFiscalYearFromGivenYear(newFiscalYearDate);
            const fiscalStart = dayjs(fiscalStartDate);
            const fiscalEnd = dayjs(fiscalEndDate);
            
            setCurrentYearStart(fiscalStart);
            setCurrentYearEnd(fiscalEnd);
            setFiscalYearDisplay(
                `${fiscalStart.format("YYYY")} - ${fiscalEnd.format("YYYY")}`
            );
        } catch (error) {
            console.error("Error navigating fiscal year:", error);
        }
    }, [currentYearStart]);

    const handleAlignmentChange = useCallback((
        event: React.MouseEvent<HTMLElement>,
        newAlignment: string
    ) => {
        if (newAlignment && newAlignment !== alignment) {
            setAlignment(newAlignment);
        }
    }, [alignment]);


    // Display text calculations
    const displayText = useMemo(() => {
        switch (alignment) {
            case "daily":
                return currentDay.format("DD MMM, YYYY");
            case "weekly":
                const weekEnd = dateSettingsEnabled && currentWeekStart.add(6, "day").isAfter(today)
                    ? today
                    : currentWeekStart.add(6, "day");
                return `${currentWeekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`;
            case "monthly":
                const monthEnd = dateSettingsEnabled && currentMonthStart.isSame(today, "month")
                    ? today
                    : currentMonthStart.endOf("month");
                return `${currentMonthStart.format("DD MMM")} - ${monthEnd.format("DD MMM")}`;
            case "yearly":
                return fiscalYearDisplay;
            default:
                return "";
        }
    }, [alignment, currentDay, currentWeekStart, currentMonthStart, fiscalYearDisplay, dateSettingsEnabled, today]);

    // Initialize on mount
    useEffect(() => {
        if (!isInitialized) {
            dispatch(initializeChartSettings());
            dispatch(loadAllEmployeesIfNeeded());
        }
    }, [dispatch, isInitialized]);

    // Initialize fiscal year
    useEffect(() => {
        initializeFiscalYear();
    }, [initializeFiscalYear]);

    // Update dates when dependencies change
    useEffect(() => {
        updateDates();
    }, [updateDates]);

    return (
        <>
            <div className="d-flex flex-row justify-content-between align-items-center mt-7">
                <div className="d-flex flex-row align-items-center gap-3">
                    {/* Optional content */}
                </div>
                <div className="d-flex flex-row justify-content-end align-items-center gap-4">
                    <PeriodTabs
                        value={alignment}
                        options={[
                            { label: 'Daily', value: 'daily' },
                            { label: 'Weekly', value: 'weekly' },
                            { label: 'Monthly', value: 'monthly' },
                            { label: 'Yearly', value: 'yearly' },
                        ]}
                        onChange={(val) => handleAlignmentChange(null as any, val)}
                        ariaLabel="view selection"
                    />
                    <PeriodNavigator
                        label={displayText}
                        onPrevious={() => {
                            if (alignment === "daily") navigateDaily("prev");
                            else if (alignment === "weekly") navigateWeekly("prev");
                            else if (alignment === "monthly") navigateMonthly("prev");
                            else if (alignment === "yearly") navigateYearly("prev");
                        }}
                        onNext={() => {
                            if (alignment === "daily") navigateDaily("next");
                            else if (alignment === "weekly") navigateWeekly("next");
                            else if (alignment === "monthly") navigateMonthly("next");
                            else if (alignment === "yearly") navigateYearly("next");
                        }}
                    />
                </div>
            </div>

            <MyEmployeesTimeSheetPorject startDate={startDate} endDate={endDate} />

            <DetailsModal
                open={showModal}
                onClose={() => setShowModal(false)}
                Datas={templateData}
            />
        </>
    );
};

export default MyEmployeeTimeSheetToggle;