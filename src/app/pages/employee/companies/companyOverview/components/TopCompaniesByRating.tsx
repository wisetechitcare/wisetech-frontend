import { getAllRatingFactors, getTopCompaniesByAllRatingFactors, getTopCompaniesByRatingFactor } from '@services/companies'
import React, { useEffect, useState } from 'react'
import MaterialTable from '@app/modules/common/components/MaterialTable'
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material'

interface RatingFactor {
  id: string;
  name: string;
  color: string;
  weight: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface CompanyType {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface Company {
  id: string;
  companyName: string;
  companyType: CompanyType;
  projectsCount: number;
  leadsCount: number;
  averageRating: number;
}

function TopCompaniesByRating({startDate, endDate}: {startDate?: string; endDate?: string}) {
    const [allRatingFactors, setAllRatingFactors] = useState<RatingFactor[]>([])
    const [selectedRatingFactor, setSelectedRatingFactor] = useState<string>('overall')
    const [topCompaniesByRating, setTopCompaniesByRating] = useState<Company[]>([])
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        async function fetchAllData() {
            try {
                setLoading(true);
                // Get all rating factors
                const {data: { ratingFactors }} = await getAllRatingFactors(startDate, endDate)
                setAllRatingFactors(ratingFactors)
                
                // Set default to "Overall"
                setSelectedRatingFactor('overall');
                
                // Get companies by overall rating
                const {companyByRating} = await getTopCompaniesByAllRatingFactors(startDate, endDate)
                setTopCompaniesByRating(companyByRating);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchAllData()
    }, [startDate, endDate])

    // Handle factor change
    const handleFactorChange = async (factorId: string) => {
        try {
            setLoading(true);
            
            if (factorId === 'overall') {
                // Get overall ratings
                const { companyByRating } = await getTopCompaniesByAllRatingFactors(startDate, endDate);
                setTopCompaniesByRating(companyByRating);
            } else {
                // Get ratings for specific factor
                const { companyByRating } = await getTopCompaniesByRatingFactor(factorId);
                setTopCompaniesByRating(companyByRating);
            }

            // Update selected factor
            setSelectedRatingFactor(factorId);

        } catch (error) {
            console.error('Error fetching companies by rating factor:', error);
        } finally {
            setLoading(false);
        }
    }

    // Handle dropdown change
    const handleRatingFactorChange = (event: SelectChangeEvent<string>) => {
        const factorId = event.target.value;
        handleFactorChange(factorId);
    };

    // Define table columns
    const columns = [
        {
            accessorKey: 'serialNumber',
            header: 'S.No',
            Cell: ({ row }: { row: any }) => {
                return row.index + 1;
            },
            size: 80,
        },
        {
            accessorKey: 'companyName',
            header: 'Company',
            size: 250,
        },
        {
            accessorKey: 'companyType',
            header: 'Type',
            Cell: ({ cell }: { cell: any }) => {
                const companyType = cell.getValue();
                return companyType ? companyType.name : '';
            },
            size: 150,
        },
        {
            accessorKey: 'projectsCount',
            header: 'Projects',
            size: 120,
        },
        {
            accessorKey: 'leadsCount',
            header: 'Leads',
            size: 120,
        },
        {
            accessorKey: 'averageRating',
            header: 'Rating',
            Cell: ({ cell }: { cell: any }) => {
                const rating = cell.getValue() as number;
                return (
                    <div className="d-flex align-items-center">
                        <span className="me-1">{rating.toFixed(1)}</span>
                        <span className="text-warning fs-4">★</span>
                    </div>
                );
            },
            size: 120,
        },
    ];

    return (
        <div className="card card-flush">
            <div className="card-header border-0 pt-5" >
                <h3 className="card-title align-items-start flex-column">
                    <span className="card-label fw-bold text-dark">Top Companies by Rating</span>
                </h3>
                <div className="card-toolbar">
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                            value={selectedRatingFactor}
                            onChange={handleRatingFactorChange}
                            displayEmpty
                            sx={{
                                height: '31px',
                                '& .MuiSelect-select': {
                                    padding: '9px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    lineHeight: '1',
                                    height: '31px',
                                    boxSizing: 'border-box',
                                },
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
                            <MenuItem value="overall">Overall</MenuItem>
                            {allRatingFactors.map(factor => (
                                <MenuItem key={factor.id} value={factor.id}>
                                    {factor.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </div>
            </div>
            <div className="card-body pt-3" style={{ zIndex: 0, position: 'relative' }}>
                {loading ? (
                    <div className="d-flex justify-content-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <MaterialTable
                        data={topCompaniesByRating}
                        columns={columns}
                        tableName="top-companies-by-rating"
                        hideFilters={true}
                        hideExportCenter={true}
                        enableBottomToolbar={false}
                        muiTablePaperStyle={{ boxShadow: 'none' }}
                    />
                )}
            </div>
        </div>
    )
}

export default TopCompaniesByRating