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
import { AnalyticsCard, RankedBarChart, ChartDatum } from "@pages/dashboard/leadAnalytics";


type Filters = {
  country: string;
  state: string;
  city: string;
  locality: string;
  status: string;
};

const UNKNOWN = "NA"; // display for null/empty

interface LocationAnalytics {
  statusId: string;
  status: string;
  color: string;
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

export default function LeadByLocationAndStatus({data, startDate, endDate}: {data: LocationAnalytics[], startDate?: dayjs.Dayjs, endDate?: dayjs.Dayjs}) {
  // console.log("leaddata",data);

  // default filters
  const [openLocation, setOpenLocation] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);

   const [sortOption, setSortOption] = useState("");
  

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

  const handleLocationChartClick = (selectedLabel: string) => {
    const selectedLocation:any = data?.find(
      (location: any) => location.location === selectedLabel
    );
    if (selectedLocation) {
      setLocationId(selectedLocation.location);
    } else {
      setLocationId(selectedLabel);
    }
    setOpenLocation(true);
  };


  // Create separate groupings for each geographic level
  const createGroupedData = (getKey: (item: LocationAnalytics) => string) => {
    const map: Record<string, {
      name: string;
      totalBudget: number;
      totalCount: number;
      color?: string;
    }> = {};

    filteredData.forEach((item) => {
      const key = getKey(item);
      const color = item.color;

      if (!map[key]) {
        map[key] = {
          name: key,
          totalBudget: 0,
          totalCount: 0,
          color: color
        };
      }

      map[key].totalBudget += item.budget;
      map[key].totalCount += item.count;
    });

    const result = Object.values(map);

    // Apply sorting based on sortOption
    if (sortOption === "budget-asc") {
      result.sort((a, b) => a.totalBudget - b.totalBudget);
    } else if (sortOption === "budget-desc") {
      result.sort((a, b) => b.totalBudget - a.totalBudget);
    } else if (sortOption === "title-asc") {
      result.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    } else if (sortOption === "title-desc") {
      result.sort((a, b) => b.name.toLowerCase().localeCompare(a.name.toLowerCase()));
    } else {
      // Default sort by lead count desc
      result.sort((a, b) => b.totalCount - a.totalCount);
    }

    return result;
  };

  const countryGrouped = useMemo(() => createGroupedData(item => normalize(item.country)), [filteredData, sortOption]);
  const stateGrouped = useMemo(() => createGroupedData(item => normalize(item.state)), [filteredData, sortOption]);
  const cityGrouped = useMemo(() => createGroupedData(item => normalize(item.city)), [filteredData, sortOption]);
  const localityGrouped = useMemo(() => createGroupedData(item => normalize(item.locality)), [filteredData, sortOption]);

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

