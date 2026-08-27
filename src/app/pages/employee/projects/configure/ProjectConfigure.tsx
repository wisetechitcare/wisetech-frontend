import {
  getAllProjectSubcategories,
  getAllProjectCategories,
  deleteProjectCategory,
  deleteProjectSubcategory,
  deleteProjectService,
  deleteProjectStatus,
  getAllProjectServices,
  getAllProjectStatuses,
  updateProjectStatus,
  getAllStakeholders,
  deleteStakeholderService,
} from "@services/projects";
import { getAllPaymentPlans, deletePaymentPlan } from "@services/paymentPlan";
import React, { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { deleteConfirmation } from "@utils/modal";
import ProjectConfigForm from "./components/ProjectConfigForm";
import PaymentPlanModal from "../../leads/configuration/components/PaymentPlanModal";
import { ProjectItem } from "@models/clientProject";
import { PaymentPlan } from "@models/leads";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { DropdownOption } from "./../../../../../types/deleteConfirmation";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

// ─── ColorChip ────────────────────────────────────────────────────────────────

interface ColorChipProps {
  name: string;
  color: string;
  onEdit: () => void;
  onDelete?: () => void;
}

const ColorChip: React.FC<ColorChipProps> = ({ name, color, onEdit, onDelete }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: hov ? '#ffffff' : '#f7f8fa',
        border: `1px solid ${hov ? '#d1d5e0' : '#eaecf0'}`,
        borderRadius: RADIUS.lg,
        padding: '9px 12px 9px 16px',
        transition: 'all 0.15s ease',
        boxShadow: hov ? '0 4px 14px rgba(24,28,50,0.09)' : '0 1px 3px rgba(24,28,50,0.04)',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: '3px', backgroundColor: color || '#ccc',
        borderRadius: '3px 0 0 3px', opacity: 0.8,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          backgroundColor: color || '#ccc', flexShrink: 0,
          boxShadow: `0 0 0 2px ${color ? color + '30' : '#ccc'}`,
        }} />
        <span style={{
          fontFamily: FONT.body, fontWeight: 500, fontSize: '13px',
          color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, opacity: hov ? 1 : 0.35, transition: 'opacity 0.15s ease' }}>
        <button
          onClick={onEdit}
          style={{ background: hov ? '#eff6ff' : 'transparent', border: 'none', borderRadius: RADIUS.sm, padding: '4px 7px', cursor: 'pointer', color: '#4f82c4', display: 'flex', alignItems: 'center', transition: 'background 0.15s ease' }}
        >
          <AppIcon name="bi-pencil" className="fs-8" />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ background: hov ? '#fff5f8' : 'transparent', border: 'none', borderRadius: RADIUS.sm, padding: '4px 7px', cursor: 'pointer', color: C.danger, display: 'flex', alignItems: 'center', transition: 'background 0.15s ease' }}
          >
            <AppIcon name="bi-trash" className="fs-8" />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── StatusFlowRow ──────────────────────────────────────────────────────────
// The project status list needs to read as a deliberate FLOW (this stage leads
// to that stage), not an alphabetical/arbitrary bag of chips — so it's a
// horizontal, numbered pipeline of connected stage pills that wrap across the
// full card width (instead of ChipGrid's arbitrary grid or a narrow, tall
// column). Each pill reveals its reorder / edit / delete controls in a floating
// toolbar on hover, keeping the resting row tight.

