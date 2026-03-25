import { Button } from '@mui/material'
import React, { useEffect, useState } from 'react'
import TeamForm from './component/TeamForm'
import { getAllTeams, getAllTeamsMember } from '@services/projects'
import axios from 'axios'
import { LEAD_PROJECT_COMPANY } from '@constants/api-endpoint'
import { get, set } from 'lodash'

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// Types for team data
interface TeamMember {
    id: number | string
    name?: string
    role: 'TEAM_LEADER' | 'MEMBER'
    experienceLevel: string
    profile: string
    department: string
    avatar: string
    employeeLevelId?: string
    employee?: {
        users?: {
            firstName: string
            lastName: string
            email?: string
        }
        departments?: {
            id?: string
            name: string
            code?: string
            description?: string
            isActive?: boolean
            companyId?: string
            createdAt?: string
            color?: string | null
        }
        designations?: {
            id?: string
            role: string
            isActive?: boolean
            createdAt?: string
            companyId?: string
        }
        roles?: Array<{
            id?: string
            name?: string
            isActive?: boolean
            createdAt?: string
        }>
    }
    employeeLevel?: {
        id: string
        name: string
        order?: number
        isActive?: boolean
        createdAt?: string
        updatedAt?: string
    }
    level?: string
}



interface Team {
    id: string
    name: string
    color: string
    members: TeamMember[]
    isMyTeam?: boolean
}