  // Map grouped data into chart format for each level
  const createChartData = (grouped: any[]) => grouped.map((g) => ({
    label: g.name,
    value: g.totalCount,
    totalCost: Math.round(g.totalBudget),
  }));

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
          <div style={{ marginBottom: 12 }}>
            <h2
              style={{
                fontFamily: "Barlow, sans-serif",
                fontWeight: 600,
                fontSize: 18,
                margin: 0,
                color: "#0F172A",
              }}
            >
              Leads by Geographic Location
            </h2>
          </div>
          <Box sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: "flex", mb: 3, gap: 2, flexWrap: "wrap" }}>
              {/* <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel id="sort-label">Sort By</InputLabel>
                <Select
                  labelId="sort-label"
                  value={sortOption}
                  label="Sort By"
                  onChange={(e: SelectChangeEvent<string>) => {
                    const value = e.target.value;
                    setSortOption(value);
                  
                    let sortedData = [...items];
                  
                    console.log('Original items:', JSON.parse(JSON.stringify(sortedData))); // Log the data before sorting
                  
                    if (value === "budget-asc") {
                      sortedData.sort((a, b) => {
                        const valA = a.budget;
                        const valB = b.budget;
                        return valA - valB;
                      });
                    } else if (value === "budget-desc") {
                      sortedData.sort((a, b) => {
                        const valA = a.budget;
                        const valB = b.budget;
                        return valB - valA;
                      });
                    } else if (value === "title-asc") {
                      sortedData.sort((a, b) =>
                       (a.status || "").toLowerCase().localeCompare((b.status || "").toLowerCase())
                      );
                    } else if (value === "title-desc") {
                      sortedData.sort((a, b) =>
                        (b.status || "").toLowerCase().localeCompare((a.status || "").toLowerCase())
                      );
                    }
                  
                    console.log('Sorted items:', JSON.parse(JSON.stringify(sortedData))); // Log the result after sorting
                    setItems(sortedData);
                  }}
                >
                  <MenuItem value="">-- Sort By --</MenuItem>
                  <MenuItem value="budget-asc">Budget (Low → High)</MenuItem>
                  <MenuItem value="budget-desc">Budget (High → Low)</MenuItem>
                  <MenuItem value="title-asc">Title (A → Z)</MenuItem>
                  <MenuItem value="title-desc">Title (Z → A)</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel id="sort-label">Sort By</InputLabel>
                <Select
                  labelId="sort-label"
                  value={sortOption}
                  label="Sort By"
                  onChange={(e: SelectChangeEvent<string>) => {
                    const value = e.target.value;
                    setSortOption(value);
                  
                    let sortedData = [...items];
                  
                    console.log('Original items:', JSON.parse(JSON.stringify(sortedData))); // Log the data before sorting
                  
                    if (value === "budget-asc") {
                      sortedData.sort((a, b) => {
                        const valA = a.budget;
                        const valB = b.budget;
                        return valA - valB;
                      });
                    } else if (value === "budget-desc") {
                      sortedData.sort((a, b) => {
                        const valA = a.budget;
                        const valB = b.budget;
                        return valB - valA;
                      });
                    } else if (value === "title-asc") {
                      sortedData.sort((a, b) =>
                       (a.status || "").toLowerCase().localeCompare((b.status || "").toLowerCase())
                      );
                    } else if (value === "title-desc") {
                      sortedData.sort((a, b) =>
                        (b.status || "").toLowerCase().localeCompare((a.status || "").toLowerCase())
                      );
                    }
                  
                    console.log('Sorted items:', JSON.parse(JSON.stringify(sortedData))); // Log the result after sorting
                    setItems(sortedData);
                  }}
                >
                  <MenuItem value="">-- Sort By --</MenuItem>
                  <MenuItem value="budget-asc">Budget (Low → High)</MenuItem>
                  <MenuItem value="budget-desc">Budget (High → Low)</MenuItem>
                  <MenuItem value="title-asc">Title (A → Z)</MenuItem>
                  <MenuItem value="title-desc">Title (Z → A)</MenuItem>
                </Select>
              </FormControl> */}
              <FormControl sx={{ minWidth: 160 }} size="small">
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

              <FormControl sx={{ minWidth: 160 }} size="small">
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

              <FormControl sx={{ minWidth: 160 }} size="small">
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

              <FormControl sx={{ minWidth: 160 }} size="small">
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

              <FormControl sx={{ minWidth: 160 }} size="small">
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

              <FormControl sx={{ minWidth: 160 }} size="small">
                <InputLabel id="sort-label" sx={{ color: '#1E3A8A', '&.Mui-focused': { color: '#1E3A8A' } }}>Sort By</InputLabel>
                <Select
                  labelId="sort-label"
                  value={sortOption}
                  label="Sort By"
                  onChange={(e: SelectChangeEvent<string>) => {
                    const value = e.target.value;
                    setSortOption(value);
                  }}
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
                  <MenuItem value="">-- Sort By --</MenuItem>
                  <MenuItem value="budget-asc">Budget (Low → High)</MenuItem>
                  <MenuItem value="budget-desc">Budget (High → Low)</MenuItem>
                  <MenuItem value="title-asc">Title (A → Z)</MenuItem>
                  <MenuItem value="title-desc">Title (Z → A)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
              {/* Country Chart */}
              <Box>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#0F172A" }}>By Country</h3>
                {countryChartData.length > 0 ? (
                  <RankedBarChart
                    data={countryChartData}
                    onSelect={handleLocationChartClick}
                    showRevenue
                    lean
                    barColor="#0EA5E9"
                    height={Math.max(220, Math.min(countryChartData.length, 10) * 34)}
                    valueLabel
                    title="Leads by Country"
                  />
                ) : (
                  <div style={{ backgroundColor: "#f8faff", padding: "20px", borderRadius: "8px", textAlign: "center", color: "#9CAFC9", fontSize: "13px" }}>
                    No data available
                  </div>
                )}
              </Box>

              {/* State Chart */}
              <Box>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#0F172A" }}>By State</h3>
                {stateChartData.length > 0 ? (
                  <RankedBarChart
                    data={stateChartData}
                    onSelect={handleLocationChartClick}
                    showRevenue
                    lean
                    barColor="#10B981"
                    height={Math.max(220, Math.min(stateChartData.length, 10) * 34)}
                    valueLabel
                    title="Leads by State"
                  />
                ) : (
                  <div style={{ backgroundColor: "#f8faff", padding: "20px", borderRadius: "8px", textAlign: "center", color: "#9CAFC9", fontSize: "13px" }}>
                    No data available
                  </div>
                )}
              </Box>

              {/* City Chart */}
              <Box>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#0F172A" }}>By City</h3>
                {cityChartData.length > 0 ? (
                  <RankedBarChart
                    data={cityChartData}
                    onSelect={handleLocationChartClick}
                    showRevenue
                    lean
                    barColor="#F59E0B"
                    height={Math.max(220, Math.min(cityChartData.length, 10) * 34)}
                    valueLabel
                    title="Leads by City"
                  />
                ) : (
                  <div style={{ backgroundColor: "#f8faff", padding: "20px", borderRadius: "8px", textAlign: "center", color: "#9CAFC9", fontSize: "13px" }}>
                    No data available
                  </div>
                )}
              </Box>

              {/* Locality Chart */}
              <Box>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#0F172A" }}>By Locality</h3>
                {localityChartData.length > 0 ? (
                  <RankedBarChart
                    data={localityChartData}
                    onSelect={handleLocationChartClick}
                    showRevenue
                    lean
                    barColor="#8B5CF6"
                    height={Math.max(220, Math.min(localityChartData.length, 10) * 34)}
                    valueLabel
                    title="Leads by Locality"
                  />
                ) : (
                  <div style={{ backgroundColor: "#f8faff", padding: "20px", borderRadius: "8px", textAlign: "center", color: "#9CAFC9", fontSize: "13px" }}>
                    No data available
                  </div>
                )}
              </Box>
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

      {/* Location Modal */}
      <ChartDialogModal
        open={openLocation}
        onClose={() => setOpenLocation(false)}
        locationId={locationId || undefined}
        startDate={startDate || undefined}
        endDate={endDate || undefined}
      />


    </>
  );
}