interface StatusFlowRowProps {
  index: number;
  total: number;
  name: string;
  color: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

interface DropdownState {
  open: boolean;
  ref: React.RefObject<HTMLDivElement>;
}

const StatusFlowRow: React.FC<StatusFlowRowProps> = ({
  index, total, name, color, onMoveUp, onMoveDown, onEdit, onDelete, disabled,
}) => {
  const [hov, setHov] = useState(false);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const dotColor = color || '#cccccc';

  const iconBtn = (tone: string, handler: () => void, icon: string, title: string, enabled = true): React.CSSProperties => ({
    background: 'none', border: 'none', width: '14px', height: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: enabled ? 'pointer' : 'default',
    color: hov ? tone : '#ddd', padding: 0, flexShrink: 0,
    transition: 'color 0.15s ease', fontSize: '9px',
  });

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', margin: 0 }}>
      {/* Stage pill — ultra-compact */}
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          backgroundColor: hov ? '#fafbfc' : '#f7f8fa',
          border: `1px solid ${hov ? '#d1d5e0' : '#eaecf0'}`,
          borderRadius: RADIUS.full,
          padding: '4px 8px',
          flexShrink: 0,
          margin: 0,
          transition: 'all 0.15s ease',
        }}
      >
        {/* Position badge — small circle */}
        <div style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: `${dotColor}25`, color: C.textSecondary,
          fontFamily: FONT.body, fontWeight: 700, fontSize: '9px',
        }}>
          {index + 1}
        </div>

        {/* Color dot */}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
          backgroundColor: dotColor,
        }} />

        {/* Status name — very short truncation */}
        <span title={name} style={{
          fontFamily: FONT.body, fontWeight: 500, fontSize: '12px',
          color: C.textPrimary, maxWidth: '100px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {name}
        </span>

        {/* Reorder arrows */}
        <button type="button" title="Move earlier" onClick={onMoveUp} disabled={disabled || isFirst} style={iconBtn(!disabled && !isFirst ? C.textSecondary : '#ddd', onMoveUp, 'bi-chevron-left', 'Move earlier', !disabled && !isFirst)}>
          <AppIcon name="bi-chevron-left" className="fs-9" />
        </button>
        <button type="button" title="Move later" onClick={onMoveDown} disabled={disabled || isLast} style={iconBtn(!disabled && !isLast ? C.textSecondary : '#ddd', onMoveDown, 'bi-chevron-right', 'Move later', !disabled && !isLast)}>
          <AppIcon name="bi-chevron-right" className="fs-9" />
        </button>

        {/* Edit button */}
        <button type="button" title="Edit" onClick={onEdit} style={iconBtn('#4f82c4', onEdit, 'bi-pencil', 'Edit', true)}>
          <AppIcon name="bi-pencil" className="fs-9" />
        </button>

        {/* Delete button */}
        <button type="button" title="Delete" onClick={onDelete} style={iconBtn(C.danger, onDelete, 'bi-trash', 'Delete', true)}>
          <AppIcon name="bi-trash" className="fs-9" />
        </button>
      </div>

      {/* Connector arrow */}
      {!isLast && (
        <AppIcon name="bi-chevron-right" className="fs-8" color="#D1D5E0" style={{ margin: '0 3px', flexShrink: 0 }} />
      )}
    </div>
  );
};

// ─── PaymentPlanChip ────────────────────────────────────────────────────────

