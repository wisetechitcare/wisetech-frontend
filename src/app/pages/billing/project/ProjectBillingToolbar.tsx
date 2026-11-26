import React from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/ds/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";
import { Tabs, TabsTrigger } from "@/ds/ui/tabs";
import { ToggleList, TOGGLE_TAB } from "@/ds/ui/tabs";
import { cn } from "@/ds/lib/utils";
import { FILTERS, SORTS, type BillingFilterTab, type BillingSortOption } from "./projectBillingRules";

const SORT_OPTIONS = (Object.keys(SORTS) as BillingSortOption[]).map((key) => ({ value: key, label: `Sort: ${SORTS[key].label}` }));

/** Filter tabs with counts, search, sort and Expand all — one line that wraps when it must. */
const ProjectBillingToolbar: React.FC<{
    filterTab: BillingFilterTab;
    onFilterTab: (tab: BillingFilterTab) => void;
    countOf: (tab: BillingFilterTab) => number;
    searchQuery: string;
    onSearch: (query: string) => void;
    sortBy: BillingSortOption;
    onSort: (sort: BillingSortOption) => void;
    /** Null when nothing is visible to expand. */
    expandAllOpen: boolean | null;
    onToggleExpand: () => void;
}> = ({ filterTab, onFilterTab, countOf, searchQuery, onSearch, sortBy, onSort, expandAllOpen, onToggleExpand }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filterTab} onValueChange={(v) => onFilterTab(v as BillingFilterTab)} className="max-w-full">
            {/* Phones: one swipeable row instead of a two-row wrap. */}
            <ToggleList aria-label="Filter deliverables" className="max-w-full justify-start overflow-x-auto">
                {(Object.keys(FILTERS) as BillingFilterTab[]).map((tab) => (
                    <TabsTrigger key={tab} value={tab} className={cn(TOGGLE_TAB, "flex-none")}>
                        {FILTERS[tab].label}
                        {tab !== "ALL" && <Badge variant="neutral" className="tabular-nums">{countOf(tab)}</Badge>}
                    </TabsTrigger>
                ))}
            </ToggleList>
        </Tabs>
        {/* One line from sm up (search takes the slack, sort and Expand all keep their size). */}
        <div className="flex min-w-0 flex-[1_1_28rem] flex-wrap justify-end gap-2 sm:flex-nowrap">
            <InputGroup className="h-10 basis-full sm:h-9 sm:max-w-90 sm:basis-40 sm:grow">
                <InputGroupAddon><Search aria-hidden /></InputGroupAddon>
                <InputGroupInput
                    placeholder="Search deliverables, proformas, invoices"
                    aria-label="Search deliverables, proformas and invoices"
                    value={searchQuery}
                    onChange={(e) => onSearch(e.target.value)}
                />
                {searchQuery && (
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => onSearch("")}>
                            <X />
                        </InputGroupButton>
                    </InputGroupAddon>
                )}
            </InputGroup>
            <Select items={SORT_OPTIONS} value={sortBy} onValueChange={(v) => onSort(v as BillingSortOption)}>
                <SelectTrigger size="sm" aria-label="Sort deliverables" className="h-10 flex-1 sm:h-9 sm:min-w-44 sm:flex-none">
                    <SelectValue />
                </SelectTrigger>
                {/* Sized to the longest option, not the trigger (the kit pins it to the trigger's width). */}
                <SelectContent align="end" className="w-auto! min-w-(--anchor-width)">
                    {(Object.keys(SORTS) as BillingSortOption[]).map((key) => (
                        <SelectItem key={key} value={key}>{SORTS[key].label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {expandAllOpen !== null && (
                <Button variant="outline" size="sm" className="h-10 shrink-0 sm:h-9" onClick={onToggleExpand}>
                    {expandAllOpen ? "Collapse all" : "Expand all"}
                </Button>
            )}
        </div>
    </div>
);

export default ProjectBillingToolbar;
