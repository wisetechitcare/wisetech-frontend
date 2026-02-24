import React, { useState, useMemo } from 'react'
import ApexChart from 'react-apexcharts';
import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography } from '@mui/material';
import { Card } from 'react-bootstrap';
import { CompanyDialogModal } from './CompanyDialogModal';
import dayjs, { Dayjs } from 'dayjs';

type LocationFilterType = {
  country: string;
  state: string;
  city: string;
  locality: string;
  status: string;
  sortBy: string;
};

interface ProjectCompanyMapping {
  project?: {
    cost?: string | number;
  };
}

interface CompanyData {
  id: string; // Added missing id field
  companyName: string;
  country: string;
  state: string;
  city: string;
  area: string;
  status: string;
  projectCompanyMappings: ProjectCompanyMapping[];
}

interface CompanyStatusGroup {
  companyStatus: string;
  companiesWithProjects: CompanyData[];
  totalCost: number;
}

function CompaniesByLocationAndSatatus({ data, startDate, endDate }: { data: CompanyStatusGroup[]; startDate?: Dayjs; endDate?: Dayjs }) {

  const filterData = data?.map(statusGroup => {

    const filteredCompanies = statusGroup.companiesWithProjects.filter((company:any) => {
      const createdAt = dayjs(company.createdAt);
      const dateFilter = (!startDate || !createdAt.isBefore(startDate.startOf('day'))) &&
                        (!endDate || !createdAt.isAfter(endDate.endOf('day')));

     

      return dateFilter;
    });

    return { ...statusGroup, companiesWithProjects: filteredCompanies };
  }).filter(statusGroup => statusGroup.companiesWithProjects.length > 0);

  
  
  const [openLocation, setOpenLocation] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<LocationFilterType>({
    country: 'All',
    state: 'All',
    city: 'All',
    locality: 'All',
    status: 'All',
    sortBy: 'highToLow'
  });

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const countries = new Set<string>(['All']);
    const states = new Set<string>(['All']);
    const cities = new Set<string>(['All']);
    const localities = new Set<string>(['All']);
    const statuses = new Set<string>(['All']);

    filterData?.forEach(statusGroup => {
      statuses.add(statusGroup.companyStatus);
      statusGroup.companiesWithProjects.forEach(company => {

        if (company.country) countries.add(company.country);
        if (company.state) states.add(company.state);
        if (company.city) cities.add(company.city);
        if (company.area) localities.add(company.area);
      });
    });

    const options = {
      countries: [...countries],
      states: [...states],
      cities: [...cities],
      localities: [...localities],
      statuses: [...statuses]
    };

    return options;
  }, [filterData]);

  const handleFilterChange = (event: SelectChangeEvent<string>, filterName: keyof LocationFilterType) => {
    const value = event.target.value;
    if (filterName === 'country') {
      setFilters({ country: value, state: 'All', city: 'All', locality: 'All', status: filters.status, sortBy: filters.sortBy });
    } else if (filterName === 'state') {
      setFilters({ ...filters, state: value, city: 'All', locality: 'All' });
    } else if (filterName === 'city') {
      setFilters({ ...filters, city: value, locality: 'All' });
    } else {
      setFilters({ ...filters, [filterName]: value });
    }
  };