const PaymentPlanChip: React.FC<{
  plan: PaymentPlan;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ plan, onEdit, onDelete }) => {
  const [hov, setHov] = useState(false);
  const stageCount = plan.stages?.length || 0;
  const total = (plan.stages || []).reduce(
    (sum, s) => sum + (parseFloat(String(s.percentage)) || 0),
    0,
  );
  const roundedTotal = Math.round(total * 1000) / 1000;
  const balanced = roundedTotal === 100;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        backgroundColor: hov ? '#ffffff' : '#f7f8fa',
        border: `1px solid ${hov ? '#d1d5e0' : '#eaecf0'}`,
        borderRadius: RADIUS.lg,
        padding: '12px 14px',
        transition: 'all 0.15s ease',
        boxShadow: hov ? '0 4px 14px rgba(24,28,50,0.09)' : '0 1px 3px rgba(24,28,50,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: FONT.body, fontWeight: 600, fontSize: '13px', color: C.textPrimary,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {plan.name}
            </span>
            {plan.isDefault && (
              <span style={{
                fontFamily: FONT.body, fontSize: '9px', fontWeight: 700, color: '#0A5C2A',
                background: '#EDFDF3', border: '1px solid #17C96433', borderRadius: '999px',
                padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0,
                textTransform: 'uppercase', letterSpacing: '0.4px',
              }}>
                Default
              </span>
            )}
          </div>
          <div style={{ marginTop: 4, fontFamily: FONT.body, fontSize: '11.5px', color: C.textMuted }}>
            {stageCount} stage{stageCount === 1 ? '' : 's'}
            {' · '}
            <span style={{ color: balanced ? '#0A5C2A' : C.danger, fontWeight: 600 }}>
              {roundedTotal}%
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: hov ? 1 : 0.35, transition: 'opacity 0.15s ease' }}>
          <button
            onClick={onEdit}
            style={{
              background: hov ? '#eff6ff' : 'transparent', border: 'none', borderRadius: RADIUS.sm,
              padding: '4px 7px', cursor: 'pointer', color: '#4f82c4', display: 'flex', alignItems: 'center',
            }}
          >
            <i className="bi bi-pencil" style={{ fontSize: '11px' }} />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: hov ? '#fff5f8' : 'transparent', border: 'none', borderRadius: RADIUS.sm,
              padding: '4px 7px', cursor: 'pointer', color: C.danger, display: 'flex', alignItems: 'center',
            }}
          >
            <i className="bi bi-trash" style={{ fontSize: '11px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ChipGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: SP.sm, marginTop: SP.md }}>
    {children}
  </div>
);

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ textAlign: 'center', padding: '28px 16px', color: C.textMuted, fontFamily: FONT.body, fontSize: '13px' }}>
    <AppIcon name="bi-inbox" className="fs-2qx" style={{ display: 'block', marginBottom: '8px', opacity: 0.4 }} />
    No {label} configured yet
  </div>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: ConfigTab[] = [
  { id: 'settings', label: 'Project Settings', icon: 'bi-kanban' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProjectConfigurationProps {
  /**
   * Render the settings sections on their own, without the page header and tab
   * bar. Lets another configuration page host the real project config instead of
   * duplicating it — see the Project Settings tab in Lead Configuration.
   */
  embedded?: boolean;
}

const ProjectConfiguration = ({ embedded = false }: ProjectConfigurationProps = {}) => {
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState<ProjectItem[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectItem | null>(null);
  const [reorderingStatus, setReorderingStatus] = useState(false);

  const [stakeholders, setStakeholders] = useState<ProjectItem[]>([]);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);
  const [editingStakeholder, setEditingStakeholder] = useState<ProjectItem | null>(null);

  const [projectServices, setProjectServices] = useState<ProjectItem[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ProjectItem | null>(null);

  const [projectCategories, setProjectCategories] = useState<ProjectItem[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectItem | null>(null);

  const [projectSubcategories, setProjectSubcategories] = useState<ProjectItem[]>([]);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<ProjectItem | null>(null);

  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [editingPaymentPlan, setEditingPaymentPlan] = useState<PaymentPlan | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStatusModalOpen = () => setShowStatusModal(true);
  const handleStatusModalClose = () => { setShowStatusModal(false); setEditingStatus(null); };
  const handleStatusEdit = (s: ProjectItem) => { setEditingStatus(s); setShowStatusModal(true); };

  // Next status appends to the END of the flow (max existing sortOrder + 1),
  // so a freshly created status never jumps ahead of the ones already ordered.
  const nextStatusSortOrder = projectStatuses.length
    ? Math.max(...projectStatuses.map((s) => s.sortOrder ?? 0)) + 1
    : 0;

  // Swap two adjacent statuses in the flow and persist the WHOLE list's positions
  // (not just the two touched) so legacy rows still sharing the default
  // sortOrder of 0 get normalized to distinct positions on the first reorder.
  const moveStatus = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= projectStatuses.length || reorderingStatus) return;
    const reordered = [...projectStatuses];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setProjectStatuses(reordered); // optimistic
    setReorderingStatus(true);
    try {
      await Promise.all(reordered.map((s, i) => updateProjectStatus(s.id, { sortOrder: i })));
      eventBus.emit(EVENT_KEYS.projectStatusUpdated, { id: 'reordered' });
    } catch (error) {
      console.error('Error reordering project statuses:', error);
      fetchProjectStatuses(); // revert to server truth on failure
    } finally {
      setReorderingStatus(false);
    }
  };

  const handleStakeholderModalOpen = () => setShowStakeholderModal(true);
  const handleStakeholderModalClose = () => { setShowStakeholderModal(false); setEditingStakeholder(null); };
  const handleStakeholderEdit = (s: ProjectItem) => { setEditingStakeholder(s); setShowStakeholderModal(true); };

  const handleServiceModalOpen = () => setShowServiceModal(true);
  const handleServiceModalClose = () => { setShowServiceModal(false); setEditingService(null); };
  const handleServiceEdit = (s: ProjectItem) => { setEditingService(s); setShowServiceModal(true); };

  const handleCategoryModalOpen = () => setShowCategoryModal(true);
  const handleCategoryModalClose = () => { setShowCategoryModal(false); setEditingCategory(null); };
  const handleCategoryEdit = (c: ProjectItem) => { setEditingCategory(c); setShowCategoryModal(true); };

  const handleSubcategoryModalOpen = () => setShowSubcategoryModal(true);
  const handleSubcategoryModalClose = () => { setShowSubcategoryModal(false); setEditingSubcategory(null); };
  const handleSubcategoryEdit = (s: ProjectItem) => { setEditingSubcategory(s); setShowSubcategoryModal(true); };

  const handlePaymentPlanModalOpen = () => { setEditingPaymentPlan(null); setShowPaymentPlanModal(true); };
  const handlePaymentPlanModalClose = () => { setShowPaymentPlanModal(false); setEditingPaymentPlan(null); };
  const handlePaymentPlanEdit = (p: PaymentPlan) => { setEditingPaymentPlan(p); setShowPaymentPlanModal(true); };

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchProjectStatuses = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectStatuses();
      if (response?.projectStatuses) {
        // Configured flow position first (what the reorder controls write); name
        // as a tiebreaker for statuses still sharing the default sortOrder of 0.
        const sorted = [...response.projectStatuses].sort((a: any, b: any) => {
          const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          return byOrder !== 0 ? byOrder : (a.name || '').localeCompare(b.name || '');
        });
        setProjectStatuses(sorted);
      }
    } catch (error) { console.error('Error fetching project statuses:', error); }
    finally { setLoading(false); }
  };

  const fetchStakeholders = async () => {
    try {
      setLoading(true);
      const response = await getAllStakeholders();
      if (response?.stakeholderServices) {
        const sorted = [...response.stakeholderServices].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setStakeholders(sorted);
      }
    } catch (error) { console.error('Error fetching stakeholders:', error); }
    finally { setLoading(false); }
  };

  const fetchProjectServices = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectServices();
      if (response?.services) {
        const sorted = [...response.services].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setProjectServices(sorted);
      }
    } catch (error) { console.error('Error fetching project services:', error); }
    finally { setLoading(false); }
  };

  const fetchProjectCategories = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectCategories();
      if (response?.projectCategories) setProjectCategories(response.projectCategories);
    } catch (error) { console.error('Error fetching project categories:', error); }
    finally { setLoading(false); }
  };

  const fetchProjectSubcategories = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectSubcategories();
      if (response?.projectSubCategories) setProjectSubcategories(response.projectSubCategories);
    } catch (error) { console.error('Error fetching project subcategories:', error); }
    finally { setLoading(false); }
  };

  const fetchPaymentPlans = async () => {
    try {
      setLoading(true);
      const response = await getAllPaymentPlans();
      if (response?.paymentPlans) setPaymentPlans(response.paymentPlans);
    } catch (error) {
      console.error('Error fetching payment plans:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete handlers ─────────────────────────────────────────────────────────

  const handleDelete = async (id: string, type: 'category' | 'subcategory' | 'service' | 'status' | 'stakeholder') => {
    try {
      const confirmed = await deleteConfirmation(`Successfully deleted ${type}`);
      if (!confirmed) return;
      switch (type) {
        case 'category': await deleteProjectCategory(id); fetchProjectCategories(); break;
        case 'subcategory': await deleteProjectSubcategory(id); fetchProjectSubcategories(); break;
        case 'service': await deleteProjectService(id); fetchProjectServices(); break;
        case 'status': await deleteProjectStatus(id); fetchProjectStatuses(); break;
        case 'stakeholder': await deleteStakeholderService(id); fetchStakeholders(); break;
      }
    } catch (error) { console.error(`Error deleting ${type}:`, error); }
  };

  const serviceDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => { await deleteProjectService(itemId, targetId); },
    defaultConfig: { entityName: 'Project Service', entityDisplayName: '', showTransferOption: true, transferDescription: 'All projects and leads using this service will be transferred to the selected service.' },
    onSuccess: () => { fetchProjectServices(); },
    onError: (error: any) => { console.error('Failed to delete project service:', error); alert('Failed to delete project service'); },
  });

  const handleServiceDelete = (id: string) => {
    const serviceToDelete = projectServices.find(s => s.id === id);
    const dropdownOptions: DropdownOption[] = projectServices
      .filter(s => s.id !== id && s.id && s.name)
      .map(s => ({ key: s.id!, value: s.name }));
    serviceDeleteConfirmation.showDeleteModal(id, serviceToDelete?.name || 'Unknown Service', {
      dropdownOptions,
      showTransferOption: dropdownOptions.length > 0,
      transferDescription: dropdownOptions.length > 0
        ? 'All projects and leads using this service will be transferred to the selected service.'
        : 'This is the last service and cannot be transferred.',
    });
  };

  const handlePaymentPlanDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation('Payment plan deleted successfully');
      if (!confirmed) return;
      await deletePaymentPlan(id);
      fetchPaymentPlans();
    } catch (error) {
      console.error('Error deleting payment plan:', error);
    }
  };

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProjectStatuses();
    fetchStakeholders();
    fetchProjectServices();
    fetchProjectCategories();
    fetchProjectSubcategories();
    fetchPaymentPlans();
  }, []);

  useEventBus(EVENT_KEYS.projectCategoryCreated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectSubcategoryCreated, fetchProjectSubcategories);
  useEventBus(EVENT_KEYS.projectServiceCreated, fetchProjectServices);
  useEventBus(EVENT_KEYS.projectStatusCreated, fetchProjectStatuses);
  useEventBus(EVENT_KEYS.projectCategoryUpdated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectSubcategoryUpdated, fetchProjectSubcategories);
  useEventBus(EVENT_KEYS.projectServiceUpdated, fetchProjectServices);
  useEventBus(EVENT_KEYS.projectStatusUpdated, fetchProjectStatuses);
  useEventBus(EVENT_KEYS.stakeholderCreated, fetchStakeholders);
  useEventBus(EVENT_KEYS.stakeholderUpdated, fetchStakeholders);
  useEventBus(EVENT_KEYS.paymentPlanCreated, fetchPaymentPlans);
  useEventBus(EVENT_KEYS.paymentPlanUpdated, fetchPaymentPlans);
  useEventBus(EVENT_KEYS.paymentPlanDeleted, fetchPaymentPlans);

  // ── Render ──────────────────────────────────────────────────────────────────

  // The settings themselves, independent of the page chrome, so they can be
  // rendered standalone here or hosted inside another configuration page.
  const settingsSections = (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

            {/* 1. Project Prefix Settings — Auto-Numbering (TOP PRIORITY) */}
            <ConfigSectionCard
              title="Project Prefix Settings"
              description="Configure the auto-generated prefix format for new project IDs."
              icon="bi-hash"
              iconColor="amber"
              loading={loading}
            >
              <PrefixSettingsForm typeLabel="Project" typeValue="PROJECT" />
            </ConfigSectionCard>

            {/* 2. Project Status — Core */}
            <ConfigSectionCard
              title="Project Status"
              description="Define the order a project moves through — use the arrows to set the flow."
              icon="bi-flag"
              iconColor="primary"
              primaryAction={{ label: 'New Status', icon: 'bi-plus-lg', onClick: handleStatusModalOpen, variant: 'primary' }}
              loading={loading}
            >
              {projectStatuses.length === 0
                ? <EmptyState label="project statuses" />
                : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: SP.md }}>
                    {projectStatuses.map((s, i) => (
                      <StatusFlowRow
                        key={s.id}
                        index={i}
                        total={projectStatuses.length}
                        name={s.name}
                        color={s.color}
                        disabled={reorderingStatus}
                        onMoveUp={() => moveStatus(i, 'up')}
                        onMoveDown={() => moveStatus(i, 'down')}
                        onEdit={() => handleStatusEdit(s)}
                        onDelete={() => handleDelete(s.id, 'status')}
                      />
                    ))}
                  </div>
                )
              }
            </ConfigSectionCard>

            {/* 3. Payment Plans — Financial Configuration */}
            <ConfigSectionCard
              title="Payment Plans"
              description="Define stage-wise fee break-up plans. On a project, selecting a plan auto-splits the total commercial cost across its stages by percentage."
              icon="bi-cash-stack"
              iconColor="green"
              primaryAction={{
                label: 'New Plan',
                icon: 'bi-plus-lg',
                onClick: handlePaymentPlanModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {paymentPlans.length === 0
                ? <EmptyState label="payment plans" />
                : (
                  <ChipGrid>
                    {paymentPlans.map((plan) => (
                      <PaymentPlanChip
                        key={plan.id}
                        plan={plan}
                        onEdit={() => handlePaymentPlanEdit(plan)}
                        onDelete={() => handlePaymentPlanDelete(plan.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* 4. Stakeholders Services — Team Management */}
            <ConfigSectionCard
              title="Stakeholders Services"
              description="Configure stakeholder service types for project assignments."
              icon="bi-person-badge"
              iconColor="blue"
              primaryAction={{ label: 'New Stakeholder', icon: 'bi-plus-lg', onClick: handleStakeholderModalOpen, variant: 'primary' }}
              loading={loading}
            >
              {stakeholders.length === 0
                ? <EmptyState label="stakeholders" />
                : (
                  <ChipGrid>
                    {stakeholders.map((s) => (
                      <ColorChip
                        key={s.id} name={s.name} color={s.color}
                        onEdit={() => handleStakeholderEdit(s)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>
          </div>
  );

  return (
    <>
      {!embedded && <style>{KEYFRAMES}</style>}
      {embedded ? (
        settingsSections
      ) : (
        <ConfigPageLayout
          title="Project Configuration"
          subtitle="Manage project statuses, stakeholders, prefix, and UI settings"
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {activeTab === 'settings' && settingsSections}
        </ConfigPageLayout>
      )}

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}

      <ProjectConfigForm
        show={showStatusModal}
        onClose={handleStatusModalClose}
        onSuccess={fetchProjectStatuses}
        type="status"
        title="Status"
        isEditing={!!editingStatus}
        initialData={editingStatus}
        defaultSortOrder={nextStatusSortOrder}
      />
      <ProjectConfigForm
        show={showStakeholderModal}
        onClose={handleStakeholderModalClose}
        onSuccess={fetchStakeholders}
        type="stakeholder"
        title="Stakeholder"
        isEditing={!!editingStakeholder}
        initialData={editingStakeholder}
      />
      <ProjectConfigForm
        show={showServiceModal}
        onClose={handleServiceModalClose}
        onSuccess={fetchProjectServices}
        type="service"
        title="Service"
        isEditing={!!editingService}
        initialData={editingService}
      />
      <ProjectConfigForm
        show={showCategoryModal}
        onClose={handleCategoryModalClose}
        onSuccess={fetchProjectCategories}
        initialData={editingCategory}
        isEditing={!!editingCategory}
        type="category"
        title="Category"
      />
      <ProjectConfigForm
        show={showSubcategoryModal}
        onClose={handleSubcategoryModalClose}
        onSuccess={fetchProjectSubcategories}
        initialData={editingSubcategory}
        isEditing={!!editingSubcategory}
        type="subcategory"
        title="Subcategory"
      />

      <PaymentPlanModal
        show={showPaymentPlanModal}
        onClose={handlePaymentPlanModalClose}
        onSuccess={fetchPaymentPlans}
        initialData={editingPaymentPlan}
        isEditing={!!editingPaymentPlan}
      />

      {serviceDeleteConfirmation.DeleteModal}
    </>
  );
};

export default ProjectConfiguration;
