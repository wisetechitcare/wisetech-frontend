import { toAbsoluteUrl } from "@metronic/helpers";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import DetailsModal from "@pages/employee/leads/lead/DetailsModal";
import MyTimeSheetPorject from "./MyTimeSheetPorject";
import { AppDispatch, RootState } from "@redux/store";
import { loadAllEmployeesIfNeeded } from "@redux/slices/allEmployees";
import { selectIsInitialized, initializeChartSettings } from "@redux/slices/leadProjectCompanies";
import { generateFiscalYearFromGivenYear } from "@utils/file";

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

const MyTimeSheetToggle = ({
    toggleItemsActions,
    fromAdmin = false,
    dateSettingsEnabled,
}: MaterialToggleProps) => {
    const today = useMemo(() => dayjs(), []);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    
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
                `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format("DD MMM, YYYY")}`
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
                `${fiscalStart.format("DD MMM, YYYY")} - ${fiscalEnd.format("DD MMM, YYYY")}`
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

    // Navigation button component
    const NavigationButtons = useMemo(() => ({
        onPrev,
        onNext,
        displayText,
    }: {
        onPrev: () => void;
        onNext: () => void;
        displayText: string;
    }) => (
        <div className="d-flex align-items-center">
            <button className="btn btn-sm p-0" onClick={onPrev} type="button">
                <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" />
            </button>
            <span className="mx-2 mt-0 fw-bold lh-base font-barlow">{displayText}</span>
            <button className="btn btn-sm p-0" onClick={onNext} type="button">
                <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" />
            </button>
        </div>
    ), []);

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
                    <div className="d-flex flex-column align-items-center d-md-block">
                        {isMobile ? (
                            <Select
                                value={alignment}
                                onChange={(e) => handleAlignmentChange(e as any, e.target.value)}
                                fullWidth
                                displayEmpty
                                variant="outlined"
                                size="small"
                                sx={{
                                    borderRadius: "20px",
                                    "& .MuiOutlinedInput-root": {
                                        borderRadius: "20px",
                                        backgroundColor: "transparent",
                                        "&:hover": {
                                            backgroundColor: "transparent",
                                        },
                                    },
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        borderRadius: "20px",
                                        borderColor: "#D2B48C",
                                        borderWidth: "3px",
                                    },
                                    "& .Mui-selected": {
                                        borderColor: "#9D4141 !important",
                                        color: "#9D4141 !important",
                                        backgroundColor: "transparent !important",
                                    },
                                }}
                            >
                                <MenuItem value="daily">Daily</MenuItem>
                                <MenuItem value="weekly">Weekly</MenuItem>
                                <MenuItem value="monthly">Monthly</MenuItem>
                                <MenuItem value="yearly">Yearly</MenuItem>
                            </Select>
                        ) : (
                            <ToggleButtonGroup
                                value={alignment}
                                exclusive
                                onChange={handleAlignmentChange}
                                aria-label="view selection"
                                sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "8px",
                                    justifyContent: "center",
                                    width: "100%",
                                    "& .MuiToggleButton-root": {
                                        borderRadius: "20px",
                                        borderColor: "#A0B4D2 !important",
                                        color: "#000000 !important",
                                        paddingX: {
                                            xs: "32px",
                                            md: "45px",
                                        },
                                        borderWidth: "2px",
                                        fontWeight: "600",
                                        width: {
                                            xs: "65px",
                                            sm: "75px",
                                        },
                                        fontSize: {
                                            xs: "10px",
                                            sm: "12px",
                                        },
                                        height: { xs: "30px", sm: "36px" },
                                        fontFamily: "Inter",
                                        backgroundColor: "transparent !important",
                                        "&:hover": {
                                            backgroundColor: "transparent !important",
                                            borderColor: "#9D4141 !important",
                                            color: "#9D4141 !important",
                                        },
                                    },
                                    "& .Mui-selected": {
                                        borderColor: "#9D4141 !important",
                                        color: "#9D4141 !important",
                                        backgroundColor: "transparent !important",
                                    },
                                }}
                            >
                                <ToggleButton value="daily">Daily</ToggleButton>
                                <ToggleButton value="weekly">Weekly</ToggleButton>
                                <ToggleButton value="monthly">Monthly</ToggleButton>
                                <ToggleButton value="yearly">Yearly</ToggleButton>
                            </ToggleButtonGroup>
                        )}
                    </div>
                    <div>
                        {alignment === "daily" && (
                            <NavigationButtons
                                onPrev={() => navigateDaily("prev")}
                                onNext={() => navigateDaily("next")}
                                displayText={displayText}
                            />
                        )}

                        {alignment === "weekly" && (
                            <NavigationButtons
                                onPrev={() => navigateWeekly("prev")}
                                onNext={() => navigateWeekly("next")}
                                displayText={displayText}
                            />
                        )}

                        {alignment === "monthly" && (
                            <NavigationButtons
                                onPrev={() => navigateMonthly("prev")}
                                onNext={() => navigateMonthly("next")}
                                displayText={displayText}
                            />
                        )}

                        {alignment === "yearly" && (
                            <NavigationButtons
                                onPrev={() => navigateYearly("prev")}
                                onNext={() => navigateYearly("next")}
                                displayText={displayText}
                            />
                        )}
                    </div>
                </div>
            </div>

            <MyTimeSheetPorject startDate={startDate} endDate={endDate} />

            <DetailsModal
                open={showModal}
                onClose={() => setShowModal(false)}
                Datas={templateData}
            />
        </>
    );
};

export default MyTimeSheetToggle;