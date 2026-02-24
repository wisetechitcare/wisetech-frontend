// CompaniesByLocationAndStatus.tsx
import React, { useMemo, useState } from "react";
import ApexChart from "react-apexcharts";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { Card } from "react-bootstrap";
import { ChartDialogModal } from "../components/ChartDialogModal";
import { fetchCountryName, fetchStateName, fetchAllCities } from "@services/options";
import dayjs from "dayjs";


type Filters = {
  country: string;
  state: string;
  city: string;
  locality: string;
  status: string;
};

const UNKNOWN = "Unknown"; // display for null/empty

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

  // Determine grouping level based on filters
  const groupBy = useMemo(() => {
    if (filters.country === "All") return "country";
    if (filters.state === "All") return "state";
    if (filters.city === "All") return "city";
    if (filters.locality === "All") return "locality";
    return "status"; // finest level when all location filters are set
  }, [filters]);

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


  // Group and aggregate data
  const grouped = useMemo(() => {
    const map: Record<string, {
      name: string;
      totalBudget: number;
      totalCount: number;
      color?: string;
    }> = {};

    filteredData.forEach((item) => {
      let key: string;
      let color = item.color;

      switch (groupBy) {
        case "country":
          key = normalize(item.country);
          break;
        case "state":
          key = normalize(item.state);
          break;
        case "city":
          key = normalize(item.city);
          break;
        case "locality":
          key = normalize(item.locality);
          break;
        case "status":
          key = item.status;
          break;
        default:
          key = "Other";
      }

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

    let result = Object.values(map);

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
      // Default sort by budget desc
      result.sort((a, b) => b.totalBudget - a.totalBudget);
    }

    return result;
  }, [filteredData, groupBy, sortOption]);

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

  // Chart data
  const categories = grouped.map((g) => g.name);
  const seriesData = grouped.map((g) => Math.round(g.totalBudget));
  const counts = grouped.map((g) => g.totalCount);

  // Dynamic colors based on status colors when available, otherwise use palette
  const barColors = grouped.map((g, idx) => {
    if (g.color) return g.color;
    const palette = [
      '#5E60CE', '#48BFE3', '#64DFDF', '#80FFDB',
      '#FF7B7B', '#FFB84D', '#FFD93D', '#90BE6D'
    ];
    return palette[idx % palette.length];
  });

  const chartOptions: any = {
    chart: {
      type: "bar",
      height: 350,
      toolbar: { show: false },
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const dataPointIndex = config.dataPointIndex;
          const selectedLabel = categories[dataPointIndex]; // Use categories array instead

          // console.log("selectedLabelINChart", selectedLabel);
          // console.log("dataPointIndex", dataPointIndex);

          if (selectedLabel) {
            handleLocationChartClick(selectedLabel); // Use your existing function
          }
        },
      },
    },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: data.length === 1 ? '10%' : '80%',
        dataLabels: { position: "top" }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => "₹" + val.toLocaleString(),
      offsetY: -20,
      style: { fontSize: "12px", colors: ["#000"] },
    },
    colors: barColors,
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: -45,
        maxHeight: 120,
      }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => "₹" + val.toLocaleString()
      }
    },
    grid: { borderColor: "#f1f1f1" },
    tooltip: {
      custom: function({ series, seriesIndex, dataPointIndex, w }: any) {
        const category = categories[dataPointIndex];
        const budget = seriesData[dataPointIndex];
        const count = counts[dataPointIndex];

        return `
          <div style="padding: 10px;">
            <strong>${category}</strong><br/>
            <span>Budget: ₹${budget.toLocaleString()}</span><br/>
            <span>Count: ${count} lead${count > 1 ? 's' : ''}</span>
          </div>
        `;
      }
    }
  };

  const getChartTitle = () => {
    const level = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);
    return `Leads by ${level}`;
  };

  return (
    <>
      <Card className="shadow-sm h-100 w-100">
        <Card.Body>
          <div style={{ marginBottom: 12 }}>
            <h2>{getChartTitle()}</h2>
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
                <InputLabel id="status-label" sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}>Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={filters.status}
                  label="Status"
                  onChange={handleChange("status")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-select': {
                      color: '#9D4141',
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
                <InputLabel id="country-label" sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}>Country</InputLabel>
                <Select
                  labelId="country-label"
                  value={filters.country}
                  label="Country"
                  onChange={handleChange("country")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-select': {
                      color: '#9D4141',
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
                <InputLabel id="state-label" sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}>State</InputLabel>
                <Select
                  labelId="state-label"
                  value={filters.state}
                  label="State"
                  onChange={handleChange("state")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-select': {
                      color: '#9D4141',
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
                <InputLabel id="city-label" sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}>City</InputLabel>
                <Select
                  labelId="city-label"
                  value={filters.city}
                  label="City"
                  onChange={handleChange("city")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-select': {
                      color: '#9D4141',
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
                <InputLabel id="locality-label" sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}>Locality</InputLabel>
                <Select
                  labelId="locality-label"
                  value={filters.locality}
                  label="Locality"
                  onChange={handleChange("locality")}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-select': {
                      color: '#9D4141',
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
                <InputLabel id="sort-label" sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}>Sort By</InputLabel>
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
                      borderColor: '#9D4141',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9D4141',
                    },
                    '& .MuiSelect-select': {
                      color: '#9D4141',
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

            <Box sx={{ mt: 3, }}>
              {grouped.length > 0 ? (
                <ApexChart
                  options={chartOptions}
                  series={[{ name: "Total Budget", data: seriesData }]}
                  type="bar"
                  height={380}
                />
              ) : (

                <div style={{ backgroundColor: "#f8faff", margin: 0, border: "2px solid #EAEEF5" }} className="rounded-2 m-6">
                  <div

                    style={{
                      height: "270px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center",
                      gap: "10px",
                      color: "#6c757d",
                    }}
                  >
                    <div>
                      <i className="bi bi-info-circle" style={{ fontSize: "24px", color: "#9CAFC9" }}></i>
                    </div>

                    <div
                      style={{
                        fontFamily: "Barlow",
                        fontWeight: 500,
                        fontStyle: "normal",
                        fontSize: "13px",
                        textAlign: "center",
                        color: "#9CAFC9"
                      }}>
                      Nothing to see here yet, <br /> add data to view
                    </div>
                  </div>
                </div>
              )}
            </Box>
            {
              grouped.length > 0 ? (<Box sx={{ mt: 2, display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Leads:</strong> {filteredData.reduce((sum, item) => sum + item.count, 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Budget:</strong> ₹{filteredData.reduce((sum, item) => sum + item.budget, 0).toLocaleString()}
                </Typography>
          </Box>):(<></>)
            }

            {/* Summary Stats */}

          </Box>
        </Card.Body>
      </Card>

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