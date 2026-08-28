// CompaniesByLocationAndStatus.tsx
import React, { useMemo, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { ChartDialogModal } from "../components/ChartDialogModal";
import dayjs from "dayjs";
import { AnalyticsCard, RankedBarChart, ChartDatum, ChartMetric, applyMetric } from "@pages/dashboard/leadAnalytics";


type Filters = {
  country: string;
  state: string;
  city: string;
  locality: string;
  status: string;
};

const UNKNOWN = "NA"; // display for null/empty
const NA = "__NA__"; // drill-down sentinel — matches EntityTablePage's NA filter

interface LocationAnalytics {
  statusId: string;
  status: string;
  color: string;
  // Real master-table ids (or "__NA__" for a null/unmapped value) — see
  // LeadRepository.getAllLeads / getLeadsByLocationAnalytics. Locality has no
  // master table, so its "id" is the raw name (or "__NA__").
  countryId: string;
  stateId: string;
  cityId: string;
  localityId: string;
  country: string | null;
  state: string | null;
  city: string | null;
  locality: string | null;
  count: number;
  budget: number;

}

const normalize = (v?: string | null) => {
  if (v === null || v === undefined) return UNKNOWN;
  const s = String(v).trim();
  if (s === "") return UNKNOWN;
  return s;
};

const uniqueSorted = (arr: string[]) =>
  Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));

