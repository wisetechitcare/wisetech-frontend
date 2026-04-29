import { Employee, Level } from '../../types';

export type FormMode = 'addLevel' | 'editLevel' | 'addEmployee' | 'editEmployee' | 'addMultipleEmployees';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: FormMode;
  levelData?: Level;
  levelNumber?: number;
  employeeData?: Employee;
  onSubmit: (data: FormSubmitData) => void;
  onDelete?: () => void;
  availableEmployees?: Employee[];
}

export interface FormSubmitData {
  levelName?: string;
  selectedEmployee?: Employee;
  selectedEmployees?: Employee[];
  employeeName?: string;
  employeePosition?: string;
}

export interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

export interface EmployeeSelectProps {
  selectedEmployee?: Employee;
  selectedEmployees?: Employee[];
  availableEmployees: Employee[];
  onSelect: (employee: Employee) => void;
  onMultiSelect?: (employees: Employee[]) => void;
  multiSelect?: boolean;
  onDropdownToggle?: (isOpen: boolean) => void;
}

export interface FormHeaderProps {
  mode: FormMode;
  levelNumber?: number;
  onClose: () => void;
}

export interface FormActionsProps {
  mode: FormMode;
  onSubmit: () => void;
  onDelete?: () => void;
  isSubmitDisabled?: boolean;
}