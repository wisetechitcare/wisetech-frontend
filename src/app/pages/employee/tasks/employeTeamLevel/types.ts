export interface Employee {
  id: string;
  name: string;
  position: string;
  avatar: string;
  employee?: {
    users?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface Level {
  id: string;
  levelNumber: number;
  title: string;
  description: string;
  icon: string;
  employees: Employee[];
}

export interface EmployeeCardProps {
  employee: Employee;
  onEdit?: (employee: Employee) => void;
  onDelete?: (employeeId: string) => void;
}

export interface LevelSectionProps {
  level: Level;
  onAddEmployee?: (levelId: string) => void;
  onAddMultipleEmployees?: (levelId: string) => void;
  onEditLevel?: (level: Level) => void;
  onEditEmployee?: (employee: Employee) => void;
  onDeleteEmployee?: (employeeId: string) => void;
}

export interface EmployeeTeamLevelMainProps {
  levels?: Level[];
  onAddLevel?: () => void;
  onAddEmployee?: (levelId: string) => void;
  onEditLevel?: (level: Level) => void;
  onEditEmployee?: (employee: Employee) => void;
  onDeleteEmployee?: (employeeId: string) => void;
}