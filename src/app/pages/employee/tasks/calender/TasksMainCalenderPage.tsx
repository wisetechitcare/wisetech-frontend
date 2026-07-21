import { Button } from '@mui/material'
import React, { useEffect, useMemo, useState } from 'react'
import TeamForm from './component/TeamForm'
import { getAllTeams, getAllTeamsMember, moveEmployeeTeam, backfillTeamMemberships } from '@services/projects'
import { fetchOrganizationTree } from '@services/company'
import { fetchBranches, fetchDepartments } from '@services/options'
import axios from 'axios'
import { LEAD_PROJECT_COMPANY } from '@constants/api-endpoint'
import { get, set } from 'lodash'

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

interface FilterOption { value: string; label: string }

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
    /** The employee this membership belongs to (used to move them between teams). */
    employeeId?: string
    employee?: {
        id?: string
        teamId?: string | null
        companyId?: string
        branchId?: string
        departmentId?: string
        branches?: { id?: string; name?: string } | null
        companyOverview?: { id?: string; name?: string } | null
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
const TeamCard: React.FC<{
    team: Team;
    allTeams: { id: string; name: string }[];
    movingId: string | null;
    onEditTeam: (team: Team) => void;
    onMoveMember: (employeeId: string, teamId: string) => void;
}> = ({ team, allTeams, movingId, onEditTeam, onMoveMember }) => {


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
                            borderColor: '#1E3A8A',
                            color: '#1E3A8A',
                            fontFamily: 'Inter',
                            fontSize: '14px',
                            fontWeight: '500',
                            borderRadius: '6px',
                            border: '1px solid #1E3A8A',
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
                                <th scope="col" style={{ width: '170px', border: 'none', padding: '0 0 12px 0' }}>Team</th>
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
                                                        backgroundColor: '#1E3A8A',
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

                                        <td
                                            style={{
                                                border: 'none',
                                                padding: '3px 0',
                                                verticalAlign: 'middle',
                                            }}
                                        >
                                            <select
                                                className="form-select form-select-sm"
                                                value={team.id}
                                                disabled={!member.employeeId || movingId === String(member.employeeId)}
                                                onChange={(e) => {
                                                    if (member.employeeId && e.target.value !== team.id) {
                                                        onMoveMember(member.employeeId, e.target.value);
                                                    }
                                                }}
                                                title="Change this member's team"
                                                style={{
                                                    minWidth: '150px',
                                                    fontFamily: 'Inter',
                                                    fontSize: '13px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #c1c9d6',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {allTeams.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={7}
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

    // Org / branch / department filters (client-side, over each team's members).
    const [orgOptions, setOrgOptions] = useState<FilterOption[]>([])
    const [branchOptions, setBranchOptions] = useState<FilterOption[]>([])
    const [deptOptions, setDeptOptions] = useState<FilterOption[]>([])
    const [orgFilter, setOrgFilter] = useState('')
    const [branchFilter, setBranchFilter] = useState('')
    const [deptFilter, setDeptFilter] = useState('')

    // Employee id currently being moved to another team (disables its row control).
    const [movingId, setMovingId] = useState<string | null>(null)

    const handleAddTeam = () => {
        setSelectedTeam(null)
        setShowTeamForm(true)
    }

    const handleEditTeam = (team: Team) => {
        setSelectedTeam(team)
        setShowTeamForm(true)
    }

    const getAllTeamsData = async () => {
        try {
            // Load every team (filtering + pagination happen client-side) plus all members.
            const [teamsResponse, membersResponse] = await Promise.all([
                getAllTeams(1, 1000),
                getAllTeamsMember(),
            ]);

            const teamsList = teamsResponse.data?.teams || [];
            const allMembers = membersResponse.data?.teamMembers || [];

            // Single source of truth = employees.teamId. Only show a membership
            // while the employee's OWN teamId still agrees with the row, so stale
            // team_members rows (from older add/remove flows) never appear.
            const membersByTeam = new Map<string, any[]>();
            allMembers.forEach((member: any) => {
                const rowTeamId = member?.teamId ? String(member.teamId) : '';
                const empTeamId = member?.employee?.teamId ? String(member.employee.teamId) : '';
                if (!rowTeamId || rowTeamId !== empTeamId) return;
                if (!membersByTeam.has(rowTeamId)) membersByTeam.set(rowTeamId, []);
                membersByTeam.get(rowTeamId)!.push(member);
            });

            const teamsWithMembers = teamsList.map((team: any) => ({
                ...team,
                members: membersByTeam.get(String(team.id)) || [],
            }));

            setTeams(teamsWithMembers);
        } catch (error) {
            console.log("Error fetching teams data:", error);
        }
    }

    const loadFilterOptions = async () => {
        try {
            const [orgRes, branchRes, deptRes] = await Promise.all([
                fetchOrganizationTree(),
                fetchBranches(),
                fetchDepartments(),
            ]);

            // Flatten the org hierarchy (roots + sub-orgs) so any node can match an
            // employee's companyId — onboarding stores org OR sub-org there.
            const flatOrgs: FilterOption[] = [];
            const walk = (nodes: any[]) =>
                (nodes || []).forEach((n: any) => {
                    flatOrgs.push({ value: n.id, label: n.name });
                    walk(n.children || []);
                });
            walk(orgRes?.data?.organizations || []);
            setOrgOptions(flatOrgs);

            setBranchOptions((branchRes?.data?.branches || []).map((b: any) => ({ value: b.id, label: b.name })));
            setDeptOptions((deptRes?.data?.departments || []).map((d: any) => ({ value: d.id, label: d.name })));
        } catch (e) {
            console.error('Failed to load Teams filters', e);
        }
    }

    useEffect(() => {
        let cancelled = false;
        async function init() {
            // One-time reconcile per session: make team_members exactly mirror the
            // employees.teamId source of truth (create missing, delete stale rows).
            if (!sessionStorage.getItem('wt_team_reconcile_v2')) {
                try { await backfillTeamMemberships(); } catch { /* best-effort */ }
                sessionStorage.setItem('wt_team_reconcile_v2', '1');
            }
            await loadFilterOptions();
            if (!cancelled) await getAllTeamsData();
        }
        init();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Snap back to the first page whenever the active filters change.
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, orgFilter, branchFilter, deptFilter]);
    // useEffect(() =>{ 

    //     getAllTeams().then((data) => {

    //         console.log("teams from api", data)
    //         // setTeams(teamsFromApi)
    //     })

    // }, [])







    const handleSaveTeam = (_teamData?: any) => {
        // TeamForm already called the create/update APIs; just refresh from server.
        getAllTeamsData().then(() => {
            setShowTeamForm(false)
            setSelectedTeam(null)
        }).catch(error => {
            console.error("Error refreshing teams data:", error)
        })
    }

    const handleDeleteTeam = (_teamId: string) => {
        getAllTeamsData().then(() => {
            setShowTeamForm(false)
            setSelectedTeam(null)
        }).catch(error => {
            console.error("Error refreshing teams data after deletion:", error)
        })
    }

    // Move a member to another team (one team per employee). Flows through the
    // backend sync so the employee's onboarding team assignment stays consistent.
    const handleMoveMember = async (employeeId: string, teamId: string) => {
        try {
            setMovingId(String(employeeId))
            await moveEmployeeTeam(employeeId, teamId)
            await getAllTeamsData()
        } catch (e) {
            console.error('Failed to move team member', e)
        } finally {
            setMovingId(null)
        }
    }

    // Team options for the per-member "change team" dropdown.
    const teamSelectOptions = useMemo(
        () => teams.map((t) => ({ id: t.id, name: t.name })),
        [teams]
    );

    // Filter teams by name (search) and by member org / branch / department.
    const memberFilterActive = !!(orgFilter || branchFilter || deptFilter);
    const matchesMemberFilters = (m: any) => {
        if (orgFilter && m?.employee?.companyId !== orgFilter) return false;
        if (branchFilter && m?.employee?.branchId !== branchFilter) return false;
        if (deptFilter && m?.employee?.departmentId !== deptFilter) return false;
        return true;
    };

    const filteredTeams = useMemo(() => {
        const searchLower = searchTerm.toLowerCase().trim();
        return teams
            .map((team) => ({
                ...team,
                members: memberFilterActive
                    ? (team.members || []).filter(matchesMemberFilters)
                    : (team.members || []),
            }))
            .filter((team) => {
                if (searchLower && !(team.name || '').toLowerCase().includes(searchLower)) return false;
                // Hide teams with no matching members while a member filter is active.
                if (memberFilterActive && (team.members || []).length === 0) return false;
                return true;
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teams, searchTerm, orgFilter, branchFilter, deptFilter]);

    const isFiltering = !!(searchTerm.trim() || orgFilter || branchFilter || deptFilter);
    const clientTotalPages = Math.max(1, Math.ceil(filteredTeams.length / itemsPerPage));
    const displayTeams = isFiltering
        ? filteredTeams
        : filteredTeams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1)
    }

    const handleNext = () => {
        if (currentPage < clientTotalPages) setCurrentPage(prev => prev + 1)
    }

    const handleSearch = (value: string) => {
        setSearchTerm(value)
    }

    const clearSearch = () => {
        setSearchTerm('')
    }

    const clearFilters = () => {
        setSearchTerm('')
        setOrgFilter('')
        setBranchFilter('')
        setDeptFilter('')
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
                            backgroundColor: "#1E3A8A",
                            borderColor: "#1E3A8A",
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

            {/* Filters: Organization / Branch / Department */}
            <div className="d-flex flex-wrap align-items-center mb-4" style={{ gap: '12px' }}>
                <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: '#5b6b82' }}>
                    Filter by
                </span>
                <select
                    className="form-select"
                    value={orgFilter}
                    onChange={(e) => setOrgFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '190px', border: '1px solid #c1c9d6', borderRadius: '6px', fontFamily: 'Inter', fontSize: '14px', backgroundColor: '#fff' }}
                >
                    <option value="">All organizations</option>
                    {orgOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
                <select
                    className="form-select"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '170px', border: '1px solid #c1c9d6', borderRadius: '6px', fontFamily: 'Inter', fontSize: '14px', backgroundColor: '#fff' }}
                >
                    <option value="">All branches</option>
                    {branchOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
                <select
                    className="form-select"
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    style={{ width: 'auto', minWidth: '180px', border: '1px solid #c1c9d6', borderRadius: '6px', fontFamily: 'Inter', fontSize: '14px', backgroundColor: '#fff' }}
                >
                    <option value="">All departments</option>
                    {deptOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
                {isFiltering && (
                    <button
                        type="button"
                        className="btn btn-sm"
                        onClick={clearFilters}
                        style={{ color: '#1E3A8A', border: '1px solid #1E3A8A', borderRadius: '6px', fontFamily: 'Inter', fontSize: '13px', fontWeight: 500, padding: '6px 14px', backgroundColor: 'white' }}
                    >
                        Clear filters
                    </button>
                )}
            </div>

            {/* Teams List */}
            <div className="row">
                <div className="col-12">
                    <div className="d-flex flex-column" style={{ gap: '12px' }}>


                        {displayTeams.length > 0 ? (
                            displayTeams.map((team) => (
                                <TeamCard
                                    key={team.id}
                                    team={team}
                                    allTeams={teamSelectOptions}
                                    movingId={movingId}
                                    onEditTeam={handleEditTeam}
                                    onMoveMember={handleMoveMember}
                                />
                            ))
                        ) : (
                            <div className="text-center py-5">
                                <p style={{
                                    fontFamily: 'Inter',
                                    fontSize: '16px',
                                    color: '#8998AB'
                                }}>
                                    {isFiltering ?
                                        'No teams match the current filters.' :
                                        'No teams found.'
                                    }
                                </p>
                                {isFiltering && (
                                    <button
                                        type="button"
                                        className="btn btn-link"
                                        onClick={clearFilters}
                                        style={{
                                            color: '#1E3A8A',
                                            textDecoration: 'none',
                                            fontFamily: 'Inter',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pagination Controls */}
            {!isFiltering && clientTotalPages > 1 && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center">
                            {/* Pagination Info */}
                            <div style={{
                                fontFamily: 'Inter',
                                fontSize: '14px',
                                color: '#8998AB'
                            }}>
                                Showing page {currentPage} of {clientTotalPages} ({filteredTeams.length} total teams)
                            </div>

                            {/* Pagination Navigation */}
                            <nav aria-label="Teams pagination">
                                <ul className="pagination mb-0" style={{ gap: '8px' }}>
                                    {/* Previous Button */}
                                    <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                                        <button
                                            className="btn"
                                            onClick={handlePrevious}
                                            disabled={currentPage <= 1}
                                            style={{
                                                border: '1px solid #c1c9d6',
                                                borderRadius: '6px',
                                                padding: '8px 12px',
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: currentPage <= 1 ? '#c1c9d6' : '#202020',
                                                backgroundColor: 'white'
                                            }}
                                        >
                                            Previous
                                        </button>
                                    </li>

                                    {/* Page Numbers */}
                                    {Array.from({ length: clientTotalPages }, (_, index) => {
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
                                                        backgroundColor: isActive ? '#1E3A8A' : 'white',
                                                        borderColor: isActive ? '#1E3A8A' : '#c1c9d6'
                                                    }}
                                                >
                                                    {page}
                                                </button>
                                            </li>
                                        );
                                    })}

                                    {/* Next Button */}
                                    <li className={`page-item ${currentPage >= clientTotalPages ? 'disabled' : ''}`}>
                                        <button
                                            className="btn"
                                            onClick={handleNext}
                                            disabled={currentPage >= clientTotalPages}
                                            style={{
                                                border: '1px solid #c1c9d6',
                                                borderRadius: '6px',
                                                padding: '8px 12px',
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: currentPage >= clientTotalPages ? '#c1c9d6' : '#202020',
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