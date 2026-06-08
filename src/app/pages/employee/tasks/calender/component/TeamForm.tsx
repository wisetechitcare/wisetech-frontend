import { fetchAllEmployees } from '@services/employee'
import { deleteMember, getAllTeamsMember, updateMemberRole, deleteTeam, createTeam, updateTeam, createMultipleTeamMembers, createTeamWithMembers } from '@services/projects'
import { deleteConfirmation, removeConfirmation, successConfirmation } from '@utils/modal'
import React, { useState, useEffect } from 'react'
import { Modal } from 'react-bootstrap'

// Types
interface TeamMember {
    id: number | string
    name?: string
    employee?: {
        id?: number | string
        _id?: number | string
        users?: {
            firstName: string
            lastName: string
        }
    }
    role: 'TEAM_LEADER' | 'MEMBER'
    experienceLevel: string
    profile: string
    department: string
    avatar: string
}

interface Team {
    id: string
    name: string
    color: string
    members: TeamMember[]
}

interface TeamFormProps {
    show: boolean
    onHide: () => void
    team?: Team | null
    onSave: (teamData: Partial<Team>) => void
    onDelete?: (teamId: string) => void
}

const TeamForm: React.FC<TeamFormProps> = ({ show, onHide, team, onSave, onDelete }) => {
    const [employees, setEmployees] = useState<any[]>([]);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [allEmployees, setAllEmployees] = useState<any[]>([]);
    const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [selectedEmployees, setSelectedEmployees] = useState<(number | string)[]>([]);
    useEffect(() => {
        const fetchAllTeamsMember = async () => {
            try {
                const response = await getAllTeamsMember();
                console.log("teams members =====>askdjhfl", response.data.teamMembers);
                setEmployees(response.data.teamMembers || []);
            } catch (error) {
                console.error("Error fetching teams members:", error);
            }
        };

        fetchAllTeamsMember();
    }, []);

    // Fetch all employees for the modal
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const response = await fetchAllEmployees();
                console.log("All employees=======>employee in fetch", response.data.employees);
                const employees = response.data.employees || [];
                setAllEmployees(employees);
                setFilteredEmployees(employees);
            } catch (error) {
                console.error("Error fetching employees:", error);
            }
        };

        if (showAddMemberModal) {
            fetchEmployees();
        } else {
            // Reset search when modal closes
            setSearchTerm('');
            setFilteredEmployees([]);
        }
    }, [showAddMemberModal]);

    // Filter employees based on search term and exclude existing members


    console.log("Employee Name:", employees);
    console.log("Search Term:", searchTerm);
    console.log("Filtered Employees:", filteredEmployees);


    const [formData, setFormData] = useState<Partial<Team>>({
        name: '',
        color: '#40b2d2',
        members: [] // Start with empty members
    })

    useEffect(() => {
        // Get employee IDs of existing members to exclude from the list
        const existingEmployeeIds = formData.members?.map(member => {
            // For members from API, employee data is in member.employee
            // For newly added members (not yet saved), member.id is the employee ID
            if (member.employee && (member.employee.id || member.employee._id)) {
                return member.employee.id || member.employee._id;
            }
            // For new team members added locally, the id is the employee ID
            return member.id;
        }) || []

        // Filter out existing members first
        const availableEmployees = allEmployees.filter(employee => !existingEmployeeIds.includes(employee.id))

        if (!searchTerm.trim()) {
            setFilteredEmployees(availableEmployees);
        } else {
            const filtered = availableEmployees.filter(employee => {
                const fullName = `${employee?.users?.firstName || ''} ${employee?.users?.lastName || ''}`.toLowerCase();
                const email = (employee?.users?.email || '').toLowerCase();
                const department = (employee?.departments?.name || employee?.department || '').toLowerCase();
                const searchLower = searchTerm.toLowerCase();

                return fullName.includes(searchLower) ||
                    email.includes(searchLower) ||
                    department.includes(searchLower);
            });
            setFilteredEmployees(filtered);
        }
    }, [searchTerm, allEmployees, formData.members]);

    const [showMembersTable] = useState(true)

    const isEditMode = !!team

    useEffect(() => {
        if (team) {
            // Editing existing team - load current members
            setFormData({
                id: team.id,
                name: team.name,
                color: team.color,
                members: [...(team?.members || [])]
            })
        } else {
            // Adding new team - start with empty members
            setFormData({
                name: '',
                color: '#40b2d2',
                members: [] // Empty array for new teams
            })
        }
    }, [team, show])

    const handleInputChange = (field: keyof Team, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleMakeTeamLeader = async (memberId: number | string) => {
        console.log("Making team leader for member ID:", memberId);
        if (!formData.members) return

        try {
            if (isEditMode) {
                // For existing teams, call API to update role
                await updateMemberRole(String(memberId), 'TEAM_LEADER')
            }

            // Update local state for both new and existing teams
            const updatedMembers = formData.members.map(member => ({
                ...member,
                role: member.id === memberId ? 'TEAM_LEADER' as const : 'MEMBER' as const
            }))

            setFormData(prev => ({ ...prev, members: updatedMembers }))
            console.log("Updated members after role change:", updatedMembers, memberId);

            if (isEditMode) {
                setEmployees(updatedMembers)
            }

            console.log("Team leader updated successfully");

        } catch (error: any) {
            console.error("Error updating team leader:", error)
            console.error('Error details:', error?.response?.data)
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update team leader. Please try again.'
            alert(`Error: ${errorMessage}`)
        }
    }

    const handleRemoveMember = async (memberId: string | number) => {
        console.log("Member ID to be deleted:", memberId);
        if (!formData.members) return

        const confirmed = await deleteConfirmation(
            "Removed Member",
        )

        if (confirmed) {
            try {
                if (isEditMode) {
                    // For existing teams, call API to delete member
                    await deleteMember(String(memberId))

                    // Refetch the updated team members from the server
                    const response = await getAllTeamsMember()
                    const allTeamMembers = response.data.teamMembers || []
                    setEmployees(allTeamMembers)

                    // Filter to only get members for the current team
                    const currentTeamMembers = allTeamMembers.filter((member: any) => {
                        const memberTeamId = member.teamId || member.team_id || member.teamID || member.Team_ID || member.team?.id || member.team?.ID;
                        return String(memberTeamId) === String(team!.id);
                    });

                    // Update form data with only the current team's members
                    setFormData(prev => ({
                        ...prev,
                        members: currentTeamMembers
                    }))
                } else {
                    // For new teams, just remove from local state
                    const updatedMembers = formData.members.filter(member => member.id !== memberId)
                    setFormData(prev => ({
                        ...prev,
                        members: updatedMembers
                    }))
                    console.log("Member removed from new team locally");
                }
            } catch (error: any) {
                console.error("Error deleting member:", error)
                console.error('Error details:', error?.response?.data)
                const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete member. Please try again.'
                alert(`Error: ${errorMessage}`)
            }
        }
    }

    const handleSave = async () => {
        if (!formData.name?.trim()) {
            alert('Please enter a team name')
            return
        }

        // if (!formData.color?.trim()) {
        //     alert('Please select a team color')
        //     return
        // }

        try {
            if (isEditMode) {
                // For editing existing team, call updateTeam API with only the name
                const teamPayload = {
                    name: formData.name
                }

                console.log('Updating team with payload:', teamPayload)
                const response = await updateTeam(team!.id, teamPayload)
                console.log('Team updated successfully', response)
                successConfirmation('Team updated successfully')

                // Notify parent that team was updated successfully
                onSave({ name: formData.name, color: formData.color })
                onHide()
            } else {
                // For creating new team with members
                console.log('=== STARTING TEAM CREATION ===')
                console.log('Form data at save time:', formData)
                console.log('Members in form data:', formData.members)

                // Prepare payload for createTeamWithMembers
                const teamPayload = {
                    name: formData.name,
                    isActive: true,
                    members: formData.members && formData.members.length > 0
                        ? formData.members.map(member => ({
                            employeeId: member.id,
                            role: member.role,
                            level: member.experienceLevel || undefined,
                            profile: member.profile || undefined
                        }))
                        : []
                }

                console.log('Creating team with payload:', teamPayload)
                const response = await createTeamWithMembers(teamPayload)
                console.log('Team created successfully with members', response)
                successConfirmation('Team created successfully')

                // Notify parent that team was created successfully
                onSave({ name: formData.name, color: formData.color })
                onHide()
            }
        } catch (error: any) {
            console.error('Error saving team:', error)
            console.error('Error details:', error?.response?.data)
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save team. Please try again.'
            alert(`Error: ${errorMessage}`)
        }
    }

    const handleDelete = async () => {
        if (!team) return

        const confirmed = await deleteConfirmation(
          "Team deleted successfully",
        );

        if (confirmed) {
            try {
                await deleteTeam(team.id)
                console.log("Team deleted successfully");

                // Call the parent's onDelete if it exists (for any additional cleanup)
                if (onDelete) {
                    onDelete(team.id)
                }

                onHide()
            } catch (error: any) {
                console.error("Error deleting team:", error)
                console.error('Error details:', error?.response?.data)
                const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete team. Please try again.'
                alert(`Error: ${errorMessage}`)
            }
        }
    }

    const handleAddSelectedEmployees = async () => {
        if (selectedEmployees.length === 0) {
            alert('Please select at least one employee')
            return
        }

        try {
            // Filter out employees who are already members
            // For existing teams, member.id is the team member record ID, so we need to get the employee ID
            const existingEmployeeIds = formData.members?.map(member => {
                // For members from API, employee data is in member.employee
                // For newly added members (not yet saved), member.id is the employee ID
                if (member.employee && (member.employee.id || member.employee._id)) {
                    return member.employee.id || member.employee._id;
                }
                // For new team members added locally, the id is the employee ID
                return member.id;
            }) || []

            const newEmployeeIds = selectedEmployees.filter(id => !existingEmployeeIds.includes(id))

            if (newEmployeeIds.length === 0) {
                alert('All selected employees are already team members')
                setSelectedEmployees([])
                setShowAddMemberModal(false)
                return
            }

            // Convert selected employee IDs to team member objects
            const newMembers = newEmployeeIds.map(employeeId => {
                const employee = allEmployees.find(emp => emp.id === employeeId);
                return {
                    id: employeeId,
                    employee: employee,
                    role: 'MEMBER' as const,
                    experienceLevel: '',
                    profile: '',
                    department: employee?.departments?.name || employee?.department || '',
                    avatar: employee?.avatar || ''
                };
            });

            if (isEditMode && team?.id) {
                // For existing teams: Call API to add members
                const payload = {
                    employeeIds: newEmployeeIds,
                    teamId: team.id
                }

                console.log('Creating multiple team members with payload:', payload)
                const result = await createMultipleTeamMembers(payload)
                console.log('API result:', result)

                // Refetch the updated team members from the server
                const response = await getAllTeamsMember()
                const allTeamMembers = response.data.teamMembers || []
                setEmployees(allTeamMembers)

                // Filter to only get members for the current team
                const currentTeamMembers = allTeamMembers.filter((member: any) => {
                    const memberTeamId = member.teamId || member.team_id || member.teamID || member.Team_ID || member.team?.id || member.team?.ID;
                    return String(memberTeamId) === String(team.id);
                });

                // Update form data with only the current team's members
                setFormData(prev => ({
                    ...prev,
                    members: currentTeamMembers
                }))

                console.log(`Successfully added ${newEmployeeIds.length} new members to existing team`)
                console.log(`Current team now has ${currentTeamMembers.length} total members`)
            } else {
                // For new teams: Store members locally in form data
                setFormData(prev => {
                    const updatedFormData = {
                        ...prev,
                        members: [...(prev.members || []), ...newMembers]
                    };
                    console.log('Updated form data with new members:', updatedFormData);
                    return updatedFormData;
                })

                console.log(`Successfully added ${newEmployeeIds.length} new members to new team locally`)
                console.log('New members added:', newMembers)
            }

            // Reset selection and close modal
            setSelectedEmployees([])
            setShowAddMemberModal(false)

        } catch (error: any) {
            console.error('Error adding team members:', error)
            console.error('Error details:', {
                message: error?.message,
                response: error?.response?.data,
                status: error?.response?.status,
                payload: isEditMode && team?.id ? { employeeIds: selectedEmployees, teamId: team.id } : 'Local storage',
                team: team,
                selectedEmployeesCount: selectedEmployees.length,
                allEmployeesCount: allEmployees.length
            })

            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add team members. Please try again.'
            alert(`Error: ${errorMessage}`)
        }
    }

    console.log("teamsMembers:===========>", employees);

    // console.log("employees:", employees?.users?.firstName + " " + employees?.users?.lastName);

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Body className="p-10">
                <div className="bg-white p-4 p-md-5" style={{ borderRadius: '12px' }}>
                    {/* Header */}
                    <div className="d-flex align-items-center justify-content-between mb-4">
                        <h4
                            className="mb-0"
                            style={{
                                fontFamily: 'Barlow',
                                fontSize: '24px',
                                fontWeight: '600',
                                color: 'black',
                                letterSpacing: '0.24px'
                            }}
                        >
                            {isEditMode ? 'Edit Team' : 'Add New Team'}
                        </h4>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onHide}
                            aria-label="Close"
                        />
                    </div>

                    {/* Form Content */}
                    <div className="d-flex flex-column gap-4">
                        {/* Team Name */}
                        <div>
                            <label
                                className="form-label mb-2"
                                style={{
                                    fontFamily: 'Inter',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: 'black'
                                }}
                            >
                                Team Name
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.name || ''}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                style={{
                                    backgroundColor: '#eef1f7',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '12px 16px',
                                    fontFamily: 'Inter',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}
                                placeholder="Enter team name"
                            />
                        </div>

                        {/* Team Color */}
                        <div>
                            <label
                                className="form-label mb-2"
                                style={{
                                    fontFamily: 'Inter',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    color: 'black'
                                }}
                            >
                                Team Color
                            </label>
                            <div
                                className="form-control d-flex align-items-center gap-2"
                                style={{
                                    backgroundColor: '#eef1f7',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '12px 16px'
                                }}
                            >
                                <div
                                    className="rounded-circle"
                                    style={{
                                        backgroundColor: formData.color,
                                        width: '18px',
                                        height: '18px'
                                    }}
                                />
                                <input
                                    type="text"
                                    value={formData.color || ''}
                                    onChange={(e) => handleInputChange('color', e.target.value)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        outline: 'none',
                                        fontFamily: 'Inter',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: 'black',
                                        flex: 1
                                    }}
                                    placeholder="#565675"
                                />
                            </div>
                        </div>

                        {/* Team Members */}
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <label
                                    className="form-label mb-0"
                                    style={{
                                        fontFamily: 'Inter',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: 'black'
                                    }}
                                >
                                    Team Members
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    onClick={() => setShowAddMemberModal(true)}
                                    style={{
                                        border: '1px solid #9d4141',
                                        padding: '8px 18px',
                                        borderColor: '#9d4141',
                                        color: '#9d4141',
                                        fontFamily: 'Inter',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        borderRadius: '6px'
                                    }}
                                >
                                    Add Member
                                </button>
                            </div>

                            {/* Members Table */}
                            <div
                                style={{
                                    maxHeight: showMembersTable ? '500px' : '0px',
                                    overflow: 'hidden',
                                    transition: 'max-height 0.3s ease-in-out',
                                    opacity: showMembersTable ? 1 : 0,
                                    transitionProperty: 'max-height, opacity',
                                    transitionDuration: '0.3s',
                                    transitionTimingFunction: 'ease-in-out'
                                }}
                            >
                                <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto', backgroundColor: '#0000' }}>
                                    <table className="table table-borderless mb-0">
                                        <thead>
                                            <tr style={{
                                                fontFamily: 'Inter',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                color: '#70829a'
                                            }}>
                                                <th scope="col" style={{ width: '60px', border: 'none', padding: '0 16px 16px 0' }}>S.No</th>
                                                <th scope="col" style={{ width: '200px', border: 'none', padding: '0 16px 16px 0' }}>Name</th>
                                                <th scope="col" style={{ border: 'none', padding: '0 16px 16px 0' }}>Team Role</th>
                                                <th scope="col" style={{ border: 'none', padding: '0 16px 16px 0' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.members && formData.members.length > 0 ?
                                                formData.members.map((member, index) => (
                                                    <tr key={member.id} style={{ height: '40px' }}>
                                                        <td
                                                            style={{
                                                                border: 'none',
                                                                padding: '8px 16px 8px 0',
                                                                verticalAlign: 'middle',
                                                                fontFamily: 'Inter',
                                                                fontSize: '14px',
                                                                fontWeight: '500',
                                                                color: 'black',
                                                                whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            {index + 1}.
                                                        </td>

                                                        <td
                                                            style={{
                                                                border: 'none',
                                                                padding: '8px 16px 8px 0',
                                                                verticalAlign: 'middle'
                                                            }}
                                                        >
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div
                                                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                                                    style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        backgroundColor: member.avatar ? 'transparent' : '#9d4141',
                                                                        color: 'white',
                                                                        fontSize: '14px',
                                                                        fontWeight: '600',
                                                                        flexShrink: 0,
                                                                        whiteSpace: "nowrap",
                                                                        backgroundImage: member.avatar ? `url('${member.avatar}')` : 'none',
                                                                        backgroundSize: 'cover',
                                                                        backgroundPosition: 'center',
                                                                        backgroundRepeat: 'no-repeat'
                                                                    }}
                                                                >
                                                                    {!member.avatar && (member?.employee?.users?.firstName || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                                <span
                                                                    style={{
                                                                        fontFamily: 'Inter',
                                                                        fontSize: '14px',
                                                                        fontWeight: '400',
                                                                        color: '#202020',
                                                                        whiteSpace: "nowrap"
                                                                    }}
                                                                >
                                                                    {/* {member?.users?.firstName} {member?.users?.lastName} */}
                                                                    {/* {member.name} */}
                                                                    {member?.employee?.users?.firstName} {member?.employee?.users?.lastName}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td
                                                            style={{
                                                                border: 'none',
                                                                padding: '8px 16px 8px 0',
                                                                verticalAlign: 'middle',
                                                                whiteSpace: "nowrap"
                                                            }}
                                                        >
                                                            <span
                                                                className="badge rounded-pill"
                                                                style={{
                                                                    backgroundColor:
                                                                        member.role === 'TEAM_LEADER'
                                                                            ? '#ffe0ba'
                                                                            : '#e4e6f4',
                                                                    color:
                                                                        member.role === 'TEAM_LEADER'
                                                                            ? '#b86e13'
                                                                            : '#6067cf',
                                                                    fontFamily: 'Inter',
                                                                    fontSize: '14px',
                                                                    fontWeight: '400',
                                                                    padding: '4px 12px',
                                                                    minWidth: '120px',
                                                                    display: 'inline-block',
                                                                    textAlign: 'center',
                                                                    paddingTop: '6px',
                                                                    paddingBottom: '6px',
                                                                    whiteSpace: "nowrap"
                                                                }}
                                                            >
                                                                {member.role === 'TEAM_LEADER' ? 'Team Leader' : 'Member'}
                                                            </span>
                                                        </td>

                                                        <td
                                                            style={{
                                                                border: 'none',
                                                                padding: '8px 0',
                                                                verticalAlign: 'middle'
                                                            }}
                                                        >
                                                            <div className="d-flex gap-3 align-items-center">
                                                                {member.role !== 'TEAM_LEADER' && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-link btn-sm p-0 d-flex align-items-center gap-1"
                                                                        onClick={() => handleMakeTeamLeader(member.id)}
                                                                        style={{
                                                                            color: '#9d4141',
                                                                            textDecoration: 'none',
                                                                            fontFamily: 'Inter',
                                                                            fontSize: '14px',
                                                                            fontWeight: '500',
                                                                            whiteSpace: "nowrap"
                                                                        }}
                                                                    >
                                                                        <svg
                                                                            width="16"
                                                                            height="16"
                                                                            fill="currentColor"
                                                                            viewBox="0 0 24 24"
                                                                        >
                                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                                                        </svg>
                                                                        Make Team Leader
                                                                    </button>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-link btn-sm p-0 d-flex align-items-center gap-1"
                                                                    onClick={() => handleRemoveMember(member.id)}
                                                                    style={{
                                                                        color: '#9d4141',
                                                                        textDecoration: 'none',
                                                                        fontFamily: 'Inter',
                                                                        fontSize: '14px',
                                                                        fontWeight: '500'
                                                                    }}
                                                                >
                                                                    <svg
                                                                        width="16"
                                                                        height="16"
                                                                        fill="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                                    </svg>
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                                : (
                                                    <tr>
                                                        <td
                                                            colSpan={4}
                                                            style={{
                                                                textAlign: 'center',
                                                                padding: '20px',
                                                                fontFamily: 'Inter',
                                                                fontSize: '14px',
                                                                color: '#8998ab',
                                                                border: 'none'
                                                            }}
                                                        >
                                                            No team members added yet. Click "Add Member" to add team members.
                                                        </td>
                                                    </tr>
                                                )}

                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Add Member Modal */}
                        <Modal show={showAddMemberModal} onHide={() => setShowAddMemberModal(false)} centered>
                            <Modal.Body className="p-0">
                                <div className="bg-white p-4" style={{ borderRadius: '12px' }}>
                                    <div className="d-flex align-items-center justify-content-between mb-4">
                                        <h5
                                            className="mb-0"
                                            style={{
                                                fontFamily: 'Barlow',
                                                fontSize: '20px',
                                                fontWeight: '600',
                                                color: 'black'
                                            }}
                                        >
                                            Add Team Member
                                        </h5>
                                        <button
                                            type="button"
                                            className="btn-close"
                                            onClick={() => setShowAddMemberModal(false)}
                                            aria-label="Close"
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label mb-3" style={{
                                            fontFamily: 'Inter',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: 'black'
                                        }}>
                                            Select Employees
                                        </label>

                                        {/* Search Bar */}
                                        <div className="mb-3">
                                            <div className="position-relative">
                                                <input
                                                    type="text"
                                                    className="form-control"
                                                    placeholder="Search employees by name, email, or department..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    style={{
                                                        backgroundColor: '#eef1f7',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        padding: '12px 16px 12px 45px',
                                                        fontFamily: 'Inter',
                                                        fontSize: '14px',
                                                        fontWeight: '400'
                                                    }}
                                                />
                                                <svg
                                                    className="position-absolute"
                                                    style={{
                                                        left: '15px',
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
                                                            right: '10px',
                                                            top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            padding: '0',
                                                            border: 'none',
                                                            background: 'none',
                                                            color: '#8998ab'
                                                        }}
                                                        onClick={() => setSearchTerm('')}
                                                    >
                                                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                            <table className="table table-borderless mb-0">
                                                <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                                                    <tr style={{
                                                        fontFamily: 'Inter',
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        color: '#70829a'
                                                    }}>
                                                        <th scope="col" style={{ width: '40px', border: 'none', padding: '0 16px 16px 0' }}>
                                                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            // Add all filtered employees to selection
                                                                            const newSelectedIds = [...selectedEmployees];
                                                                            filteredEmployees.forEach(emp => {
                                                                                if (!newSelectedIds.includes(emp.id)) {
                                                                                    newSelectedIds.push(emp.id);
                                                                                }
                                                                            });
                                                                            setSelectedEmployees(newSelectedIds);
                                                                        } else {
                                                                            // Remove all filtered employees from selection
                                                                            const filteredIds = filteredEmployees.map(emp => emp.id);
                                                                            setSelectedEmployees(prev => prev.filter(id => !filteredIds.includes(id)));
                                                                        }
                                                                    }}
                                                                    checked={filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.id))}

                                                                    style={{
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        appearance: 'none',
                                                                        WebkitAppearance: 'none',
                                                                        MozAppearance: 'none',
                                                                        border: `2px solid ${filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.id)) ? '#9D4141' : '#d1d5db'}`,
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer',
                                                                        position: 'relative',
                                                                        display: 'inline-block',
                                                                        verticalAlign: 'middle',
                                                                        backgroundColor: filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.id)) ? '#9D4141' : '#ffffff',
                                                                        transition: 'all 0.2s ease-in-out'
                                                                    }}
                                                                />
                                                                {filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.id)) && (
                                                                    <svg
                                                                        width="12"
                                                                        height="12"
                                                                        viewBox="0 0 16 16"
                                                                        fill="none"
                                                                        style={{
                                                                            position: 'absolute',
                                                                            left: '50%',
                                                                            top: '50%',
                                                                            transform: 'translate(-50%, -50%)',
                                                                            pointerEvents: 'none'
                                                                        }}
                                                                    >
                                                                        <path
                                                                            d="M3 8L6.5 11.5L13 5"
                                                                            stroke="white"
                                                                            strokeWidth="2.5"
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                        />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th scope="col" style={{ width: '200px', border: 'none', padding: '0 16px 16px 0' }}>Name</th>
                                                        <th scope="col" style={{ border: 'none', padding: '0 16px 16px 0' }}>Department</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredEmployees.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="text-center py-4" style={{
                                                                border: 'none',
                                                                fontFamily: 'Inter',
                                                                fontSize: '14px',
                                                                color: '#8998ab'
                                                            }}>
                                                                {searchTerm ? 'No employees found matching your search.' : 'No employees available.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredEmployees.map((employee) => (
                                                            <tr key={employee.id} style={{ height: '40px' }}>
                                                                <td style={{
                                                                    border: 'none',
                                                                    padding: '8px 16px 8px 0',
                                                                    verticalAlign: 'middle'
                                                                }}>
                                                                    {/* <input
                                                                    type="checkbox"
                                                                    checked={selectedEmployees.includes(employee.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedEmployees(prev => [...prev, employee.id]);
                                                                        } else {
                                                                            setSelectedEmployees(prev => prev.filter(id => id !== employee.id));
                                                                        }
                                                                    }}
                                                                /> */}
                                                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedEmployees.includes(employee.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedEmployees((prev) => [...prev, employee.id]);
                                                                                } else {
                                                                                    setSelectedEmployees((prev) => prev.filter((id) => id !== employee.id));
                                                                                }
                                                                            }}
                                                                            style={{
                                                                                width: '20px',
                                                                                height: '20px',
                                                                                appearance: 'none',
                                                                                WebkitAppearance: 'none',
                                                                                MozAppearance: 'none',
                                                                                border: `2px solid ${selectedEmployees.includes(employee.id) ? '#9D4141' : '#d1d5db'}`,
                                                                                borderRadius: '4px',
                                                                                cursor: 'pointer',
                                                                                position: 'relative',
                                                                                display: 'inline-block',
                                                                                verticalAlign: 'middle',
                                                                                backgroundColor: selectedEmployees.includes(employee.id) ? '#9D4141' : '#ffffff',
                                                                                transition: 'all 0.2s ease-in-out'
                                                                            }}
                                                                        />
                                                                        {selectedEmployees.includes(employee.id) && (
                                                                            <svg
                                                                                width="12"
                                                                                height="12"
                                                                                viewBox="0 0 16 16"
                                                                                fill="none"
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    left: '50%',
                                                                                    top: '50%',
                                                                                    transform: 'translate(-50%, -50%)',
                                                                                    pointerEvents: 'none'
                                                                                }}
                                                                            >
                                                                                <path
                                                                                    d="M3 8L6.5 11.5L13 5"
                                                                                    stroke="white"
                                                                                    strokeWidth="2.5"
                                                                                    strokeLinecap="round"
                                                                                    strokeLinejoin="round"
                                                                                />
                                                                            </svg>
                                                                        )}
                                                                    </div>

                                                                </td>
                                                                <td style={{
                                                                    border: 'none',
                                                                    padding: '8px 16px 8px 0',
                                                                    verticalAlign: 'middle'
                                                                }}>
                                                                    <div className="d-flex align-items-center gap-3">
                                                                        <div
                                                                            className="rounded-circle d-flex align-items-center justify-content-center"
                                                                            style={{
                                                                                width: '32px',
                                                                                height: '32px',
                                                                                backgroundColor: employee.avatar ? 'transparent' : '#9d4141',
                                                                                color: 'white',
                                                                                fontSize: '14px',
                                                                                fontWeight: '600',
                                                                                flexShrink: 0,
                                                                                backgroundImage: employee.avatar ? `url('${employee.avatar}')` : 'none',
                                                                                backgroundSize: 'cover',
                                                                                backgroundPosition: 'center',
                                                                                backgroundRepeat: 'no-repeat'
                                                                            }}
                                                                        >
                                                                            {!employee.avatar && (employee?.users?.firstName || 'U').charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <span style={{
                                                                            fontFamily: 'Inter',
                                                                            fontSize: '14px',
                                                                            fontWeight: '400',
                                                                            color: '#202020'
                                                                        }}>
                                                                            {employee?.users?.firstName} {employee?.users?.lastName}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td style={{
                                                                    border: 'none',
                                                                    padding: '8px 16px 8px 0',
                                                                    verticalAlign: 'middle',
                                                                    fontFamily: 'Inter',
                                                                    fontSize: '14px',
                                                                    color: '#70829a'
                                                                }}>
                                                                    {employee?.departments?.name || employee?.department || 'N/A'}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn"
                                            onClick={handleAddSelectedEmployees}
                                            style={{
                                                backgroundColor: '#9d4141',
                                                borderColor: '#9d4141',
                                                color: 'white',
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                borderRadius: '6px',
                                                padding: '8px 20px'
                                            }}
                                        >
                                            Add Members ({selectedEmployees.length})
                                        </button>
                                        {/* <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setShowAddMemberModal(false)}
                                            style={{
                                                fontFamily: 'Inter',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                borderRadius: '6px',
                                                padding: '8px 20px'
                                            }}
                                        >
                                            Cancel
                                        </button> */}
                                    </div>
                                </div>
                            </Modal.Body>
                        </Modal>

                        {/* Action Buttons */}
                        <div className="d-flex gap-3 mt-3">
                            <button
                                type="button"
                                className="btn"
                                onClick={handleSave}
                                style={{
                                    backgroundColor: '#9d4141',
                                    borderColor: '#9d4141',
                                    color: 'white',
                                    fontFamily: 'Inter',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    borderRadius: '6px',
                                    padding: '8px 20px'
                                }}
                            >
                                Save
                            </button>

                            {isEditMode && (
                                <button
                                    type="button"
                                    className="btn"
                                    onClick={handleDelete}
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
                                    Delete Team
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </Modal.Body>
        </Modal>
    )
    // one
}

export default TeamForm