// TeamCard Component
const TeamCard: React.FC<{ team: Team; onEditTeam: (team: Team) => void }> = ({ team, onEditTeam }) => {


    return (
        <div className="card shadow-sm" style={{ border: '1px solid #c1c9d6', borderRadius: '12px' }}>
            <div className="card-body p-4">
                {/* Team Header with Edit Button */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex align-items-center gap-3">
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                            style={{
                                // backgroundColor: team.color,
                                width: '52px',
                                height: '52px',
                                padding: '10px',
                                fontSize: '18px',
                                color: "black"
                            }}
                        >
                            {team.name
                                ? team.name
                                    .split(" ")
                                    .map((word) => word[0])
                                    .join("")
                                    .toUpperCase()
                                : "T"}
                        </div>
                        <h5
                            className="mb-0 text-black"
                            style={{
                                fontFamily: 'Barlow',
                                fontSize: '16px',
                                fontWeight: '600',
                                letterSpacing: '0.16px'
                            }}
                        >
                            {team.name}
                        </h5>
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => onEditTeam(team)}
                        style={{
                            borderColor: '#9d4141',
                            color: '#9d4141',
                            fontFamily: 'Inter',
                            fontSize: '14px',
                            fontWeight: '500',
                            borderRadius: '6px',
                            border: '1px solid #9d4141',
                            padding: '8px 18px',
                        }}
                    >
                        Edit Team
                    </button>
                </div>

                {/* Responsive Table Wrapper */}
                <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="table table-borderless mb-0" style={{ minWidth: '800px' }}>
                        <thead>
                            <tr style={{
                                fontFamily: 'Inter',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#7a8597'
                            }}>
                                <th scope="col" style={{ width: '64px', border: 'none', padding: '0 12px 12px 0' }}>S.No</th>
                                <th scope="col" style={{ minWidth: '200px', border: 'none', padding: '0 12px 12px 0' }}>Name</th>
                                <th scope="col" style={{ width: '160px', border: 'none', padding: '0 12px 12px 0' }}>Team Role</th>
                                <th scope="col" style={{ width: '120px', border: 'none', padding: '0 12px 12px 0' }}>Level</th>
                                <th scope="col" style={{ width: '150px', border: 'none', padding: '0 12px 12px 0' }}>Role</th>
                                <th scope="col" style={{ width: '173px', border: 'none', padding: '0 12px 12px 0' }}>Department</th>
                            </tr>
                        </thead>
                        <tbody style={{ gap: '6px' }}>
                            {Array.isArray(team?.members) && team.members.length > 0 ? (
                                team.members.map((member, index) => (
                                    <tr key={member.id} style={{ height: '38px' }}>
                                        <td
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '400',
                                                color: '#202020',
                                                border: 'none',
                                                padding: '3px 12px 3px 0',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            {index + 1}.
                                        </td>

                                        <td
                                            style={{
                                                border: 'none',
                                                padding: '3px 12px 3px 0',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <div className="d-flex align-items-center" style={{ gap: '12px' }}>
                                                <div
                                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                                    style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        backgroundColor: '#9d4141',
                                                        color: 'white',
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {(member?.employee?.users?.firstName || 'U')
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </div>
                                                <span
                                                    className="text-truncate"
                                                    style={{
                                                        fontFamily: 'Inter',
                                                        fontSize: '14px',
                                                        fontWeight: '400',
                                                        color: '#202020',
                                                    }}
                                                >
                                                    {member?.employee?.users?.firstName}{' '}
                                                    {member?.employee?.users?.lastName}
                                                </span>
                                            </div>
                                        </td>

                                        <td
                                            style={{
                                                border: 'none',
                                                padding: '3px 12px 3px 0',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <span
                                                className="badge rounded-pill d-inline-flex align-items-center justify-content-center"
                                                style={{
                                                    backgroundColor:
                                                        member.role === 'TEAM_LEADER' ? '#ffe0ba' : '#e4e6f4',
                                                    color: member.role === 'TEAM_LEADER' ? '#b86e13' : '#6067cf',
                                                    fontFamily: 'Inter',
                                                    fontSize: '14px',
                                                    fontWeight: '400',
                                                    width: '120px',
                                                    height: '25px',
                                                }}
                                            >
                                                {member.role === 'TEAM_LEADER' ? 'Team Leader' : 'Member'}
                                            </span>
                                        </td>

                                        <td
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '400',
                                                color: '#202020',
                                                border: 'none',
                                                padding: '3px 12px 3px 0',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            {member?.employeeLevel?.name || '-'}
                                        </td>

                                        <td
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '400',
                                                color: '#202020',
                                                border: 'none',
                                                padding: '3px 12px 3px 0',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            {member?.employee?.designations?.role || '-'}
                                        </td>

                                        <td
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '400',
                                                color: '#202020',
                                                border: 'none',
                                                padding: '3px 0',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            {member?.employee?.departments?.name || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={6}
                                        style={{
                                            textAlign: 'center',
                                            padding: '12px',
                                            fontFamily: 'Inter',
                                            fontSize: '14px',
                                            color: '#888',
                                        }}
                                    >
                                        No members found
                                    </td>
                                </tr>
                            )}
                        </tbody>

                    </table>
                </div>
            </div>
        </div>
    )
}

const TasksMainCalenderPage = () => {
    const [teams, setTeams] = useState<Team[]>([])
    const [showTeamForm, setShowTeamForm] = useState(false)
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage] = useState(5)
    const [searchTerm, setSearchTerm] = useState('')
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    })

    const handleAddTeam = () => {
        setSelectedTeam(null)
        setShowTeamForm(true)
    }

    const handleEditTeam = (team: Team) => {
        setSelectedTeam(team)
        setShowTeamForm(true)
    }

    const getAllTeamsData = async (page: number = 1, limit: number = 5) => {
        try {
            console.log("=== FETCHING TEAMS DATA ===")
            console.log(`Fetching page ${page} with limit ${limit}`)

            // Fetch teams with pagination and team members separately
            const [teamsResponse, membersResponse] = await Promise.all([
                getAllTeams(page, limit),
                getAllTeamsMember()
            ]);

            console.log("Teams API response:", teamsResponse.data);
            console.log("Members API response:", membersResponse.data);

            const teams = teamsResponse.data?.teams || [];
            const paginationData = teamsResponse.data?.pagination || {
                total: 0,
                totalPages: 0,
                page: 1,
                limit: 5,
                hasNextPage: false,
                hasPrevPage: false
            };
            const allMembers = membersResponse.data?.teamMembers || [];

            console.log("Pagination data:", paginationData);
            console.log("Raw teams from API:", teams.length);
            console.log("Raw members from API:", allMembers.length);
            console.log("Sample member structure:", allMembers[0]);

            // Update pagination state
            setPagination({
                total: paginationData.total,
                totalPages: paginationData.totalPages,
                hasNextPage: paginationData.hasNextPage,
                hasPrevPage: paginationData.hasPrevPage
            });

            // Debug: Log each member to understand structure
            allMembers.forEach((member: any, index: number) => {
                if (index < 3) { // Only log first 3 to avoid spam
                    console.log(`Member ${index}:`, {
                        id: member.id,
                        teamId: member.teamId,
                        team_id: member.team_id,
                        employee: member.employee,
                        structure: Object.keys(member)
                    });
                }
            });

            // Group members by team ID (try multiple possible field names)
            const membersByTeam = new Map();
            allMembers.forEach((member: any) => {
                // Try different possible field names for team ID
                let teamId = member.teamId || member.team_id || member.teamID || member.Team_ID;

                // Also check if it's nested in team object
                if (!teamId && member.team) {
                    teamId = member.team.id || member.team.ID;
                }

                console.log(`Processing member ${member.id} with teamId: ${teamId} (full member:`, member, `)`);

                if (teamId) {
                    // Convert teamId to string to ensure consistent comparison
                    const teamIdStr = String(teamId);
                    if (!membersByTeam.has(teamIdStr)) {
                        membersByTeam.set(teamIdStr, []);
                    }
                    membersByTeam.get(teamIdStr).push(member);
                } else {
                    console.warn('Member missing team ID:', member);
                }
            });

            console.log("Members grouped by team:", Object.fromEntries(membersByTeam));

            // Combine teams with their members
            const teamsWithMembers = teams.map((team: any) => {
                // Convert team ID to string for consistent comparison
                const teamIdStr = String(team.id);
                const teamMembers = membersByTeam.get(teamIdStr) || [];

                console.log(`=== TEAM MEMBER MAPPING ===`);
                console.log(`Team: ${team.name} (ID: ${teamIdStr})`);
                console.log(`Available team IDs in members:`, Array.from(membersByTeam.keys()));
                console.log(`Found ${teamMembers.length} members for this team:`, teamMembers);

                return {
                    ...team,
                    members: teamMembers
                };
            });

            console.log("=== FINAL TEAMS WITH MEMBERS ===");
            teamsWithMembers.forEach((team: any) => {
                console.log(`${team.name}: ${team.members.length} members`, team.members);
            });

            console.log("Calling setTeams with:", teamsWithMembers);
            setTeams(teamsWithMembers);
            console.log("Teams state updated with", teamsWithMembers.length, "teams")
        } catch (error) {
            console.log("Error fetching teams data:", error);
        }
    }
    useEffect(() => {
        getAllTeamsData(currentPage, itemsPerPage);
    }, [currentPage, itemsPerPage]);
    // useEffect(() =>{ 

    //     getAllTeams().then((data) => {

    //         console.log("teams from api", data)
    //         // setTeams(teamsFromApi)
    //     })

    // }, [])







    const handleSaveTeam = (teamData: Partial<Team>) => {
        console.log("=== HANDLE SAVE TEAM ===")
        console.log("Received teamData:", teamData)
        console.log("Team ID:", teamData.id)
        console.log("Team name:", teamData.name)
        console.log("Team members count:", teamData.members?.length || 0)
        console.log("Team members data:", teamData.members)

        // For both create and update, the TeamForm already called the respective APIs
        // Just refresh the teams list to get the latest data from server
        console.log("Refreshing teams data from server...")
        getAllTeamsData(currentPage, itemsPerPage).then(() => {
            console.log("=== TEAMS DATA REFRESH COMPLETE ===")

            // Add a small delay to ensure state is updated, then log final state
            setTimeout(() => {
                console.log("=== FINAL STATE CHECK ===")
                console.log("Total teams in state:", teams.length)
                teams.forEach((team: any, index: number) => {
                    console.log(`State[${index}] ${team.name}: ${team.members?.length || 0} members`, team.members);
                });
            }, 100);

            setShowTeamForm(false)
            setSelectedTeam(null)
        }).catch(error => {
            console.error("Error refreshing teams data:", error)
        })
    }

    const handleDeleteTeam = (teamId: string) => {
        getAllTeamsData(currentPage, itemsPerPage).then(() => {
            setShowTeamForm(false)
            setSelectedTeam(null)
        }).catch(error => {
            console.error("Error refreshing teams data after deletion:", error)
        })
    }

    // Filter teams based on search term (client-side filtering for now)
    const filteredTeams = teams.filter(team => {
        // If no search term, show all teams
        if (!searchTerm || !searchTerm.trim()) {
            return true;
        }

        const searchLower = searchTerm.toLowerCase().trim();
        const teamName = (team.name || '').toLowerCase();

        // Only search in team name
        return teamName.includes(searchLower);
    });

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const handlePrevious = () => {
        if (pagination.hasPrevPage) {
            setCurrentPage(prev => prev - 1)
        }
    }

    const handleNext = () => {
        if (pagination.hasNextPage) {
            setCurrentPage(prev => prev + 1)
        }
    }

    const handleSearch = (value: string) => {
        setSearchTerm(value)
    }

    const clearSearch = () => {
        setSearchTerm('')
    }

    return (
        <div className="container-fluid p-3 p-sm-4" style={{ backgroundColor: '#f7f9fc', minHeight: '100vh' }}>
            {/* Header */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                <div className="flex-grow-1">
                    <h1
                        className="mb-2"
                        style={{
                            fontFamily: "Barlow",
                            fontSize: "22px",
                            fontWeight: 600,
                            color: "black",
                            letterSpacing: "0.22px"
                        }}
                    >
                        Teams
                    </h1>
                    {/* <p
                        className="mb-0"
                        style={{
                            fontFamily: "Inter",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "#8998AB",
                        }}
                    >
                        lorem ispum shs aj dks dk
                    </p> */}
                </div>

                <div className="d-flex gap-3 align-items-center">
                    {/* Search Bar */}
                    <div className="position-relative">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search teams by name..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #c1c9d6',
                                borderRadius: '6px',
                                padding: '8px 16px 8px 40px',
                                fontFamily: 'Inter',
                                fontSize: '14px',
                                fontWeight: '400',
                                minWidth: '280px'
                            }}
                        />
                        <svg
                            className="position-absolute"
                            style={{
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#8998ab'
                            }}
                            width="16"
                            height="16"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                        {searchTerm && (
                            <button
                                type="button"
                                className="btn btn-sm position-absolute"
                                style={{
                                    right: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    padding: '0',
                                    border: 'none',
                                    background: 'none',
                                    color: '#8998ab'
                                }}
                                onClick={clearSearch}
                            >
                                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        className="btn flex-shrink-0"
                        onClick={handleAddTeam}
                        style={{
                            backgroundColor: "#9D4141",
                            borderColor: "#9D4141",
                            fontFamily: "Inter",
                            fontSize: "14px",
                            fontWeight: 500,
                            borderRadius: "6px",
                            padding: "8px 16px",
                            whiteSpace: "nowrap",
                            color: 'white'
                        }}
                    >
                        + Add Team
                    </button>
                </div>
            </div>

            {/* Teams List */}
            <div className="row">
                <div className="col-12">
                    <div className="d-flex flex-column" style={{ gap: '12px' }}>


                        {filteredTeams.length > 0 ? (
                            filteredTeams.map((team) => {
                                // console.log(`=== PASSING TO TEAMCARD: ${team.name} ===`);
                                // console.log("Team object:", team);
                                // console.log("Members array:", team.members);
                                // console.log("Members count:", team.members?.length || 0);
                                return <TeamCard key={team.id} team={team} onEditTeam={handleEditTeam} />;
                            })
                        ) : (
                            <div className="text-center py-5">
                                <p style={{
                                    fontFamily: 'Inter',
                                    fontSize: '16px',
                                    color: '#8998AB'
                                }}>
                                    {searchTerm ?
                                        `No teams found matching "${searchTerm}".` :
                                        'No teams found.'
                                    }
                                </p>
                                {searchTerm && (
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        onClick={clearSearch}
                                        style={{
                                            color: '#9d4141',
                                            textDecoration: 'none',
                                            fontFamily: 'Inter',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination Controls */}
            {!searchTerm && pagination.totalPages > 1 && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                            {/* Pagination Info */}
                            <div style={{
                                fontFamily: 'Inter',
                                fontSize: '14px',
                                color: '#8998AB'
                            }}>
                                Showing page {currentPage} of {pagination.totalPages} ({pagination.total} total teams)
                            </div>

                            {/* Pagination Navigation */}
                            <nav aria-label="Teams pagination">
                                <ul className="pagination mb-0" style={{ gap: '8px' }}>
                                    {/* Previous Button */}
                                    <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                                        <button
                                            className="btn"
                                            onClick={handlePrevious}
                                            disabled={!pagination.hasPrevPage}
                                            style={{
                                                border: '1px solid #c1c9d6',
                                                borderRadius: '6px',
                                                padding: '8px 12px',
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: !pagination.hasPrevPage ? '#c1c9d6' : '#202020',
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            Previous
                                        </button>
                                    </li>

                                    {/* Page Numbers */}
                                    {Array.from({ length: pagination.totalPages }, (_, index) => {
                                        const page = index + 1;
                                        const isActive = page === currentPage;

                                        return (
                                            <li key={page} className="page-item">
                                                <button
                                                    className="btn"
                                                    onClick={() => handlePageChange(page)}
                                                    style={{
                                                        border: '1px solid #c1c9d6',
                                                        borderRadius: '6px',
                                                        padding: '8px 12px',
                                                        fontFamily: 'Inter',
                                                        fontSize: '14px',
                                                        fontWeight: '500',
                                                        minWidth: '40px',
                                                        color: isActive ? 'white' : '#202020',
                                                        backgroundColor: isActive ? '#9d4141' : 'white',
                                                        borderColor: isActive ? '#9d4141' : '#c1c9d6'
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            </li>
                                        );
                                    })}

                                    {/* Next Button */}
                                    <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                                        <button
                                            className="btn"
                                            onClick={handleNext}
                                            disabled={!pagination.hasNextPage}
                                            style={{
                                                border: '1px solid #c1c9d6',
                                                borderRadius: '6px',
                                                padding: '8px 12px',
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: !pagination.hasNextPage ? '#c1c9d6' : '#202020',
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            Next
                                        </button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Form Modal */}
            <TeamForm
                show={showTeamForm}
                onHide={() => {
                    setShowTeamForm(false)
                    setSelectedTeam(null)
                }}
                team={selectedTeam}
                onSave={handleSaveTeam}
                onDelete={handleDeleteTeam}
            />
        </div>
    )
    // one
}

export default TasksMainCalenderPage