export interface TeamMember {
  id: number
  name?: string
  employee?: {
    users?: {
      firstName: string
      lastName: string
    }
    departments?: {
      name: string
    }
  }
  role: 'Team Leader' | 'Member'
  experienceLevel: string
  profile: string
  department: string
  avatar: string
  level?: string
}

export interface Team {
  id: string
  name: string
  color: string
  members: TeamMember[]
  isMyTeam?: boolean
}
