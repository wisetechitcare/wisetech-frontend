export type LeaveAlertSeverity = 'info' | 'warning' | 'danger';

export interface LeaveAlert {
  id: string;
  severity: LeaveAlertSeverity;
  message: string;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface LeaveRecord {
  id?: string;
  dateFrom: string;
  dateTo: string;
  status: number;
  isHalfDay?: boolean;
  halfDaySession?: string | null;
}

export interface CumulativeSummary {
  total: number;
  used: number;
  allowedTillNow: number;
  remaining: number;
}

export type SelectionPhase = 'idle' | 'pick-end' | 'committed';
