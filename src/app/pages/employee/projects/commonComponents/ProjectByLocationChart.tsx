import React, { useMemo, useState } from "react";
import ApexChart from "react-apexcharts";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { Card } from "react-bootstrap";
import { ProjectDialogModal } from "../overview/components/ProjectDialogModal";
import dayjs, { Dayjs } from "dayjs";
 
type Filters = {
  country: string;
  state: string;
  city: string;
  locality: string;
  status: string;
  sortBy: string;
};
 
const UNKNOWN = "Unknown"; 
 
interface ApiProject {
  id?: string;
  title?: string | null;
  cost?: string | number | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  locality?: string | null;
}
 
interface ApiStatusGroup {
  id: string;
  name: string; 
  projects: ApiProject[];
}
 
const normalize = (v?: string | null) => {
  if (v === null || v === undefined) return UNKNOWN;
  const s = String(v).trim();
  if (s === "") return UNKNOWN;
  return s;
};
 
const uniqueSorted = (arr: string[]) =>
  Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
 
export default function ProjectByLocationAndStatus({
  data,
  startDate,
  endDate,
}: {
  data: ApiStatusGroup[];
  startDate?: Dayjs;
  endDate?: Dayjs;
}) {
  // default filters
  
  const [openLocation, setOpenLocation] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    country: "All",
    state: "All",
    city: "All",
    locality: "All",
    status: "All",
    sortBy: "highToLow",
  });
 
  // flatten projects and attach statusName so we can filter easily
  const allProjects = useMemo(() => {
    return data.flatMap((sg) =>
      sg.projects.map((p) => ({ ...p, _statusName: sg.name }))
    ) as (ApiProject & { _statusName: string })[];
  }, [data]);
 
  // projects for the currently selected status (or all if 'All')
  const projectsForStatus = useMemo(() => {
    return filters.status === "All"
      ? allProjects
      : allProjects.filter((p) => p._statusName === filters.status);
  }, [allProjects, filters.status]);
 
  // dynamic cascade options: countries -> states -> cities -> localities
  const countryOptions = useMemo(
    () => [
      "All",
      ...uniqueSorted(projectsForStatus.flatMap((p:any) => 
        p.addresses?.map((addr:any) => normalize(addr.country)) || []
      )),
    ],
    [projectsForStatus]
  );
 
  const stateOptions = useMemo(() => {
    const base = projectsForStatus.flatMap((p:any) => 
      p.addresses?.filter((addr:any) => 
        filters.country === "All" || normalize(addr.country) === filters.country
      ) || []
    );
    return ["All", ...uniqueSorted(base.map((addr:any) => normalize(addr.state)))];
  }, [projectsForStatus, filters.country]);
 
  const cityOptions = useMemo(() => {
    const base = projectsForStatus.flatMap((p:any) => 
      p.addresses?.filter((addr:any) => 
        (filters.country === "All" || normalize(addr.country) === filters.country) &&
        (filters.state === "All" || normalize(addr.state) === filters.state)
      ) || []
    );
    return ["All", ...uniqueSorted(base.map((addr:any) => normalize(addr.city)))];
  }, [projectsForStatus, filters.country, filters.state]);
 
  const localityOptions = useMemo(() => {
    const base = projectsForStatus.flatMap((p:any) => 
      p.addresses?.filter((addr:any) => 
        (filters.country === "All" || normalize(addr.country) === filters.country) &&
        (filters.state === "All" || normalize(addr.state) === filters.state) &&
        (filters.city === "All" || normalize(addr.city) === filters.city)
      ) || []
    );
    return ["All", ...uniqueSorted(base.map((addr:any) => normalize(addr.locality)))];
  }, [projectsForStatus, filters.country, filters.state, filters.city]);
 
  const statusOptions = useMemo(
    () => ["All", ...uniqueSorted(data.map((sg) => sg.name))],
    [data]
  );
 
  // change handlers — cascade resets for deeper levels
  const handleChange =
    (key: keyof Filters) => (e: SelectChangeEvent<string>) => {
      const val = e.target.value;
      if (key === "country") {
        setFilters((prev) => ({
          ...prev,
          country: val,
          state: "All",
          city: "All",
          locality: "All",
        }));
        return;
      }
      if (key === "state") {
        setFilters((prev) => ({
          ...prev,
          state: val,
          city: "All",
          locality: "All",
        }));
        return;
      }
      if (key === "city") {
        setFilters((prev) => ({ ...prev, city: val, locality: "All" }));
        return;
      }
      if (key === "status") {
        // when switching status, reset the location filters to avoid stale invalid values
        setFilters({
          country: "All",
          state: "All",
          city: "All",
          locality: "All",
          status: val,
          sortBy: filters.sortBy, // Preserve sortBy setting
        });
        return;
      }
      if (key === "sortBy") {
        setFilters((prev) => ({ ...prev, sortBy: val }));
        return;
      }
      // locality
      setFilters((prev) => ({ ...prev, locality: val }));
    };
 
  // Filter projects according to all selected filters
  const filteredProjects = useMemo(() => {
    return allProjects.filter((p:any) => {
      const createdAt = p.createdAt ? dayjs(p.createdAt) : null;
      if (startDate && createdAt && createdAt.isBefore(startDate.startOf("day"))) {
        return false;
      }
      if (endDate && createdAt && createdAt.isAfter(endDate.endOf("day"))) {
        return false;
      }
  
      // Check if project matches status filter
      const statusMatch = filters.status === "All" || p._statusName === filters.status;
      
      // Check if project has any address that matches the location filters
      const addressMatch = !p.addresses || p.addresses.length === 0 ? 
        // If no addresses, only match if all location filters are "All"
        filters.country === "All" && filters.state === "All" && 
        filters.city === "All" && filters.locality === "All" :
        // If has addresses, check if any address matches all location filters
        p.addresses.some((addr:any) => (
          (filters.country === "All" || normalize(addr.country) === filters.country) &&
          (filters.state === "All" || normalize(addr.state) === filters.state) &&
          (filters.city === "All" || normalize(addr.city) === filters.city) &&
          (filters.locality === "All" || normalize(addr.locality) === filters.locality)
        ));
      
      return statusMatch && addressMatch;
    });
  }, [allProjects, filters, startDate, endDate]);

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
 
  // grouping decision:
  // - if country === 'All' -> group by country
  // - else if state === 'All' -> group by state (within selected country)
  // - else if city === 'All' -> group by city
  // - else if locality === 'All' -> group by locality
  // - else -> group by project title (lowest level)
  const groupBy = useMemo(() => {
    if (filters.country === "All") return "country";
    if (filters.state === "All") return "state";
    if (filters.city === "All") return "city";
    if (filters.locality === "All") return "locality";
    return "title";
  }, [filters]);
 
  // Helper function to calculate project total cost from projectCommercialMappings
  const calculateProjectCost = (project: any) => {
    if (!project.projectCommercialMappings || project.projectCommercialMappings.length === 0) {
      return Number(project.cost ?? 0) || 0;
    }
    
    
    return project.projectCommercialMappings.reduce((total: number, mapping: any) => {
      // Add rateCost if it exists
      const rateCost = Number(mapping.rateCost ?? 0) || 0;
      
      // Add lumpsumCost if it exists
      const lumpsumCost = Number(mapping.lumpsumCost ?? 0) || 0;
      
      // Total for this mapping is rateCost + lumpsumCost
      const mappingTotal = rateCost + lumpsumCost;
      
      
      return total + mappingTotal;
    }, 0);
  };

  // aggregate totals by group
  const grouped = useMemo(() => {
    const map: Record<
      string,
      { name: string; totalCost: number; totalProjects: number; projectIds: Set<string> }
    > = {};
    
    filteredProjects.forEach((p:any) => {
      const projectCost = calculateProjectCost(p);
      const projectId = p.id || `unknown-${Math.random()}`;
      
      if (groupBy === "title") {
        // Group by project title
        const key = (p.title && String(p.title).trim()) || "Untitled";
        if (!map[key]) map[key] = { name: key, totalCost: 0, totalProjects: 0, projectIds: new Set() };
        if (!map[key].projectIds.has(projectId)) {
          map[key].projectIds.add(projectId);
          map[key].totalProjects++;
          map[key].totalCost += projectCost;
        }
      } else {
        // Group by location field (country, state, city, locality)
        if (p.addresses && p.addresses.length > 0) {
          // Filter addresses that match the current location filters
          const relevantAddresses = p.addresses.filter((addr:any) => {
            return (
              (filters.country === "All" || normalize(addr.country) === filters.country) &&
              (filters.state === "All" || normalize(addr.state) === filters.state) &&
              (filters.city === "All" || normalize(addr.city) === filters.city) &&
              (filters.locality === "All" || normalize(addr.locality) === filters.locality)
            );
          });
          
          // Get unique values for the groupBy field from relevant addresses
          const uniqueLocations = new Set();
          relevantAddresses.forEach((addr:any) => {
            uniqueLocations.add(normalize(addr[groupBy]));
          });
          
          if (uniqueLocations.size > 0) {
            // Split project cost equally among unique locations at this grouping level
            const costPerLocation = projectCost / uniqueLocations.size;
            
            uniqueLocations.forEach((location: any) => {
              if (!map[location]) map[location] = { name: location, totalCost: 0, totalProjects: 0, projectIds: new Set() };
              
              // Add cost for this location
              map[location].totalCost += costPerLocation;
              
              // Count project only once per location
              if (!map[location].projectIds.has(projectId)) {
                map[location].projectIds.add(projectId);
                map[location].totalProjects++;
              }
            });
          }
        } else {
          // No addresses - group under "Unknown" only if no location filters are applied
          if (filters.country === "All" && filters.state === "All" && 
              filters.city === "All" && filters.locality === "All") {
            const key = UNKNOWN;
            if (!map[key]) map[key] = { name: key, totalCost: 0, totalProjects: 0, projectIds: new Set() };
            if (!map[key].projectIds.has(projectId)) {
              map[key].projectIds.add(projectId);
              map[key].totalProjects++;
              map[key].totalCost += projectCost;
            }
          }
        }
      }
    });
    
    // convert to array and apply sorting based on sortBy filter
    const result = Object.values(map).map(({ name, totalCost, totalProjects }) => ({
      name,
      totalCost,
      totalProjects
    }));

    // Apply sorting based on sortBy filter
    switch (filters.sortBy) {
      case "aToZ":
        return result.sort((a, b) => a.name.localeCompare(b.name));
      case "zToA":
        return result.sort((a, b) => b.name.localeCompare(a.name));
      case "lowToHigh":
        return result.sort((a, b) => a.totalCost - b.totalCost);
      case "highToLow":
      default:
        return result.sort((a, b) => b.totalCost - a.totalCost);
    }
  }, [filteredProjects, groupBy, filters]);
 
  const categories = grouped.map((g) => g.name);
  const seriesData = grouped.map((g) => Math.round(g.totalCost));
  const projectCounts = grouped.map((g) => g.totalProjects);
 
  const barColors = categories.map((_, idx) => {
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
          
          
          if (selectedLabel) {
            handleLocationChartClick(selectedLabel); // Use your existing function
          }
        },
      }, 
    },
    plotOptions: { bar: { borderRadius: 6, columnWidth: data.length === 1 ? '10%' : '80%', dataLabels: { position: "top" } } },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => "₹" + val.toLocaleString(),
      offsetY: -30,
      style: { fontSize: "16px", colors: ["#000"] },
    },
    colors: barColors,
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { formatter: (val: number) => val.toFixed(0) } },
    grid: { borderColor: "#f1f1f1" },
    annotations: {
      points: categories.map((cat, idx) => ({
        x: cat,
        y: seriesData[idx] / 2,
        marker: { size: 0 },
        label: {
          borderColor: "transparent",
          style: {
            color: "#fff",
            background: "transparent",
            fontSize: "13px",
            fontWeight: "bold"
          },
          text: `${projectCounts[idx]} project${projectCounts[idx] > 1 ? "s" : ""}`,
        },
      })),
    },    
   
      points: categories.map((cat, idx) => ({
        x: cat,
        y: seriesData[idx],
        marker: { size: 0 },
        label: {
          borderColor: "transparent",
          style: { color: "#555", background: "transparent", fontSize: "12px" },
          text: `${projectCounts[idx]} proj${
            projectCounts[idx] > 1 ? "s" : ""
          }`,
        },
      })),
   
  };
 
  return (
    <>
    <Card className="shadow-sm h-100 w-100">
      <Card.Body>
        <h2 style={{ marginBottom: 12 }}>Projects By Locations</h2>
        <Box sx={{  borderRadius: 2 }}>
          <Box sx={{ display: "flex", mb: 3, gap: 2, flexWrap: "wrap" }}>
            <FormControl sx={{ minWidth: 160 }} size="small">
              <InputLabel
                id="status-label"
                sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
              >
                Status
              </InputLabel>
              <Select
                labelId="status-label"
                value={filters.status}
                label="Status"
                onChange={handleChange("status")}
                sx={{
                  color: '#9D4141',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '& .MuiSelect-icon': {
                    color: '#9D4141',
                  },
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
              <InputLabel
                id="country-label"
                sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
              >
                Country
              </InputLabel>
              <Select
                labelId="country-label"
                value={filters.country}
                label="Country"
                onChange={handleChange("country")}
                sx={{
                  color: '#9D4141',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '& .MuiSelect-icon': {
                    color: '#9D4141',
                  },
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
              <InputLabel
                id="state-label"
                sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
              >
                State
              </InputLabel>
              <Select
                labelId="state-label"
                value={filters.state}
                label="State"
                onChange={handleChange("state")}
                sx={{
                  color: '#9D4141',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '& .MuiSelect-icon': {
                    color: '#9D4141',
                  },
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
              <InputLabel
                id="city-label"
                sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
              >
                City
              </InputLabel>
              <Select
                labelId="city-label"
                value={filters.city}
                label="City"
                onChange={handleChange("city")}
                sx={{
                  color: '#9D4141',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '& .MuiSelect-icon': {
                    color: '#9D4141',
                  },
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
              <InputLabel
                id="locality-label"
                sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
              >
                Locality
              </InputLabel>
              <Select
                labelId="locality-label"
                value={filters.locality}
                label="Locality"
                onChange={handleChange("locality")}
                sx={{
                  color: '#9D4141',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '& .MuiSelect-icon': {
                    color: '#9D4141',
                  },
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
              <InputLabel
                id="sort-label"
                sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
              >
                Sort By
              </InputLabel>
              <Select
                labelId="sort-label"
                value={filters.sortBy}
                label="Sort By"
                onChange={handleChange("sortBy")}
                sx={{
                  color: '#9D4141',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#9D4141',
                  },
                  '& .MuiSelect-icon': {
                    color: '#9D4141',
                  },
                }}
              >
                <MenuItem value="aToZ">A to Z</MenuItem>
                <MenuItem value="zToA">Z to A</MenuItem>
                <MenuItem value="highToLow">High to Low (Cost)</MenuItem>
                <MenuItem value="lowToHigh">Low to High (Cost)</MenuItem>
              </Select>
            </FormControl>
          </Box>
 
          <Box sx={{ mt: 3, }}>
            {grouped.length === 0 ?   (
               <div style={{ backgroundColor: "#f8faff", margin: 0, border: "2px solid #EAEEF5" }} className="rounded-2 m-6">
              <div

                style={{
                  height: "270px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  gap: "12px",
                  color: "#6c757d",
                }}
              >
                <div>
                  <i className="bi bi-geo-alt" style={{ fontSize: "32px", color: "#9CAFC9" }}></i>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div
                    style={{
                      fontFamily: "Barlow",
                      fontWeight: 600,
                      fontSize: "14px",
                      textAlign: "center",
                      color: "#6B7280"
                    }}>
                    No data available
                  </div>
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontWeight: 400,
                      fontSize: "12px",
                      textAlign: "center",
                      color: "#9CAFC9"
                    }}>
                    Add project locations to see geographic distribution
                  </div>
                </div>
              </div>
            </div>
            ):(
              <ApexChart
                options={chartOptions}
                series={[{ name: "Total Cost", data: seriesData }]}
                type="bar"
                height={380}
              />
            )}
          </Box>
        </Box>
      </Card.Body>
    </Card>

    {/* Location Modal */}
    <ProjectDialogModal
      open={openLocation}
      onClose={() => setOpenLocation(false)}
      locationId={locationId || undefined}
    />

    </>
  );
}