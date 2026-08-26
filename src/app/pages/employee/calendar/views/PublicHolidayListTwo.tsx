import { useMemo, useState, useEffect } from "react";
import dayjs from 'dayjs';
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { usePermission } from "@hooks/usePermission";
import { KTIcon } from "@metronic/helpers";
import { errorConfirmation, successConfirmation, deleteConfirmation } from "@utils/modal";
import { Modal } from "react-bootstrap";
import PublicHoliday from "@pages/company/PublicHoliday";
import { IPublicHolidayUpdate } from "@models/company";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import { useEventBus } from "@hooks/useEventBus";
import { deletePublicHolidayById, fetchAllBranches, fetchPublicHolidays, fetchHolidays, generateHolidaysForYear, fetchCompanyOverview, fetchWeekendAudit, generateWeekendSchedule, type WeekendAudit } from "@services/company";
import { resolveActiveOrgId } from "@utils/activeOrg";
import { T } from "@app/modules/common/components/ui/tokens";
import { confirmDialog } from "@app/modules/common/components/ui";

interface PublicHoliday {
    id: string;
    date: string;
    day: string;
    name: string;
    type: string;
    isWeekend?: boolean;
    branchId?: string | null;
    branchName?: string | null;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function PublicHolidaysListTwo({ 
    getNotification, 
    selectedYear, 
    setSelectedYear,
    onHolidaysFetched 
}: { 
    getNotification: any;
    selectedYear: number;
    setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
    onHolidaysFetched?: (list: any[]) => void;
}) {
    const dispatch = useDispatch();
    const isAdmin = usePermission('settings.manage.all');
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [refetch, setRefetch] = useState(false);
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [rawHolidaysData, setRawHolidaysData] = useState<IPublicHolidayUpdate[]>([]);
    const [currentEditHolidayData, setCurrentEditHolidayData] = useState<IPublicHolidayUpdate | null>(null);
    const [loading, setLoading] = useState(false);
    const [holidayNameForEditMode, setHolidayNameForEditMode] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [holidaysList, setHolidaysList] = useState<[{ label: string, value: string }]>();
    
    // Design Toolbar State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('All');
    const [branchOptions, setBranchOptions] = useState<{ id: string; name: string }[]>([]);
    const [viewMode, setViewMode] = useState<'List' | 'Cards'>('List');
    // Filters sidebar is always visible ≥768px; below that it's collapsed behind a
    // toggle button in the toolbar (a full-height filter column pushed above the fold
    // on every visit would bury the actual holiday list on mobile).
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    // Off-Saturday quota. Separate from `holidays` on purpose: this answers "does every
    // month have its 2 off-days?", which the list itself cannot show — a month short by
    // one just looks like a shorter month.
    const [weekendAudit, setWeekendAudit] = useState<WeekendAudit | null>(null);
    const [generatingSaturdays, setGeneratingSaturdays] = useState(false);

    // Sidebar Filters State
    const [filterUpcoming, setFilterUpcoming] = useState(true);
    const [filterFixed, setFilterFixed] = useState(true);
    const [filterFloating, setFilterFloating] = useState(true);
    const [filterPast, setFilterPast] = useState(false);
    // Weekly-off rows (isWeekend=true — e.g. bulk-generated Saturdays/Sundays) are
    // a different category from actual named holidays. Hidden from this list by
    // default so they don't clutter "Add Holiday" management; togglable back on.
    // Weekly offs are configured separately on the Weekends & Working Days page.
    const [filterWeekends, setFilterWeekends] = useState(false);
    // Single source of truth for "which month" — drives the Jump to Month grid,
    // the List view's month grouping/filter, AND the Cards carousel, so all three
    // always agree. `null` means "no month picked" (List shows every month); Cards
    // can't show "every month" at once, so it falls back to the real current month
    // via `displayMonthIndex` below.
    const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
    const displayMonthIndex = selectedMonthIndex ?? dayjs().month();

    const nextSlideMonth = () => {
        setSelectedMonthIndex(displayMonthIndex === 11 ? 0 : displayMonthIndex + 1);
    };
    const prevSlideMonth = () => {
        setSelectedMonthIndex(displayMonthIndex === 0 ? 11 : displayMonthIndex - 1);
    };

    const country = 'India';

    // ── Pre-fill a year from the master list ────────────────────────────────────
    // The master list (Configure > Public Holidays) holds the holiday NAMES; this
    // page holds the DATED rows for one year. A fresh year starts empty, so these
    // let the user pre-fill it instead of retyping every holiday annually.
    const [masterHolidays, setMasterHolidays] = useState<any[]>([]);
    const [companyId, setCompanyId] = useState<string>('');
    const [generating, setGenerating] = useState(false);

    // Master holidays with no dated row in the selected year. Movable festivals
    // (Diwali, Ganesh Chaturthi, Good Friday) land here every year by design —
    // their date cannot be derived, so a human sets it. Derived rather than stored:
    // PublicHolidays.date is NOT NULL and that table feeds payroll, so a placeholder
    // row with no real date has no safe representation.
    const datedHolidayIds = useMemo(
        () => new Set(rawHolidaysData.map(h => h.holidayId)),
        [rawHolidaysData],
    );
    const needsDateHolidays = useMemo(
        () => masterHolidays.filter(m => !datedHolidayIds.has(m.id)),
        [masterHolidays, datedHolidayIds],
    );
    // Only rules the generator can actually act on — anything else needs a manual date.
    const generatableCount = useMemo(
        () => needsDateHolidays.filter(m => m.recurrenceMonth != null && m.recurrenceDay != null).length,
        [needsDateHolidays],
    );

    // Reload the quota whenever the year, branch or the holiday rows change — deleting an
    // off-Saturday must move the count immediately, or the strip would reassure an admin
    // about a month they just broke.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const audit = await fetchWeekendAudit(selectedYear);
                if (!cancelled) setWeekendAudit(audit ?? null);
            } catch (error) {
                console.error('Error fetching weekend quota audit:', error);
                if (!cancelled) setWeekendAudit(null);
            }
        })();
        return () => { cancelled = true; };
    }, [selectedYear, refetch]);

    /**
     * Fill months below the off-Saturday quota. Two-step on purpose: preview first, then
     * confirm — generation writes real rows, and the preview is also where a collision
     * with an existing holiday shows up.
     */
    const handleGenerateSaturdays = async () => {
        setGeneratingSaturdays(true);
        try {
            const preview = await generateWeekendSchedule(selectedYear, false);
            if (!preview?.created?.length) {
                successConfirmation(
                    `Nothing to add — every month in ${selectedYear} already has its ${weekendAudit?.quota ?? 2} off-Saturdays.`,
                );
                return;
            }

            const clash = preview.collisions?.length
                ? `\n\nAlready a holiday: ${preview.collisions.map(c => `${c.date} (${c.holiday})`).join(', ')}. ` +
                  `Those months would gain one extra day off instead of two — you can move the date afterwards.`
                : '';
            const short = preview.stillShort?.length
                ? `\n\nStill short after this: ${preview.stillShort.map(m => m.label).join(', ')} — ` +
                  `the 2nd/4th Saturdays are already taken, so pick a date by hand.`
                : '';

            const confirmed = await deleteConfirmation(
                `Add ${preview.created.length} off-Saturday(s) to ${selectedYear}?` +
                `\n\n${preview.created.join(', ')}` + clash + short +
                `\n\nExisting dates are never changed or removed.`,
            );
            if (!confirmed) return;

            const result = await generateWeekendSchedule(selectedYear, true);
            setRefetch(prev => !prev);
            successConfirmation(`Added ${result.created.length} off-Saturday(s) to ${selectedYear}.`);
        } catch (error) {
            console.error('Error generating off-Saturdays:', error);
            errorConfirmation(`Failed to generate off-Saturdays for ${selectedYear}.`);
        } finally {
            setGeneratingSaturdays(false);
        }
    };

    const handleGenerateYear = async () => {
        if (!companyId) {
            errorConfirmation('Could not resolve the company — please reload and try again.');
            return;
        }
        setGenerating(true);
        try {
            const res = await generateHolidaysForYear({ year: selectedYear, companyId, observedIn: country });
            if (res && !res.hasError) {
                const created = res?.data?.created?.length ?? 0;
                setRefetch(prev => !prev);
                successConfirmation(
                    created > 0
                        ? `Added ${created} holiday${created === 1 ? '' : 's'} to ${selectedYear}.`
                        : `Nothing to add — every holiday with a repeating date already exists in ${selectedYear}.`,
                );
            }
        } catch (error) {
            console.error('Error generating holidays for year:', error);
            errorConfirmation(`Failed to pre-fill ${selectedYear} from the holiday list.`);
        } finally {
            setGenerating(false);
        }
    };

    const handleEdit = (item: any) => {
        setShowEditModal(true)
        const id = item?.id;
        const holiday = rawHolidaysData.find(h => h.id === id);

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

    const handleDelete = async (item: any) => {
        const confirmed = await deleteConfirmation('Are you sure you want to delete this holiday?');
        
        if (confirmed) {
            try {
                const res = await deletePublicHolidayById(item?.id as string);
                if (!res?.hasError) {
                    setRefetch(prev => !prev);
                    successConfirmation('Holiday deleted successfully');
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
            const branchFilter = selectedLocation !== 'All' ? selectedLocation : undefined;
            const { data: { publicHolidays } } = await fetchPublicHolidays(selectedYear.toString(), country, branchFilter)
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
                branchId: holiday?.branchId ?? null,
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
                type: holiday?.isFixed ? 'Fixed' : 'Floating',
                isWeekend: !!holiday?.isWeekend,
                branchId: holiday?.branchId ?? null,
                branchName: holiday?.branch?.name ?? null,
            }));

            setHolidays(transformedRes);
            if (onHolidaysFetched) {
                onHolidaysFetched(transformedRes);
            }

            } catch (error) {
                console.error("Error fetching Public Holidays:", error);
            } finally {
                setLoading(false);
            }
        };

    useEffect(() => {
        fetchAllBranches()
            .then((res: any) => {
                const branches = res?.data?.branches ?? [];
                setBranchOptions(branches.map((b: any) => ({ id: b.id, name: b.name })));
            })
            .catch(() => {});
    }, []);

    // Master holiday list — the template each year is pre-filled from. Refetched on
    // `refetch` so a holiday added in Configure shows up here without a page reload.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data: { companyOverview } } = await fetchCompanyOverview();
                const resolvedId = resolveActiveOrgId(companyOverview) ?? '';
                if (cancelled) return;
                setCompanyId(resolvedId);
                if (!resolvedId) return;
                const { data: { holidays: masters } } = await fetchHolidays(resolvedId);
                if (!cancelled) setMasterHolidays(masters ?? []);
            } catch (error) {
                console.error('Error fetching master holiday list:', error);
            }
        })();
        return () => { cancelled = true; };
    }, [refetch]);

    // fetch on component mount
    useEventBus("holidayUpdated", () => {
        getAllPublicHolidays();
    });
    useEffect(() => {
        getAllPublicHolidays();
    }, [country, selectedYear, refetch, getNotification, selectedLocation]);

    // Weekly-off rows filtered out — the actual-holidays view used for the
    // Distribution / Next Countdown / Long Weekends widgets, none of which should
    // count or react to a plain Saturday/Sunday.
    const realHolidays = useMemo(() => holidays.filter(h => !h.isWeekend), [holidays]);

    // Derived holiday arrays based on search, month jump, and quick filters
    const processedHolidays = useMemo(() => {
        const today = dayjs().startOf('day');

        return holidays.filter(h => {
            const djs = dayjs(h.date, 'DD-MM-YYYY');
            const isPast = djs.isBefore(today);
            const isUpcoming = !isPast;
            const isFixed = h.type === 'Fixed';

            // 1. Search Query
            const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  h.day.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  h.date.includes(searchQuery);
            if (!matchesSearch) return false;

            // 2. Month Jump Filter
            if (selectedMonthIndex !== null && djs.month() !== selectedMonthIndex) return false;

            // 3. Weekends (Sat/Sun) — decided from the ACTUAL weekday, not just the
            // bulk-generated weekly-off flag, so a real holiday landing on a Sat/Sun
            // is treated as a weekend too.
            const weekday = djs.day(); // 0 = Sunday, 6 = Saturday
            const isWeekendDay = weekday === 0 || weekday === 6;

            if (filterWeekends) {
                // Focus mode: show ONLY Saturday/Sunday entries (the whole point of
                // the toggle). The Fixed/Floating type filters are skipped here so
                // every weekend entry shows regardless of its stored type; the
                // Upcoming/Past toggle is still honoured (unless a month is picked).
                if (!isWeekendDay) return false;
                if (selectedMonthIndex === null && (filterUpcoming || filterPast)) {
                    if (isPast && !filterPast) return false;
                    if (isUpcoming && !filterUpcoming) return false;
                }
                return true;
            }

            // Weekends toggle is OFF: never show the bulk-generated weekly-off marker
            // rows so they don't clutter the normal holiday list.
            if (h.isWeekend) return false;

            // 4. Quick Filters (Time-based) — skipped once a specific month is picked via
            // Jump to Month: that's an explicit request to see THAT month, past or not,
            // so it shouldn't be silently emptied by the Upcoming/Past toggles. Also
            // skipped when NEITHER box in the group is checked — an empty group means
            // "no restriction from this dimension," not "match nothing" (unchecking
            // both would otherwise silently hide every item regardless of type).
            if (selectedMonthIndex === null && (filterUpcoming || filterPast)) {
                if (isPast && !filterPast) return false;
                if (isUpcoming && !filterUpcoming) return false;
            }

            // 5. Quick Filters (Type-based) — same "empty group = no restriction" rule.
            if (filterFixed || filterFloating) {
                if (isFixed && !filterFixed) return false;
                if (!isFixed && !filterFloating) return false;
            }

            return true;
        }).sort((a, b) => {
            const dateA = dayjs(a.date, 'DD-MM-YYYY');
            const dateB = dayjs(b.date, 'DD-MM-YYYY');
            return dateA.diff(dateB);
        });
    }, [holidays, searchQuery, filterPast, filterUpcoming, filterFixed, filterFloating, filterWeekends, selectedMonthIndex]);

    const slideMonthHolidays = useMemo(() => {
        return processedHolidays.filter(h => dayjs(h.date, 'DD-MM-YYYY').month() === displayMonthIndex);
    }, [processedHolidays, displayMonthIndex]);

    // Group holidays by month for display
    const groupedHolidays = useMemo(() => {
        const groups: Record<string, PublicHoliday[]> = {};
        processedHolidays.forEach(h => {
            const monthName = dayjs(h.date, 'DD-MM-YYYY').format('MMMM YYYY');
            if (!groups[monthName]) groups[monthName] = [];
            groups[monthName].push(h);
        });
        return groups;
    }, [processedHolidays]);

    // Find next upcoming holiday from today
    const nextUpcomingHoliday = useMemo(() => {
        const today = dayjs().startOf('day');
        const futureHolidays = realHolidays
            .map(h => ({ ...h, djs: dayjs(h.date, 'DD-MM-YYYY') }))
            .filter(h => !h.djs.isBefore(today))
            .sort((a, b) => a.djs.diff(b.djs));
        return futureHolidays[0] || null;
    }, [realHolidays]);

    // Calculate distributions
    const totalCount = realHolidays.length;
    const fixedCount = realHolidays.filter(h => h.type === 'Fixed').length;
    const floatingCount = realHolidays.filter(h => h.type !== 'Fixed').length;

    // Calculate long weekends (Friday/Monday adjacent)
    const longWeekends = useMemo(() => {
        const found: { name: string; label: string; range: string }[] = [];
        const sorted = realHolidays
            .map(h => ({ ...h, djs: dayjs(h.date, 'DD-MM-YYYY') }))
            .sort((a, b) => a.djs.diff(b.djs));

        sorted.forEach(h => {
            const dayOfWeek = h.djs.day(); // 0 = Sunday, 1 = Monday, 5 = Friday
            if (dayOfWeek === 5) {
                found.push({
                    name: h.name,
                    label: '3-day break',
                    range: `${h.djs.format('MMM')} ${h.djs.format('DD')} - ${h.djs.add(2, 'day').format('DD')}`
                });
            } else if (dayOfWeek === 1) {
                found.push({
                    name: h.name,
                    label: '3-day break',
                    range: `${h.djs.subtract(2, 'day').format('MMM')} ${h.djs.subtract(2, 'day').format('DD')} - ${h.djs.format('DD')}`
                });
            }
        });
        return found;
    }, [realHolidays]);

    const allowdEdit = hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.editOthers);
    const allowDelete = hasPermission(resourceNameMapWithCamelCase.holiday, permissionConstToUseWithHasPermission.deleteOthers);

    // Drives the mobile "Filters" button badge — true once anything differs from the default
    // quick-filter/month state, so the collapsed drawer's contents are discoverable at a glance.
    const isFiltersActive = selectedMonthIndex !== null || !filterUpcoming || !filterFixed || !filterFloating || filterPast || filterWeekends;

    // Quick Filters + Jump to Month content, shared by the always-visible desktop
    // sidebar and the mobile collapsible panel (rendered inline right under the
    // toolbar's Filters button, NOT buried at the bottom of the mobile column stack).
    const renderFilterPanel = () => {
        const allFiltersChecked = filterUpcoming && filterFixed && filterFloating && filterPast && filterWeekends;
        
        const handleToggleAllFilters = () => {
            const newValue = !allFiltersChecked;
            setFilterUpcoming(newValue);
            setFilterFixed(newValue);
            setFilterFloating(newValue);
            setFilterPast(newValue);
            setFilterWeekends(newValue);
        };

        return (
        <>
            {/* Quick Filters Group */}
            <div className="mb-8">
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <h4 className="fs-8 text-uppercase fw-bold text-gray-500 m-0" style={{ letterSpacing: '0.8px' }}>Quick Filters</h4>
                    <button 
                        type="button" 
                        className="btn btn-sm btn-active-light-primary text-primary fw-bold p-1 fs-8" 
                        onClick={handleToggleAllFilters}
                        style={{ lineHeight: 1 }}
                    >
                        {allFiltersChecked ? 'Clear All' : 'Select All'}
                    </button>
                </div>
                <div className="d-flex flex-column gap-3">
                    <label className="form-check form-check-custom form-check-solid form-check-sm cursor-pointer">
                        <input
                            className="form-check-input wt-filter-check"
                            type="checkbox"
                            checked={filterUpcoming}
                            onChange={(e) => setFilterUpcoming(e.target.checked)}
                        />
                        <span className="form-check-label fs-7 fw-semibold text-gray-700">Upcoming</span>
                    </label>
                    <label className="form-check form-check-custom form-check-solid form-check-sm cursor-pointer">
                        <input
                            className="form-check-input wt-filter-check"
                            type="checkbox"
                            checked={filterFixed}
                            onChange={(e) => setFilterFixed(e.target.checked)}
                        />
                        <span className="form-check-label fs-7 fw-semibold text-gray-700">Fixed Holidays</span>
                    </label>
                    <label className="form-check form-check-custom form-check-solid form-check-sm cursor-pointer">
                        <input
                            className="form-check-input wt-filter-check"
                            type="checkbox"
                            checked={filterFloating}
                            onChange={(e) => setFilterFloating(e.target.checked)}
                        />
                        <span className="form-check-label fs-7 fw-semibold text-gray-700">Floating Days</span>
                    </label>
                    <label className="form-check form-check-custom form-check-solid form-check-sm cursor-pointer">
                        <input
                            className="form-check-input wt-filter-check"
                            type="checkbox"
                            checked={filterPast}
                            onChange={(e) => setFilterPast(e.target.checked)}
                        />
                        <span className="form-check-label fs-7 fw-semibold text-gray-700">Past Holidays</span>
                    </label>
                    <label className="form-check form-check-custom form-check-solid form-check-sm cursor-pointer">
                        <input
                            className="form-check-input wt-filter-check"
                            type="checkbox"
                            checked={filterWeekends}
                            onChange={(e) => setFilterWeekends(e.target.checked)}
                        />
                        <span className="form-check-label fs-7 fw-semibold text-gray-700">Weekends (Sat/Sun)</span>
                    </label>
                </div>
            </div>

            {/* Jump to Month Grid */}
            <div>
                {/* Non-active buttons turn grey on hover; active (selected) stays brand-blue.
                    We avoid .btn-primary as it has !important maroon background in Metronic. */}
                <style>{`
                    .wt-filter-btn.wt-active {
                        background-color: ${T.color.brand} !important;
                        border-color: ${T.color.brand} !important;
                        color: #ffffff !important;
                    }
                    .wt-filter-btn:hover:not(.wt-active) {
                        background-color: ${T.color.panelAlt} !important;
                        border-color: ${T.color.line} !important;
                        color: ${T.color.ink} !important;
                        --bs-btn-hover-bg: ${T.color.panelAlt};
                        --bs-btn-hover-border-color: ${T.color.line};
                        --bs-btn-hover-color: ${T.color.ink};
                    }
                `}</style>
                <h4 className="fs-8 text-uppercase fw-bold text-gray-500 mb-4" style={{ letterSpacing: '0.8px' }}>Jump to Month</h4>
                <button
                    type="button"
                    className={`btn btn-sm w-100 py-2.5 px-0 text-center fw-bold fs-8 border transition-all mb-2 wt-filter-btn ${selectedMonthIndex === null ? 'wt-active' : 'btn-light border-gray-200 text-gray-600 bg-white'}`}
                    style={{ borderRadius: '6px' }}
                    onClick={() => setSelectedMonthIndex(null)}
                >
                    All Months
                </button>
                <div className="row g-2">
                    {MONTHS.map((m, idx) => {
                        const isActive = selectedMonthIndex === idx;
                        return (
                            <div className="col-6" key={m}>
                                <button
                                    type="button"
                                    className={`btn btn-sm w-100 py-2.5 px-0 text-center fw-bold fs-8 border transition-all wt-filter-btn ${isActive ? 'wt-active' : 'btn-light border-gray-200 text-gray-600 bg-white'}`}
                                    style={{ borderRadius: '6px' }}
                                    onClick={() => setSelectedMonthIndex(idx)}
                                >
                                    {m}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
        );
    };

    // Single card renderer shared by the "one month" carousel and the "All Months"
    // grouped grid, so both Cards modes look identical.
    const renderHolidayCard = (item: PublicHoliday) => {
        const dObj = dayjs(item.date, 'DD-MM-YYYY');
        const isFixed = item.type === 'Fixed';
        const isNext = nextUpcomingHoliday && nextUpcomingHoliday.id === item.id;
        return (
            <div className="col-12 col-md-6" key={item.id}>
                <div
                    className="card border-0 shadow-xs p-5 hover-elevate-up transition-all h-100"
                    style={{
                        background: '#ffffff',
                        borderLeft: `4px solid ${isFixed ? T.color.brand : '#D97706'}`,
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
                    }}
                >
                    <div className="d-flex align-items-center justify-content-between h-100 flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-4">
                            {/* Date Badge */}
                            <div className="text-center shadow-xs" style={{ width: '56px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#ffffff', flexShrink: 0 }}>
                                <div className="fw-bold text-white text-uppercase py-1" style={{ background: isFixed ? T.color.brand : '#D97706', fontSize: '9px', letterSpacing: '0.5px' }}>
                                    {dObj.format('MMM')}
                                </div>
                                <div className="fs-3 fw-bold text-gray-900 pt-1" style={{ lineHeight: '1.2' }}>
                                    {dObj.format('DD')}
                                </div>
                            </div>

                            {/* Details */}
                            <div style={{ minWidth: 0 }}>
                                <h4 className="fs-6 fw-bold text-gray-900 m-0 mb-1.5 d-flex align-items-center flex-wrap gap-2" style={{ wordBreak: 'break-word' }}>
                                    {item.name}
                                    {isNext && <span className="badge badge-light-success text-success fw-bold fs-10 px-2 py-0.5 rounded-sm" style={{ backgroundColor: '#E8F5E9' }}>NEXT</span>}
                                </h4>
                                <div className="d-flex align-items-center gap-2 text-muted fs-7">
                                    <span>{item.day}</span>
                                    <span className="bullet bullet-dot bg-gray-300"></span>
                                    <span className="badge fw-bold px-2 py-0.5 fs-9" style={item.isWeekend ? { backgroundColor: '#F1F5F9', color: '#475569' } : isFixed ? { backgroundColor: T.color.brandSoft, color: T.color.brand } : { backgroundColor: '#FFFBEB', color: '#D97706' }}>
                                        {item.isWeekend ? 'Weekend' : isFixed ? 'Fixed' : 'Floating'}
                                    </span>
                                    {item.branchName && (
                                        <span className="badge fw-semibold px-2 py-0.5 fs-9" style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}>
                                            {item.branchName}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Inline Actions */}
                        {isAdmin && (
                            <div className="d-flex align-items-center gap-1.5">
                                {allowdEdit && (
                                    <button type="button" className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm border-0 shadow-xs wt-touch-target" onClick={() => handleEdit(item)} aria-label={`Edit ${item.name}`} style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#f5f8fa' }}>
                                        <KTIcon iconName="pencil" className="fs-5 text-gray-600" />
                                    </button>
                                )}
                                {allowDelete && (
                                    <button type="button" className="btn btn-icon btn-bg-light btn-active-color-danger btn-sm border-0 shadow-xs wt-touch-target" onClick={() => handleDelete(item)} aria-label={`Delete ${item.name}`} style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#f5f8fa' }}>
                                        <KTIcon iconName="trash" className="fs-5 text-gray-600" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ background: '#fcfdfe' }}>
            {/* Bumps every icon-only action in this page to a ~40px touch target below the
                tablet breakpoint (native size is 30-32px, sized for a mouse pointer). Kept as
                a single scoped rule rather than inlining per-button so it's one place to tune. */}
            <style>{`
                @media (max-width: 767.98px) {
                    .wt-touch-target { min-width: 40px !important; min-height: 40px !important; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .transition-all, .hover-elevate-up { transition: none !important; }
                }
                /* Blue tick for Quick Filter checkboxes — overrides Metronic's default theme colour */
                .wt-filter-check:checked {
                    background-color: #1E3A8A !important;
                    border-color: #1E3A8A !important;
                }
                .wt-filter-check:focus {
                    border-color: #1E3A8A !important;
                    box-shadow: 0 0 0 0.2rem rgba(30,58,138,.2) !important;
                }
            `}</style>

            {/* --- TOP HIGH-FIDELITY DESIGN TOOLBAR --- */}
            <div className="d-flex align-items-center justify-content-between px-4 px-md-8 py-5 border-bottom border-gray-200 flex-wrap gap-4" style={{ background: '#ffffff' }}>
                <div className="d-flex align-items-center gap-4 flex-wrap">
                    <h2 className="fs-4 fs-md-3 fw-bold text-gray-900 m-0">{selectedYear} Holiday Schedule</h2>

                    {/* Year Switcher Arrows */}
                    <div className="d-flex align-items-center border rounded overflow-hidden shadow-xs">
                        <button
                            type="button"
                            className="btn btn-icon btn-clean btn-sm border-0 rounded-0 wt-touch-target"
                            style={{ background: '#f5f8fa' }}
                            onClick={() => setSelectedYear(y => y - 1)}
                            aria-label="Previous year"
                        >
                            <KTIcon iconName="left" className="fs-6 text-gray-600" />
                        </button>
                        <span className="px-4 fw-bold text-gray-800 fs-6" style={{ minWidth: '60px', textAlign: 'center' }}>
                            {selectedYear}
                        </span>
                        <button
                            type="button"
                            className="btn btn-icon btn-clean btn-sm border-0 rounded-0 wt-touch-target"
                            style={{ background: '#f5f8fa' }}
                            onClick={() => setSelectedYear(y => y + 1)}
                            aria-label="Next year"
                        >
                            <KTIcon iconName="right" className="fs-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-3 flex-wrap w-100 w-md-auto">
                    {/* Quick Search */}
                    <div className="position-relative w-100 w-md-auto" style={{ minWidth: '160px' }}>
                        <KTIcon iconName="magnifier" className="fs-4 text-gray-500 position-absolute top-50 translate-middle-y ms-3" />
                        <input
                            type="text"
                            className="form-control form-control-sm form-control-solid ps-10 border w-100"
                            style={{ borderRadius: '6px', background: '#fcfdfe', minWidth: 0, height: '38px' }}
                            placeholder="Quick search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search holidays"
                        />
                    </div>

                    {/* Mobile-only Filters toggle — the filter sidebar (quick filters + jump
                        to month) collapses behind this below 768px instead of always eating
                        vertical space above the actual holiday list. Same width as every other
                        toolbar control on mobile (w-100), one per row, so nothing looks mismatched. */}
                    <button
                        type="button"
                        className="btn btn-sm d-md-none position-relative wt-touch-target w-100"
                        style={{ borderRadius: '6px', border: '1px solid #dde2ec', background: showMobileFilters ? T.color.brandSoft : '#fcfdfe', color: showMobileFilters ? T.color.brand : '#3f4254', fontWeight: 600, height: '38px' }}
                        onClick={() => setShowMobileFilters(v => !v)}
                        aria-expanded={showMobileFilters}
                    >
                        <KTIcon iconName="filter" className="fs-5 me-1" />
                        Filters
                        {isFiltersActive && (
                            <span className="position-absolute top-0 start-100 translate-middle p-1 rounded-circle" style={{ background: T.color.brand, width: '9px', height: '9px' }}>
                                <span className="visually-hidden">Filters active</span>
                            </span>
                        )}
                    </button>

                    {/* Locations Dropdown — "All Locations" shows company-wide + every
                        branch's holidays; picking a branch shows company-wide + that
                        branch's own overrides only. */}
                    <select
                        className="form-select form-select-sm form-select-solid border w-100 w-md-auto"
                        style={{ minWidth: '140px', borderRadius: '6px', background: '#fcfdfe', fontWeight: 600, height: '38px' }}
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        aria-label="Filter by location"
                    >
                        <option value="All">All Branches</option>
                        {branchOptions.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    {/* List/Cards View Toggles — full width on mobile (each half), matching
                        every other toolbar control's width instead of shrinking to content. */}
                    <div className="btn-group shadow-xs rounded w-100 w-md-auto" role="group">
                        <button
                            type="button"
                            className={`btn btn-sm py-1.5 px-4 wt-touch-target flex-fill wt-filter-btn ${viewMode === 'List' ? 'wt-active border-transparent' : 'btn-light border-gray-200 text-gray-600 bg-white'}`}
                            style={{ height: '38px' }}
                            onClick={() => setViewMode('List')}
                        >
                            List
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm py-1.5 px-4 wt-touch-target flex-fill wt-filter-btn ${viewMode === 'Cards' ? 'wt-active border-transparent' : 'btn-light border-gray-200 text-gray-600 bg-white'}`}
                            style={{ height: '38px' }}
                            onClick={() => setViewMode('Cards')}
                        >
                            Cards
                        </button>
                    </div>

                    {/* Pre-fill this year from the master list. Hidden when there is
                        nothing it could add, so it never appears as a button that
                        silently does nothing. */}
                    {isAdmin && generatableCount > 0 && (
                        <button
                            type="button"
                            className="btn btn-sm fw-semibold wt-touch-target w-100 w-md-auto text-nowrap"
                            style={{
                                height: '38px',
                                borderRadius: '8px',
                                border: '1.5px solid #1E3A8A',
                                background: '#ffffff',
                                color: '#1E3A8A',
                            }}
                            disabled={generating}
                            onClick={handleGenerateYear}
                            title={`Add the ${generatableCount} holiday(s) with a repeating date to ${selectedYear}`}
                        >
                            {generating ? (
                                <span className="d-flex align-items-center gap-2 justify-content-center">
                                    <span className="spinner-border spinner-border-sm" />
                                    Generating…
                                </span>
                            ) : `Generate from config (${generatableCount})`}
                        </button>
                    )}

                    {/* Off-Saturdays. Only offered when a month is actually below quota,
                        so it never invites a click that would do nothing. Previews before
                        writing, and is additive — an adjusted date is never moved. */}
                    {isAdmin && weekendAudit && weekendAudit.violations.length > 0 && (
                        <button
                            type="button"
                            className="btn btn-sm fw-semibold wt-touch-target w-100 w-md-auto text-nowrap"
                            style={{
                                height: '38px',
                                borderRadius: '8px',
                                border: '1.5px solid #1E3A8A',
                                background: '#ffffff',
                                color: '#1E3A8A',
                            }}
                            disabled={generatingSaturdays}
                            onClick={handleGenerateSaturdays}
                            title={`Fill the ${weekendAudit.violations.length} month(s) below ${weekendAudit.quota} off-Saturdays in ${selectedYear}`}
                        >
                            {generatingSaturdays ? (
                                <span className="d-flex align-items-center gap-2 justify-content-center">
                                    <span className="spinner-border spinner-border-sm" />
                                    Generating…
                                </span>
                            ) : `Generate Saturdays (${weekendAudit.violations.length})`}
                        </button>
                    )}

                    {/* Add Holiday Button */}
                    {isAdmin && (
                        <PremiumButton
                            icon="bi-plus"
                            className="wt-touch-target w-100 w-md-auto"
                            onClick={() => setShowAddModal(true)}
                        >
                            Add Holiday
                        </PremiumButton>
                    )}
                </div>
            </div>

            {/* Mobile filter panel — renders immediately below the toolbar's Filters
                button, so toggling it shows results right where the tap happened.
                (The old approach reused the desktop sidebar column, which sits at the
                bottom of the mobile stack — order-3, after the whole holiday list — so
                toggling it open appeared to do nothing without scrolling all the way
                down. This is a separate, always-mobile-only render of the same content
                and state, positioned where a user actually expects it.) */}
            {showMobileFilters && (
                <div className="d-md-none border-bottom border-gray-200 p-6" style={{ background: '#ffffff' }}>
                    {renderFilterPanel()}
                </div>
            )}

            {/* --- THREE COLUMN HIGH-FIDELITY BENTO GRID LAYOUT --- */}
            <div className="row g-0">

                {/* === COLUMN 1: LEFT SIDEBAR FILTERS (col-md-2) ===
                    Desktop-only now (d-none, overridden to d-md-block ≥768px) — the
                    mobile-visible copy of this same content lives in the toggle panel
                    above, not here, so it's reachable without scrolling past the list. */}
                <div className="col-12 col-md-2 order-md-1 border-end border-gray-200 p-6 d-none d-md-block" style={{ background: '#ffffff' }}>
                    {renderFilterPanel()}
                </div>

                {/* === COLUMN 2: MIDDLE TABLE TIMELINE OR MONTH SLIDER (col-md-7) ===
                    order-2 on mobile: the Next-Countdown/Distribution summary (column 3)
                    surfaces first as the "upcoming holiday highlight", then the actual
                    month-wise holiday list. */}
                <div className="col-12 col-md-7 order-2 p-4 p-md-8">

                    {/* Holidays configured in the master list that have no date in this
                        year. Movable festivals land here every year by design — their
                        date genuinely cannot be derived, so this is a to-do list rather
                        than an error. Shown before the schedule so an incomplete year is
                        obvious instead of just looking short. */}
                    {/* Off-Saturday quota. The list alone cannot show this — a month
                        holding 1 off-day instead of 2 just looks like a shorter month,
                        and that missing row is what turns a paid day off into an
                        absence. Shown for admins before the schedule so it is checkable
                        before payroll closes the month. */}
                    {!loading && isAdmin && weekendAudit && (
                        <div
                            className="mb-6 p-4 p-md-5"
                            style={{
                                background: weekendAudit.violations.length ? '#fef2f2' : '#f0fdf4',
                                border: `1px solid ${weekendAudit.violations.length ? '#fecaca' : '#bbf7d0'}`,
                                borderRadius: '12px',
                            }}
                        >
                            <div className="d-flex align-items-start gap-3">
                                <KTIcon
                                    iconName={weekendAudit.violations.length ? 'shield-cross' : 'shield-tick'}
                                    className={`fs-2 mt-1 ${weekendAudit.violations.length ? 'text-danger' : 'text-success'}`}
                                />
                                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                        <span className="fw-bold text-gray-800">
                                            Off-Saturdays {weekendAudit.total}/{weekendAudit.expected}
                                        </span>
                                        <span className="fs-8 text-gray-600">
                                            ({weekendAudit.quota} per month)
                                        </span>
                                    </div>
                                    <div className="fs-8 text-gray-600 mb-3">
                                        {weekendAudit.violations.length
                                            ? `${weekendAudit.violations.length} month(s) are off quota. A month short by one marks a paid day off as an absence.`
                                            : `Every month has its ${weekendAudit.quota}. Which Saturdays they are is up to you — adjusted dates count the same.`}
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {weekendAudit.months.map(m => {
                                            const bad = m.status !== 'ok';
                                            return (
                                                <span
                                                    key={m.month}
                                                    className="badge fw-semibold"
                                                    title={m.dates.length ? m.dates.join(', ') : 'No off-Saturdays set'}
                                                    style={{
                                                        background: '#ffffff',
                                                        border: `1px solid ${bad ? '#fecaca' : '#bbf7d0'}`,
                                                        color: bad ? '#991b1b' : '#166534',
                                                        borderRadius: '999px',
                                                        padding: '6px 12px',
                                                    }}
                                                >
                                                    {m.label.split(' ')[0]} {m.count}/{m.quota}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && isAdmin && needsDateHolidays.length > 0 && (
                        <div
                            className="mb-6 p-4 p-md-5"
                            style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px' }}
                        >
                            <div className="d-flex align-items-start gap-3">
                                <KTIcon iconName="information-5" className="fs-2 text-warning mt-1" />
                                <div className="flex-grow-1">
                                    <div className="fw-bold text-gray-800 mb-1">
                                        {needsDateHolidays.length} holiday{needsDateHolidays.length === 1 ? '' : 's'} still need
                                        {needsDateHolidays.length === 1 ? 's' : ''} a date in {selectedYear}
                                    </div>
                                    <div className="fs-8 text-gray-600 mb-3">
                                        These move each year, so their date can't be filled in automatically. Use
                                        <span className="fw-semibold"> Add Holiday </span>
                                        to set the real date for {selectedYear}.
                                    </div>
                                    <div className="d-flex flex-wrap gap-2">
                                        {needsDateHolidays.map((m: any) => (
                                            <span
                                                key={m.id}
                                                className="badge fw-semibold"
                                                style={{
                                                    background: '#ffffff',
                                                    border: '1px solid #fde68a',
                                                    color: '#92400e',
                                                    borderRadius: '999px',
                                                    padding: '6px 12px',
                                                }}
                                            >
                                                {m.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="d-flex justify-content-center align-items-center py-20">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : viewMode === 'List' ? (
                        // === GRID VIEW (TABLE SCHEDULE TIMELINE) ===
                        Object.keys(groupedHolidays).length === 0 ? (
                            <div className="text-center py-20 text-muted">
                                <KTIcon iconName="calendar-slash" className="fs-2x mb-3 text-gray-400 d-block" />
                                <span className="fw-semibold">No holidays match the selected filters.</span>
                            </div>
                        ) : (
                            <div className="card border-0 shadow-xs p-6" style={{ borderRadius: '12px', background: '#ffffff' }}>
                                
                                {/* Table Header Row — desktop only; the mobile row below is
                                    self-labeled (date badge + inline type/day chips), so a
                                    5-column header has nothing useful to anchor on mobile. */}
                                <div className="d-none d-md-flex text-muted fw-bold fs-8 text-uppercase pb-3 mb-1 border-bottom border-gray-200 align-items-center" style={{ letterSpacing: '0.5px' }}>
                                    <div className="col-2 text-start">Date</div>
                                    <div className="col-4 text-start">Holiday Name</div>
                                    <div className="col-2 text-start">Type</div>
                                    <div className="col-2 text-start">Day</div>
                                    <div className="col-2 text-end">Actions</div>
                                </div>

                                {/* Month Group Timeline */}
                                {Object.entries(groupedHolidays).map(([month, list]) => (
                                    <div key={month} className="mt-4">

                                        {/* Month Banner Stripe */}
                                        <div className="bg-light px-4 py-2 text-gray-800 fw-bold fs-7 rounded-sm mb-2 text-uppercase" style={{ background: '#f5f8fa', letterSpacing: '0.5px' }}>
                                            {month}
                                        </div>

                                        {/* Holiday Cards under month */}
                                        <div>
                                            {list.map((item) => {
                                                const dObj = dayjs(item.date, 'DD-MM-YYYY');
                                                const isFixed = item.type === 'Fixed';
                                                const isNext = nextUpcomingHoliday && nextUpcomingHoliday.id === item.id;
                                                const typeChip = item.isWeekend
                                                    ? { backgroundColor: '#F1F5F9', color: '#475569' }
                                                    : isFixed
                                                        ? { backgroundColor: T.color.brandSoft, color: T.color.brand }
                                                        : { backgroundColor: '#FFFBEB', color: '#D97706' };

                                                const rowActions = isAdmin ? (
                                                    <>
                                                        {allowdEdit && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm border-0 shadow-xs wt-touch-target"
                                                                onClick={() => handleEdit(item)}
                                                                aria-label={`Edit ${item.name}`}
                                                                style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#f5f8fa' }}
                                                            >
                                                                <KTIcon iconName="pencil" className="fs-5 text-gray-600" />
                                                            </button>
                                                        )}
                                                        {allowDelete && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-icon btn-bg-light btn-active-color-danger btn-sm border-0 shadow-xs wt-touch-target"
                                                                onClick={() => handleDelete(item)}
                                                                aria-label={`Delete ${item.name}`}
                                                                style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#f5f8fa' }}
                                                            >
                                                                <KTIcon iconName="trash" className="fs-5 text-gray-600" />
                                                            </button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <KTIcon iconName="lock" className="fs-5 text-gray-400" />
                                                );

                                                return (
                                                    <div key={item.id}>
                                                        {/* Desktop row — fixed 5-column layout, ≥768px only. */}
                                                        <div
                                                            className="d-none d-md-flex align-items-center py-4 px-4 border-bottom border-gray-100 fs-6 hover-bg-light transition-all rounded"
                                                        >
                                                            <div className="col-2 fw-semibold text-gray-800">
                                                                {dObj.format('MMM DD')}
                                                            </div>

                                                            <div className="col-4 fw-bold text-gray-900 d-flex align-items-center gap-2">
                                                                {item.name}
                                                                {isNext && (
                                                                    <span className="badge badge-light-success text-success fw-bold fs-9 px-2 py-0.5" style={{ backgroundColor: '#E8F5E9', border: '1px solid #C8E6C9' }}>
                                                                        NEXT
                                                                    </span>
                                                                )}
                                                                {item.branchName && (
                                                                    <span className="badge fw-semibold fs-9 px-2 py-0.5" style={{ backgroundColor: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>
                                                                        <KTIcon iconName="geolocation" className="fs-9 me-1" />
                                                                        {item.branchName}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="col-2">
                                                                <span className="badge fw-bold px-3 py-1.5 fs-9" style={typeChip}>
                                                                    {item.isWeekend ? 'Weekend' : item.type}
                                                                </span>
                                                            </div>

                                                            <div className="col-2 text-muted">
                                                                {item.day}
                                                            </div>

                                                            <div className="col-2 text-end">
                                                                <div className="d-flex align-items-center justify-content-end gap-1.5">
                                                                    {rowActions}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Mobile row — compact date block + stacked details, below 768px.
                                                            Same data/handlers as the desktop row, just laid out for a
                                                            narrow viewport instead of squeezed into 5 fixed columns. */}
                                                        <div className="d-flex d-md-none align-items-center gap-3 py-3 px-2 border-bottom border-gray-100">
                                                            <div className="text-center flex-shrink-0" style={{ width: '44px', height: '46px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E2E8F0', background: '#ffffff' }}>
                                                                <div className="fw-bold text-white text-uppercase" style={{ background: isFixed ? T.color.brand : '#D97706', fontSize: '8px', letterSpacing: '0.4px', padding: '2px 0' }}>
                                                                    {dObj.format('MMM')}
                                                                </div>
                                                                <div className="fw-bold text-gray-900" style={{ fontSize: '15px', lineHeight: '1.3' }}>
                                                                    {dObj.format('DD')}
                                                                </div>
                                                            </div>

                                                            <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                                                <div className="fw-bold text-gray-900 fs-7 d-flex align-items-center gap-2" style={{ wordBreak: 'break-word' }}>
                                                                    <span>{item.name}</span>
                                                                    {isNext && (
                                                                        <span className="badge badge-light-success text-success fw-bold fs-10 px-2 py-0.5 flex-shrink-0" style={{ backgroundColor: '#E8F5E9' }}>
                                                                            NEXT
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="d-flex align-items-center flex-wrap gap-2 mt-1">
                                                                    <span className="fs-8 text-muted">{item.day}</span>
                                                                    <span className="badge fw-bold px-2 py-0.5 fs-10" style={typeChip}>
                                                                        {item.isWeekend ? 'Weekend' : item.type}
                                                                    </span>
                                                                    {item.branchName && (
                                                                        <span className="badge fw-semibold fs-10 px-2 py-0.5" style={{ backgroundColor: '#EEF2FF', color: '#4338CA' }}>
                                                                            {item.branchName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="d-flex align-items-center gap-1 flex-shrink-0">
                                                                {rowActions}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : selectedMonthIndex === null ? (
                        // === ALL MONTHS VIEW (GROUPED CARD GRID) ===
                        Object.keys(groupedHolidays).length === 0 ? (
                            <div className="card border-0 shadow-xs p-10 text-center text-muted" style={{ borderRadius: '12px', background: '#ffffff' }}>
                                <KTIcon iconName="sun" className="fs-3x text-warning mb-4" />
                                <h4 className="fw-bold text-gray-800 mb-1">No Public Holidays</h4>
                                <p className="fs-7 text-muted m-0">No holidays match the selected filters.</p>
                            </div>
                        ) : (
                            <div className="d-flex flex-column gap-6">
                                {Object.entries(groupedHolidays).map(([month, list]) => (
                                    <div key={month}>
                                        <div className="mb-3 fs-6 fw-bold text-gray-900 text-uppercase" style={{ letterSpacing: '1px' }}>
                                            {month}
                                        </div>
                                        <div className="row g-4">
                                            {list.map(renderHolidayCard)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        // === MONTH VIEW (SLIDING MONTH CAROUSEL) ===
                        <div>
                            {/* Slide Navigation Header */}
                            <div className="d-flex align-items-center justify-content-between mb-6 p-4 rounded" style={{ background: '#f5f8fa', border: '1px solid #e2e8f0' }}>
                                <button type="button" className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm border-0 shadow-xs" onClick={prevSlideMonth}>
                                    <KTIcon iconName="left" className="fs-3 text-gray-600" />
                                </button>
                                <span className="fs-4 fw-bold text-gray-900 text-uppercase" style={{ letterSpacing: '1px' }}>
                                    {dayjs().month(displayMonthIndex).format('MMMM')} {selectedYear}
                                </span>
                                <button type="button" className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm border-0 shadow-xs" onClick={nextSlideMonth}>
                                    <KTIcon iconName="right" className="fs-3 text-gray-600" />
                                </button>
                            </div>

                            {slideMonthHolidays.length === 0 ? (
                                <div className="card border-0 shadow-xs p-10 text-center text-muted" style={{ borderRadius: '12px', background: '#ffffff' }}>
                                    <KTIcon iconName="sun" className="fs-3x text-warning mb-4" />
                                    <h4 className="fw-bold text-gray-800 mb-1">No Public Holidays</h4>
                                    <p className="fs-7 text-muted m-0">No public holidays are scheduled for this month. Enjoy your normal weekend breaks!</p>
                                </div>
                            ) : (
                                <div className="row g-4">
                                    {slideMonthHolidays.map(renderHolidayCard)}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* === COLUMN 3: RIGHT COUNTDOWN & STATS SIDEBAR (col-md-3) ===
                    order-1/order-md-3: this is the mobile "upcoming holiday highlight" +
                    at-a-glance summary, so it leads on mobile; on desktop it stays the
                    familiar right rail (last, ≥768px). */}
                <div className="col-12 col-md-3 order-1 order-md-3 border-start border-gray-200 p-4 p-md-6 d-flex flex-column gap-4 gap-md-6" style={{ background: '#ffffff' }}>
                    
                    {/* Widget 1: Next Countdown Card */}
                    {nextUpcomingHoliday && (() => {
                        const diffDays = nextUpcomingHoliday.djs.diff(dayjs().startOf('day'), 'day');
                        const countdownLabel = diffDays === 0 
                            ? 'TODAY' 
                            : diffDays === 1 
                                ? 'TOMORROW' 
                                : `${diffDays} DAYS LEFT`;
                        
                        return (
                            <div 
                                className="card border-0 text-white p-6 shadow-sm position-relative overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, #1E3A8A 0%, #152960 100%)',
                                    borderRadius: '12px',
                                }}
                            >
                                <span className="fs-9 text-uppercase fw-bold text-white d-block mb-1" style={{ opacity: 0.7, letterSpacing: '0.8px' }}>Next Countdown</span>
                                <h3 className="fs-1 fw-bold text-white mb-2">{countdownLabel}</h3>
                                <p className="fs-6 fw-semibold text-white mb-5" style={{ opacity: 0.9 }}>{nextUpcomingHoliday.name}</p>
                                
                                <button 
                                    type="button" 
                                    className="btn btn-sm w-100 text-white fw-bold d-flex align-items-center justify-content-center gap-2 py-2.5"
                                    style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '6px', fontSize: '13px', border: '1px solid rgba(255,255,255,0.1)' }}
                                    onClick={() => successConfirmation(`Reminder set for ${nextUpcomingHoliday.name}`)}
                                >
                                    <KTIcon iconName="notification" className="fs-5 text-white" />
                                    Add Reminder
                                </button>
                            </div>
                        );
                    })()}

                    {/* Widget 2: Distribution Card */}
                    <div className="card shadow-xs border border-gray-150 p-6" style={{ borderRadius: '12px', background: '#fbfcfd' }}>
                        <h4 className="fs-8 text-uppercase fw-bold text-gray-500 mb-4" style={{ letterSpacing: '0.8px' }}>{selectedYear} Distribution</h4>
                        <div className="d-flex flex-column gap-3 fs-6">
                            <div className="d-flex align-items-center justify-content-between text-gray-700">
                                <span>Fixed Holidays</span>
                                <span className="fw-bold">{fixedCount}</span>
                            </div>
                            <div className="d-flex align-items-center justify-content-between text-gray-700">
                                <span>Floating Days</span>
                                <span className="fw-bold">{floatingCount}</span>
                            </div>
                            <div className="border-top border-gray-300 my-1"></div>
                            <div className="d-flex align-items-center justify-content-between text-gray-900 fw-bold fs-5">
                                <span>Total</span>
                                <span>{totalCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Widget 3: Long Weekends Card */}
                    <div className="card shadow-xs border border-gray-150 p-6" style={{ borderRadius: '12px', background: '#fbfcfd' }}>
                        <div className="d-flex align-items-center justify-content-between mb-4">
                            <h4 className="fs-8 text-uppercase fw-bold text-gray-500 m-0" style={{ letterSpacing: '0.8px' }}>Long Weekends</h4>
                            <span className="badge badge-light-primary text-primary fw-bold fs-9 py-1 px-2.5 rounded-sm" style={{ backgroundColor: T.color.brandSoft, color: T.color.brand }}>
                                {longWeekends.length} Found
                            </span>
                        </div>
                        
                        {longWeekends.length === 0 ? (
                            <div className="text-muted fs-7 py-2">No long weekends in the list.</div>
                        ) : (
                            <div className="d-flex flex-column gap-3 overflow-auto custom-scrollbar" style={{ maxHeight: '220px' }}>
                                {longWeekends.map((lw, i) => (
                                    <div key={i} className="p-3 border rounded shadow-xs" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
                                        <span className="fs-7 fw-bold text-gray-800 d-block mb-1">{lw.name}</span>
                                        <span className="fs-8 text-muted fw-semibold">{lw.label} ({lw.range})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Holiday Modal */}
            <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg" fullscreen="md-down" contentClassName="rounded-4 border-0 shadow-lg">
                <Modal.Header closeButton style={{ border: 'none', padding: '22px 24px 6px' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div
                            style={{
                                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `linear-gradient(135deg, ${T.color.brand}1F, ${T.color.brand}0D)`,
                                color: T.color.brand,
                            }}
                        >
                            <KTIcon iconName="pencil" className="fs-3" />
                        </div>
                        <div>
                            <Modal.Title style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', margin: 0 }}>
                                Edit Holiday
                            </Modal.Title>
                            <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 1 }}>Update this holiday's details</div>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body style={{ padding: '10px 24px 24px' }}>
                    <PublicHoliday onClose={() => setShowEditModal(false)} setShowNewHolidayForm={setShowEditModal} isEditMode={true} editData={currentEditHolidayData || undefined} holidayNameForEditMode={holidayNameForEditMode} setRefetch={setRefetch} />
                </Modal.Body>
            </Modal>

            {/* Add Holiday Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered size="lg" fullscreen="md-down" contentClassName="rounded-4 border-0 shadow-lg">
                <Modal.Header closeButton style={{ border: 'none', padding: '22px 24px 6px' }}>
                    <div className="d-flex align-items-center gap-3">
                        <div
                            style={{
                                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `linear-gradient(135deg, ${T.color.brand}1F, ${T.color.brand}0D)`,
                                color: T.color.brand,
                            }}
                        >
                            <KTIcon iconName="calendar" className="fs-3" />
                        </div>
                        <div>
                            <Modal.Title style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px', margin: 0 }}>
                                Add Holiday
                            </Modal.Title>
                            <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 1 }}>Schedule a new holiday for {selectedYear}</div>
                        </div>
                    </div>
                </Modal.Header>
                <Modal.Body style={{ padding: '10px 24px 24px' }}>
                    <PublicHoliday onClose={() => setShowAddModal(false)} setShowNewHolidayForm={undefined} sendNotification={() => setRefetch(prev => !prev)} />
                </Modal.Body>
            </Modal>
        </div>
    );
}

export default PublicHolidaysListTwo;