export default function LeadByLocationAndStatus({data, startDate, endDate, entityScope = "lead", receivedOnly = false, metric = "count"}: {data: LocationAnalytics[], startDate?: dayjs.Dayjs, endDate?: dayjs.Dayjs, entityScope?: "lead" | "project", receivedOnly?: boolean, metric?: ChartMetric}) {
  // console.log("leaddata",data);

  // default filters
  const [openLocation, setOpenLocation] = useState(false);
  // Which dimension was clicked (Country/State/City/Locality) — each maps to a
  // distinct EntityTablePage/ChartDialogModal prop so drilling into "By City"
  // never gets confused with "By Country" (see handleLevelClick below).
  const [drillLevel, setDrillLevel] = useState<"country" | "state" | "city" | "locality" | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  

  const [filters, setFilters] = useState<Filters>({
    country: "All",
    state: "All",
    city: "All",
    locality: "All",
    status: "All",
  });


  // Filter data based on current filters
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesStatus = filters.status === "All" || item.status === filters.status;
      const matchesCountry = filters.country === "All" || normalize(item.country) === filters.country;
      const matchesState = filters.state === "All" || normalize(item.state) === filters.state;
      const matchesCity = filters.city === "All" || normalize(item.city) === filters.city;
      const matchesLocality = filters.locality === "All" || normalize(item.locality) === filters.locality;

      return matchesStatus && matchesCountry && matchesState && matchesCity && matchesLocality;
    });
  }, [data, filters]);

  // Get unique options for dropdowns based on current filters
  const countryOptions = useMemo(() => {
    const statusFiltered = filters.status === "All"
      ? data
      : data.filter(item => item.status === filters.status);
    return ["All", ...uniqueSorted(statusFiltered.map((item) => normalize(item.country)))];
  }, [data, filters.status]);

  const stateOptions = useMemo(() => {
    const filtered = data.filter(item =>
      (filters.status === "All" || item.status === filters.status) &&
      (filters.country === "All" || normalize(item.country) === filters.country)
    );
    return ["All", ...uniqueSorted(filtered.map((item) => normalize(item.state)))];
  }, [data, filters.status, filters.country]);

  const cityOptions = useMemo(() => {
    const filtered = data.filter(item =>
      (filters.status === "All" || item.status === filters.status) &&
      (filters.country === "All" || normalize(item.country) === filters.country) &&
      (filters.state === "All" || normalize(item.state) === filters.state)
    );
    return ["All", ...uniqueSorted(filtered.map((item) => normalize(item.city)))];
  }, [data, filters.status, filters.country, filters.state]);

  const localityOptions = useMemo(() => {
    const filtered = data.filter(item =>
      (filters.status === "All" || item.status === filters.status) &&
      (filters.country === "All" || normalize(item.country) === filters.country) &&
      (filters.state === "All" || normalize(item.state) === filters.state) &&
      (filters.city === "All" || normalize(item.city) === filters.city)
    );
    return ["All", ...uniqueSorted(filtered.map((item) => normalize(item.locality)))];
  }, [data, filters.status, filters.country, filters.state, filters.city]);

  const statusOptions = useMemo(() => {
    return ["All", ...uniqueSorted(data.map((item) => item.status))];
  }, [data]);

  // Show all levels separately

  // One handler per geographic level — clicking a bar in "By Country" must only
  // ever filter by country (never state/city), and an N/A bar must show exactly
  // the leads with no value on THAT dimension. Each level's chart data carries
  // the real backend id (or "__NA__") as ChartDatum.id (see createChartData).
  const handleLevelClick = (level: "country" | "state" | "city" | "locality") => (selectedLabel: string) => {
    const grouped = { country: countryGrouped, state: stateGrouped, city: cityGrouped, locality: localityGrouped }[level];
    const found = grouped.find((g) => g.name === selectedLabel);
    setDrillLevel(level);
    setLocationId(found?.id ?? NA);
    setLocationLabel(selectedLabel);
    setOpenLocation(true);
  };

  // Create separate groupings for each geographic level, keyed by the real
  // backend id (or "__NA__") rather than the display name — two different
  // records that happen to share a display name (rare, but possible for city/
  // locality) never get merged into one bar.
  const createGroupedData = (getId: (item: LocationAnalytics) => string, getLabel: (item: LocationAnalytics) => string) => {
    const map: Record<string, {
      id: string;
      name: string;
      totalBudget: number;
      totalCount: number;
      color?: string;
    }> = {};

    filteredData.forEach((item) => {
      const id = getId(item);
      const label = getLabel(item);
      const color = item.color;

      if (!map[id]) {
        map[id] = {
          id,
          name: label,
          totalBudget: 0,
          totalCount: 0,
          color: color
        };
      }

      map[id].totalBudget += item.budget;
      map[id].totalCount += item.count;
    });

    // Sort by lead count (descending) — RankedBarChart handles user-triggered sort
    const result = Object.values(map).sort((a, b) => b.totalCount - a.totalCount);
    return result;
  };

  const countryGrouped = useMemo(() => createGroupedData(item => item.countryId, item => normalize(item.country)), [filteredData]);
  const stateGrouped = useMemo(() => createGroupedData(item => item.stateId, item => normalize(item.state)), [filteredData]);
  const cityGrouped = useMemo(() => createGroupedData(item => item.cityId, item => normalize(item.city)), [filteredData]);
  const localityGrouped = useMemo(() => createGroupedData(item => item.localityId, item => normalize(item.locality)), [filteredData]);

  // Change handlers with cascading resets
  const handleChange = (key: keyof Filters) => (e: SelectChangeEvent<string>) => {
    const val = e.target.value;

    if (key === "status") {
      setFilters({
        country: "All",
        state: "All",
        city: "All",
        locality: "All",
        status: val,
      });
    } else if (key === "country") {
      setFilters((prev) => ({
        ...prev,
        country: val,
        state: "All",
        city: "All",
        locality: "All",
      }));
    } else if (key === "state") {
      setFilters((prev) => ({
        ...prev,
        state: val,
        city: "All",
        locality: "All",
      }));
    } else if (key === "city") {
      setFilters((prev) => ({
        ...prev,
        city: val,
        locality: "All"
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: val
      }));
    }
  };

  // This chart is reused for both leads and projects, so the tooltip/subtitle
  // noun follows the scope instead of always reading "Leads".
  const entityNoun = entityScope === "project" ? "Projects" : "Leads";
  const locSubtitle = (what: string) =>
    metric === "amount"
      ? `Top ${what} by ${entityNoun.toLowerCase()} value · count in tooltip`
      : `Top ${what} by ${entityNoun.toLowerCase()} volume · revenue in tooltip`;

  // Map grouped data into chart format for each level, then re-point it at the
  // selected measure (count vs budget). The grouping above always accumulates
  // both, so switching costs nothing.
  const createChartData = (grouped: any[]) => applyMetric(
    grouped.map((g) => ({
      label: g.name,
      value: g.totalCount,
      totalCost: Math.round(g.totalBudget),
      id: g.id,
    })),
    metric,
  );

  const countryChartData: ChartDatum[] = createChartData(countryGrouped);
  const stateChartData: ChartDatum[] = createChartData(stateGrouped);
  const cityChartData: ChartDatum[] = createChartData(cityGrouped);
  const localityChartData: ChartDatum[] = createChartData(localityGrouped);

  return (
    <>
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          padding: "22px 24px",
        }}
      >
        <div>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
            <div>
              <h2
                style={{
                  fontFamily: "Barlow, sans-serif",
                  fontWeight: 600,
                  fontSize: 18,
                  margin: 0,
                  color: "#0F172A",
                }}
              >
                Geographic Distribution
              </h2>
              <span
                style={{
                  fontFamily: "Barlow, sans-serif",
                  fontWeight: 400,
                  fontSize: 14,
                  margin: 0,
                  color: "#64748B",
                  display: "block",
                  marginTop: 4,
                }}
              >
                View leads by location
              </span>
            </div>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "nowrap", justifyContent: "flex-end", minWidth: "fit-content" }}>
              <FormControl sx={{ minWidth: 140 }} size="small">
                <InputLabel id="status-label" sx={{ color: '#1E3A8A', '&.Mui-focused': { color: '#1E3A8A' } }}>Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={filters.status}
                  label="Status"
                  onChange={handleChange("status")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '& .MuiSelect-select': {
                      color: '#1E3A8A',
                    }
                  }}
                >
                  {statusOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 140 }} size="small">
                <InputLabel id="country-label" sx={{ color: '#1E3A8A', '&.Mui-focused': { color: '#1E3A8A' } }}>Country</InputLabel>
                <Select
                  labelId="country-label"
                  value={filters.country}
                  label="Country"
                  onChange={handleChange("country")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '& .MuiSelect-select': {
                      color: '#1E3A8A',
                    }
                  }}
                >
                  {countryOptions.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 140 }} size="small">
                <InputLabel id="state-label" sx={{ color: '#1E3A8A', '&.Mui-focused': { color: '#1E3A8A' } }}>State</InputLabel>
                <Select
                  labelId="state-label"
                  value={filters.state}
                  label="State"
                  onChange={handleChange("state")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '& .MuiSelect-select': {
                      color: '#1E3A8A',
                    }
                  }}
                >
                  {stateOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 140 }} size="small">
                <InputLabel id="city-label" sx={{ color: '#1E3A8A', '&.Mui-focused': { color: '#1E3A8A' } }}>City</InputLabel>
                <Select
                  labelId="city-label"
                  value={filters.city}
                  label="City"
                  onChange={handleChange("city")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '& .MuiSelect-select': {
                      color: '#1E3A8A',
                    }
                  }}
                >
                  {cityOptions.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 140 }} size="small">
                <InputLabel id="locality-label" sx={{ color: '#1E3A8A', '&.Mui-focused': { color: '#1E3A8A' } }}>Locality</InputLabel>
                <Select
                  labelId="locality-label"
                  value={filters.locality}
                  label="Locality"
                  onChange={handleChange("locality")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#1E3A8A',
                    },
                    '& .MuiSelect-select': {
                      color: '#1E3A8A',
                    }
                  }}
                >
                  {localityOptions.map((l) => (
                    <MenuItem key={l} value={l}>
                      {l}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Box sx={{ borderRadius: 2 }}>
            {/* Location Rankings — Compact Full Width Bar Charts */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Country Ranking */}
              <AnalyticsCard
                title="By Country"
                subtitle={locSubtitle("locations")}
                index={0}
                isEmpty={countryChartData.length === 0}
                emptyHint="No country data."
              >
                <RankedBarChart
                  data={countryChartData}
                  onSelect={handleLevelClick("country")}
                  showRevenue={metric !== "amount"}
                  metric={metric}
                  entityLabel={entityNoun}
                  barColor="#0EA5E9"
                  height={380}
                  valueLabel
                  title="Leads by Country"
                />
              </AnalyticsCard>

              {/* State Ranking */}
              <AnalyticsCard
                title="By State"
                subtitle={locSubtitle("locations")}
                index={1}
                isEmpty={stateChartData.length === 0}
                emptyHint="No state data."
              >
                <RankedBarChart
                  data={stateChartData}
                  onSelect={handleLevelClick("state")}
                  showRevenue={metric !== "amount"}
                  metric={metric}
                  entityLabel={entityNoun}
                  barColor="#10B981"
                  height={380}
                  valueLabel
                  title="Leads by State"
                />
              </AnalyticsCard>

              {/* City Ranking */}
              <AnalyticsCard
                title="By City"
                subtitle={locSubtitle("locations")}
                index={2}
                isEmpty={cityChartData.length === 0}
                emptyHint="No city data."
              >
                <RankedBarChart
                  data={cityChartData}
                  onSelect={handleLevelClick("city")}
                  showRevenue={metric !== "amount"}
                  metric={metric}
                  entityLabel={entityNoun}
                  barColor="#F59E0B"
                  height={380}
                  valueLabel
                  title="Leads by City"
                />
              </AnalyticsCard>

              {/* Locality Ranking */}
              <AnalyticsCard
                title="By Locality"
                subtitle={locSubtitle("neighborhoods")}
                index={3}
                isEmpty={localityChartData.length === 0}
                emptyHint="No locality data."
              >
                <RankedBarChart
                  data={localityChartData}
                  onSelect={handleLevelClick("locality")}
                  showRevenue={metric !== "amount"}
                  metric={metric}
                  entityLabel={entityNoun}
                  barColor="#8B5CF6"
                  height={380}
                  valueLabel
                  title="Leads by Locality"
                />
              </AnalyticsCard>
            </Box>
            {filteredData.length > 0 && (
              <Box
                sx={{ mt: 3, display: "flex", gap: 3, justifyContent: "center" }}
                style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#64748B" }}
              >
                <span>
                  <strong>Total Leads:</strong>{" "}
                  {filteredData.reduce((sum, item) => sum + item.count, 0)}
                </span>
                <span>
                  <strong>Total Budget:</strong> ₹
                  {filteredData.reduce((sum, item) => sum + item.budget, 0).toLocaleString()}
                </span>
              </Box>
            )}
          </Box>
        </div>
      </div>

      {/* Location Modal — routed to the ONE prop matching the clicked level, so
          "By City" never leaks into a country-wide filter or vice versa. */}
      <ChartDialogModal
        open={openLocation}
        onClose={() => setOpenLocation(false)}
        title={locationLabel ? `Location · ${locationLabel}` : undefined}
        locationCountryId={drillLevel === "country" ? locationId || undefined : undefined}
        locationCountryName={drillLevel === "country" ? locationLabel || undefined : undefined}
        locationStateId={drillLevel === "state" ? locationId || undefined : undefined}
        locationStateName={drillLevel === "state" ? locationLabel || undefined : undefined}
        locationCityId={drillLevel === "city" ? locationId || undefined : undefined}
        locationCityName={drillLevel === "city" ? locationLabel || undefined : undefined}
        locationLocalityId={drillLevel === "locality" ? locationId || undefined : undefined}
        locationLocalityName={drillLevel === "locality" ? locationLabel || undefined : undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
        receivedOnly={receivedOnly || undefined}
        entityScope={entityScope}
      />


    </>
  );
}