// Apply filters & group data
const processedData = useMemo(() => {
  const filteredCompanies = filterData?.flatMap(statusGroup => {
    if (filters.status !== 'All' && statusGroup.companyStatus !== filters.status) return [];
    return statusGroup.companiesWithProjects.filter(company => {
      if (filters.country !== 'All' && company.country !== filters.country) return false;
      if (filters.state !== 'All' && company.state !== filters.state) return false;
      if (filters.city !== 'All' && company.city !== filters.city) return false;
      if (filters.locality !== 'All' && company.area !== filters.locality) return false;
      return true;
    });
  });

  const uniqueCompanies = Array.from(
    new Map(filteredCompanies.map(company => [company.id, company])).values()
  );

  let groupByKey: keyof CompanyData = 'country';
  if (filters.locality !== 'All') groupByKey = 'area';
  else if (filters.city !== 'All') groupByKey = 'area';
  else if (filters.state !== 'All') groupByKey = 'city';
  else if (filters.country !== 'All') groupByKey = 'state';
  else groupByKey = 'country'; // default grouping by country

  const grouped = uniqueCompanies.reduce((acc, company) => {
    const key = company[groupByKey] || 'Unknown';

    if (!acc[key]) acc[key] = { name: key, totalCost: 0, totalProjects: 0, count: 0 };
  
    acc[key].count++; 
    const mappings = company.projectCompanyMappings || [];
    acc[key].totalProjects += mappings.length; 
    mappings.forEach(mapping => {
      if (mapping.project?.cost) acc[key].totalCost += Number(mapping.project.cost);
    });
    return acc;
  }, {} as Record<string, { name: string; totalCost: number; totalProjects: number; count: number }>);
  

  const result = Object.values(grouped);

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
}, [data, filters]);


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

  // Fixed chartData with companyCounts
  // console.log("processedData", processedData);
  
  const chartData = useMemo(() => {
    return {
      categories: processedData.map(d => d.name),
      seriesData: processedData.map(d => d.totalCost),
      projectCounts: processedData.map(d => d.totalProjects),
      companyCounts: processedData.map(d => d.count) 
    };
  }, [processedData]);

  const chartOptions: any = {
    chart: { 
      type: 'bar', 
      height: 350, 
      toolbar: { show: false },
      events: {
        dataPointSelection: (event: any, chartContext: any, config: any) => {
          const dataPointIndex = config.dataPointIndex;
          const selectedLabel = chartData.categories[dataPointIndex];
          
          if (selectedLabel) {
            handleLocationChartClick(selectedLabel);
          }
        },
      },  
    },
    plotOptions: { bar: { borderRadius: 4, columnWidth: data.length === 1 ? '10%' : '60%', dataLabels: { position: 'top' } } },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => '₹' + val.toLocaleString(),
      offsetY: -20,
      style: { fontSize: '12px', colors: ['#304758'], fontWeight: 'bold' }
    },
    xaxis: { categories: chartData.categories, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { formatter: (val: number) => val.toFixed(0) } },
    colors: ['#008FFB', '#00E396', '#FEB019'],
    grid: { borderColor: '#f1f1f1' },
    annotations: {
      points: chartData.categories.map((cat, idx) => ({
        x: cat,
        y: chartData.seriesData[idx] / 2,
        marker: { size: 0 },
        label: {
          borderColor: 'transparent',
          style: { color: '#fff', background: 'transparent', fontSize: '14px', fontWeight: 'bold', align: 'center' },
          text: chartData.companyCounts[idx] ? String(chartData.companyCounts[idx]) : '' // Now this will work
        }
      }))
    }
  };

  // Map from singular filter name to plural key in filterOptions
  const filterKeyMap: Record<string, keyof typeof filterOptions> = {
    country: 'countries',
    state: 'states',
    city: 'cities',
    locality: 'localities',
    status: 'statuses',
  };

  return (
    <>
    <Card className="shadow-sm h-100 w-100">
      <Card.Body>
        <h2>Companies By Locations</h2>
        {
          processedData.length === 0 ? (
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
          ): (<><Box sx={{
          pt: 2,
          borderRadius: 2,
          backgroundColor: 'background.paper'
        }}>
          {/* Filters */}
          <Box sx={{
            display: 'flex',
            mb: 3,
            gap: 2,
            flexWrap: 'wrap',
            '& .MuiFormControl-root': {
              minWidth: { xs: '100%', sm: '150px', md: '180px' },
            }
          }}>
            {(['country', 'state', 'city', 'locality', 'status'] as (keyof LocationFilterType)[]).map((filterName) => (
              <FormControl key={filterName} size="small">
                <InputLabel
                  sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
                >
                  {filterName[0].toUpperCase() + filterName.slice(1)}
                </InputLabel>
                <Select
                  value={filters[filterName] || 'All'}
                  label={filterName[0].toUpperCase() + filterName.slice(1)}
                  onChange={(e) => handleFilterChange(e, filterName)}
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
                  {filterOptions[filterKeyMap[filterName]]?.map((val: string) => (
                    <MenuItem key={val} value={val}>{val}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            ))}

            <FormControl size="small">
              <InputLabel
                sx={{ color: '#9D4141', '&.Mui-focused': { color: '#9D4141' } }}
              >
                Sort By
              </InputLabel>
              <Select
                value={filters.sortBy}
                label="Sort By"
                onChange={(e) => handleFilterChange(e, 'sortBy')}
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

          {/* Chart */}
          <Box sx={{
            mt: 3,
            height: { xs: 300, sm: 350, md: 400 },
            minHeight: 300
          }}>
            {processedData.length > 0 ? (
              <ApexChart
                options={{
                  ...chartOptions,
                  responsive: [{
                    breakpoint: 600,
                    options: {
                      chart: { height: 300 },
                      dataLabels: { enabled: false }
                    }
                  }]
                }}
                series={[{ name: 'Total Cost', data: chartData.seriesData }]}
                type="bar"
                height="100%"
              />
            ) : (
              <Typography align="center" color="text.secondary" sx={{ p: 4 }}>
                No data available for the selected filters
              </Typography>
            )}
          </Box>
        </Box></>)
        }
        
      </Card.Body>
    </Card>

    <CompanyDialogModal
      open={openLocation}
      onClose={() => setOpenLocation(false)}
      locationId={locationId || undefined}
      startDate={startDate}
      endDate={endDate}
    />
    </>
  );
}

export default CompaniesByLocationAndSatatus;