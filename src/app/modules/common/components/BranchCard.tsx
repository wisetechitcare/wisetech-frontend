import { ArrowUpRight, Building2, Fingerprint, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/ds/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ds/ui/tooltip';
import { EntityCard } from '@/ds/patterns/entity-card';
import { RowAction } from '@/ds/patterns/row-action';

export interface BranchCardProps {
  branch: any;
  isAdmin: boolean;
  /** Whether the current user can promote / edit / delete this branch. */
  canManage: boolean;
  onViewEmployees: () => void;
  onManageDevices: () => void;
  onPromote: () => void;
  onEdit: () => void;
  /** Omitted when the user lacks Delete — the trash button is hidden. */
  onDelete?: () => void;
}

/**
 * One branch as a kit Entity Card: name, a two-line address (the full text in a Tooltip), the two drill-ins
 * (employees, biometric devices) and, for managers, promote / edit / delete. The whole tile opens the edit
 * form for someone who may manage it. Behaviour is injected; every pixel comes from the kit.
 */
export default function BranchCard({
  branch, isAdmin, canManage, onViewEmployees, onManageDevices, onPromote, onEdit, onDelete,
}: BranchCardProps) {
  const employees = branch?._count?.Employees ?? 0;
  const canOpen = isAdmin && canManage;
  const name = branch?.name ?? '';
  const address = branch?.address ?? '';

  return (
    <EntityCard
      title={name}
      icon={<Building2 aria-hidden />}
      tone="cyan"
      onOpen={canOpen ? onEdit : undefined}
      openLabel={canOpen ? `Edit branch ${name}` : undefined}
      description={
        address ? (
          // Clamped to two lines by the card, so the full address has somewhere to live.
          <Tooltip>
            <TooltipTrigger render={<span className="relative z-10" />}>{address}</TooltipTrigger>
            <TooltipContent className="max-w-sm">{address}</TooltipContent>
          </Tooltip>
        ) : undefined
      }
      actions={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onViewEmployees}>
              <Users data-icon="inline-start" aria-hidden />
              {employees} {employees === 1 ? 'Employee' : 'Employees'}
            </Button>
            <Button size="sm" variant="outline" onClick={onManageDevices}>
              <Fingerprint data-icon="inline-start" aria-hidden />
              Devices
            </Button>
          </div>
          {canOpen && (
            <div className="flex gap-1.5">
              <RowAction label="Promote to sub-organization" onClick={onPromote}><ArrowUpRight aria-hidden /></RowAction>
              <RowAction label="Edit branch" onClick={onEdit}><Pencil aria-hidden /></RowAction>
              {onDelete && <RowAction label="Delete branch" tint="danger" onClick={onDelete}><Trash2 aria-hidden /></RowAction>}
            </div>
          )}
        </div>
      }
    />
  );
}
