import { getAllLeadStatus, deleteLeadStatus, getAllLeadReferralType, deleteLeadReferralType, getAllLeadDirectSource, deleteLeadDirectSource, getAllLeadCancellationReasons, deleteLeadCancellationReason, getAllLeadPoStatuses, deleteLeadPoStatus } from "@services/lead";
import { getAllMeetingSchedules, deleteMeetingSchedule } from "@services/meetingSchedule";
import MeetingScheduleModal from "./components/MeetingScheduleModal";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import PerOrgPrefixSettings from "@app/modules/common/components/PerOrgPrefixSettings";
import ProjectConfiguration from "../../projects/configure/ProjectConfigure";
import { fetchAllPrefixSettings, createPrefixSetting, updatePrefixSetting } from "@services/options";

import { getAllProjectServices, deleteProjectService } from "@services/projects";
import React, { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { Link } from "react-router-dom";
import LeadsConfigForm from "./components/LeadsConfigForm";
import CategoryTreeExplorer from "./components/CategoryTreeExplorer";
import { LeadDirectSource, LeadReferralType, LeadStatus, LeadCancellationReason, LeadPoStatus, MeetingScheduleType } from "@models/leads";
import { ProjectItem } from "@models/clientProject";
import { useDeleteConfirmation } from "../../../../../hooks/useDeleteConfirmation";
import { DropdownOption } from "../../../../../types/deleteConfirmation";
import ProjectConfigForm from "../../projects/configure/components/ProjectConfigForm";
import {
  getAllProjectCategories,
  getAllProjectSubcategories,
  deleteProjectCategory,
  deleteProjectSubcategory,
} from "@services/projects";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  ConfigColorChip,
  ConfigChipGrid,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';
import { ProjectPointsConfigSection } from '@app/modules/projectPoints';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

/**
 * One delete flow for every list on this screen: confirm, optionally transfer, then
 * delete — the dialog Direct Source and Service already used, now used by all of them.
 *
 * Why every list needs the transfer option, not just a refusal: the server now stops
 * you deleting an option that records still point at, which on its own is a dead end
 * ("used by 12 leads" — and then what?). Offering the replacement in the same dialog
 * turns that into one action. The reassignment happens server-side before the guard
 * runs, so the delete either moves everything and succeeds, or moves nothing and is
 * refused; it cannot half-happen.
 *
 * Named `use…` because it calls a hook — invoked unconditionally, once per list, in a
 * fixed order, which is what keeps the hook order stable across renders.
 */
const useConfigDelete = (
  entityName: string,
  transferDescription: string,
  remove: (id: string, targetId?: string) => Promise<unknown>,
  refresh: () => void,
) => useDeleteConfirmation({
  deleteFunction: async (id: string, targetId?: string) => { await remove(id, targetId); },
  defaultConfig: {
    entityName,
    entityDisplayName: '',
    showTransferOption: true,
    transferDescription,
  },
  onSuccess: refresh,
  // No onError: the hook's default surfaces the server's own sentence, which names
  // the records still using this option. Anything bespoke here would say less.
});

/** The OTHER entries in the same list — what a transfer can move to. */
const alternatives = <T extends { id?: string }>(
  items: T[], excludeId: string, label: (item: T) => string,
): DropdownOption[] =>
  items.filter((i) => i.id && i.id !== excludeId).map((i) => ({ key: i.id!, value: label(i) }));

// ─── ColorChip ────────────────────────────────────────────────────────────────

interface ColorChipProps {
  name: string;
  color: string;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Adapter over the shared `ConfigColorChip`, which is this chip — the hand-rolled
 * copy that used to live here was lifted into the configuration module so Billing
 * Configure renders the identical row from the identical code. Kept as a named
 * wrapper only so the six call sites below keep their `onDelete` shape.
 */
const ColorChip: React.FC<ColorChipProps> = ({ name, color, onEdit, onDelete }) => (
  <ConfigColorChip
    name={name}
    color={color}
    onEdit={onEdit}
    action={{ icon: 'bi-trash', title: `Delete ${name}`, danger: true, onClick: onDelete }}
  />
);

// ─── ChipGrid ─────────────────────────────────────────────────────────────────

const ChipGrid = ConfigChipGrid;

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    textAlign: 'center',
    padding: '28px 16px',
    color: C.textMuted,
    fontFamily: FONT.body,
    fontSize: '13px',
  }}>
    <AppIcon name="bi-inbox" className="fs-2qx" style={{ display: 'block', marginBottom: '8px', opacity: 0.4 }} />
    No {label} configured yet
  </div>
);

// ─── MeetingScheduleChip ────────────────────────────────────────────────────────

const MeetingScheduleChip: React.FC<{
  schedule: MeetingScheduleType;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ schedule, onEdit, onDelete }) => {
  const [hov, setHov] = useState(false);
  const bracketCount = schedule.brackets?.length || 0;

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
              {schedule.name}
            </span>
            {schedule.isDefault && (
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
            {bracketCount} area bracket{bracketCount === 1 ? '' : 's'}
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
            <AppIcon name="bi-pencil" className="fs-8" />
          </button>
          <button
            onClick={onDelete}
            style={{
              background: hov ? '#fff5f8' : 'transparent', border: 'none', borderRadius: RADIUS.sm,
              padding: '4px 7px', cursor: 'pointer', color: C.danger, display: 'flex', alignItems: 'center',
            }}
          >
            <AppIcon name="bi-trash" className="fs-8" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const sortItemsAlphabetically = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name));

const sortCancellationReasonsAlphabetically = (reasons: any[]) =>
  [...reasons].sort((a, b) => a.reason.localeCompare(b.reason));

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: ConfigTab[] = [
  { id: 'lead', label: 'Lead Settings', icon: 'bi-funnel' },
  { id: 'project', label: 'Project Settings', icon: 'bi-kanban' },
  { id: 'templates', label: 'Templates', icon: 'bi-file-earmark-text' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const LeadsConfigurationMain = () => {
  const [activeTab, setActiveTab] = useState('lead');
  const [loading, setLoading] = useState(false);

  // Lead states
  const [leadStatus, setLeadStatus] = useState<LeadStatus[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);

  const [leadReferralType, setLeadReferralType] = useState<LeadReferralType[]>([]);
  const [showReferralTypeModal, setShowReferralTypeModal] = useState(false);
  const [editingReferralType, setEditingReferralType] = useState<LeadReferralType | null>(null);

  const [leadDirectSource, setLeadDirectSource] = useState<LeadDirectSource[]>([]);
  const [showDirectSourceModal, setShowDirectSourceModal] = useState(false);
  const [editingDirectSource, setEditingDirectSource] = useState<LeadDirectSource | null>(null);

  const [leadCancellationReasons, setLeadCancellationReasons] = useState<LeadCancellationReason[]>([]);
  const [showCancellationReasonModal, setShowCancellationReasonModal] = useState(false);
  const [editingCancellationReason, setEditingCancellationReason] = useState<LeadCancellationReason | null>(null);

  const [leadPoStatuses, setLeadPoStatuses] = useState<LeadPoStatus[]>([]);
  const [showPoStatusModal, setShowPoStatusModal] = useState(false);
  const [editingPoStatus, setEditingPoStatus] = useState<LeadPoStatus | null>(null);

  const [meetingSchedules, setMeetingSchedules] = useState<MeetingScheduleType[]>([]);
  const [showMeetingScheduleModal, setShowMeetingScheduleModal] = useState(false);
  const [editingMeetingSchedule, setEditingMeetingSchedule] = useState<MeetingScheduleType | null>(null);

  // Project states
  const [projectServices, setProjectServices] = useState<ProjectItem[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ProjectItem | null>(null);

  const [projectCategories, setProjectCategories] = useState<ProjectItem[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProjectItem | null>(null);

  const [projectSubcategories, setProjectSubcategories] = useState<ProjectItem[]>([]);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<ProjectItem | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleModalClose = () => { setShowModal(false); setEditingStatus(null); };
  const handleModalOpen = () => setShowModal(true);
  const handleEdit = (status: LeadStatus) => { setEditingStatus(status); setShowModal(true); };

  const handleReferralTypeModalOpen = () => setShowReferralTypeModal(true);
  const handleReferralTypeModalClose = () => { setShowReferralTypeModal(false); setEditingReferralType(null); };
  const handleReferralTypeEdit = (r: LeadReferralType) => { setEditingReferralType(r); setShowReferralTypeModal(true); };

  const handleDirectSourceModalOpen = () => setShowDirectSourceModal(true);
  const handleDirectSourceModalClose = () => { setShowDirectSourceModal(false); setEditingDirectSource(null); };
  const handleDirectSourceEdit = (s: LeadDirectSource) => { setEditingDirectSource(s); setShowDirectSourceModal(true); };

  const handleCancellationReasonModalOpen = () => setShowCancellationReasonModal(true);
  const handleCancellationReasonModalClose = () => { setShowCancellationReasonModal(false); setEditingCancellationReason(null); };
  const handleCancellationReasonEdit = (r: LeadCancellationReason) => { setEditingCancellationReason(r); setShowCancellationReasonModal(true); };

  const handlePoStatusModalOpen = () => setShowPoStatusModal(true);
  const handlePoStatusModalClose = () => { setShowPoStatusModal(false); setEditingPoStatus(null); };
  const handlePoStatusEdit = (s: LeadPoStatus) => { setEditingPoStatus(s); setShowPoStatusModal(true); };

  const handleMeetingScheduleModalOpen = () => { setEditingMeetingSchedule(null); setShowMeetingScheduleModal(true); };
  const handleMeetingScheduleModalClose = () => { setShowMeetingScheduleModal(false); setEditingMeetingSchedule(null); };
  const handleMeetingScheduleEdit = (m: MeetingScheduleType) => { setEditingMeetingSchedule(m); setShowMeetingScheduleModal(true); };

  const handleServiceModalOpen = () => setShowServiceModal(true);
  const handleServiceModalClose = () => { setShowServiceModal(false); setEditingService(null); };
  const handleServiceEdit = (s: ProjectItem) => { setEditingService(s); setShowServiceModal(true); };

  const handleCategoryModalOpen = () => setShowCategoryModal(true);
  const handleSubcategoryModalOpen = () => setShowSubcategoryModal(true);
  const handleCategoryEdit = (c: ProjectItem) => { setEditingCategory(c); setShowCategoryModal(true); };
  const handleSubcategoryEdit = (s: ProjectItem) => { setEditingSubcategory(s); setShowSubcategoryModal(true); };

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchLeadStatuses = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadStatus();
      if (response?.leadStatuses) {
        const sorted = [...response.leadStatuses].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setLeadStatus(sorted);
      }
    } catch (error) {
      console.error('Error fetching lead statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadReferralTypes = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadReferralType();
      if (response?.leadReferralTypes) {
        const sorted = [...response.leadReferralTypes].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setLeadReferralType(sorted);
      }
    } catch (error) {
      console.error('Error fetching lead referral types:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadDirectSources = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadDirectSource();
      if (response?.leadDirectSources) {
        const sorted = [...response.leadDirectSources].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setLeadDirectSource(sorted);
      }
    } catch (error) {
      console.error('Error fetching lead direct sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadCancellationReasons = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadCancellationReasons();
      if (response?.data?.leadCancellationReasons) {
        setLeadCancellationReasons(response.data.leadCancellationReasons);
      }
    } catch (error) {
      console.error('Error fetching lead cancellation reasons:', error);
    } finally {
      setLoading(false);
    }
  };

  // Not sorted alphabetically, unlike the lists above: PO Status is a lifecycle
  // (Pending → Approved / Rejected), so the order the admin created them in is the order
  // that reads correctly in the dropdown. The API returns them oldest-first.
  const fetchLeadPoStatuses = async () => {
    try {
      setLoading(true);
      const response = await getAllLeadPoStatuses();
      const rows = response?.data?.leadPoStatuses ?? response?.leadPoStatuses;
      if (rows) setLeadPoStatuses(rows);
    } catch (error) {
      console.error('Error fetching lead PO statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetingSchedules = async () => {
    try {
      setLoading(true);
      const response = await getAllMeetingSchedules();
      if (response?.meetingSchedules) setMeetingSchedules(response.meetingSchedules);
    } catch (error) {
      console.error('Error fetching meeting schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectServices = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectServices();
      if (response?.services) setProjectServices(response.services);
    } catch (error) {
      console.error('Error fetching project services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectCategories = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectCategories();
      if (response?.projectCategories) setProjectCategories(response.projectCategories);
    } catch (error) {
      console.error('Error fetching project categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSubcategories = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectSubcategories();
      if (response?.projectSubCategories) setProjectSubcategories(response.projectSubCategories);
    } catch (error) {
      console.error('Error fetching project subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Delete handlers ─────────────────────────────────────────────────────────

  // ── Delete confirmation hooks ────────────────────────────────────────────────

  const statusDelete = useConfigDelete(
    'Lead Status', 'All leads in this status will be moved to the selected status.',
    deleteLeadStatus, fetchLeadStatuses);

  const referralTypeDelete = useConfigDelete(
    'Referral Type', 'All referrals of this type will be moved to the selected type.',
    deleteLeadReferralType, fetchLeadReferralTypes);

  const cancellationReasonDelete = useConfigDelete(
    'Cancellation Reason', 'All leads cancelled for this reason will be moved to the selected reason.',
    deleteLeadCancellationReason, fetchLeadCancellationReasons);

  const poStatusDelete = useConfigDelete(
    'PO Status', 'All leads carrying this PO status will be moved to the selected status.',
    deleteLeadPoStatus, () => {
      eventBus.emit(EVENT_KEYS.leadPoStatusDeleted, {});
      fetchLeadPoStatuses();
    });

  const meetingScheduleDelete = useConfigDelete(
    'Meeting Schedule', 'All leads on this schedule will be moved to the selected schedule.',
    deleteMeetingSchedule, fetchMeetingSchedules);

  const categoryDelete = useConfigDelete(
    'Category', 'All leads, subcategories and payment plans under this category will be moved to the selected category.',
    deleteProjectCategory, fetchProjectCategories);

  const subcategoryDelete = useConfigDelete(
    'Subcategory', 'All leads under this subcategory will be moved to the selected subcategory.',
    deleteProjectSubcategory, () => {
      void Promise.all([fetchProjectSubcategories(), fetchProjectCategories()]);
    });

  // ── Delete handlers — open the dialog with this list's other entries ─────────

  const handleDelete = (id: string) => statusDelete.showDeleteModal(
    id, leadStatus.find((s) => s.id === id)?.name ?? 'this status',
    { dropdownOptions: alternatives(leadStatus, id, (s) => s.name) });

  const handleReferralTypeDelete = (id: string) => referralTypeDelete.showDeleteModal(
    id, leadReferralType.find((r) => r.id === id)?.name ?? 'this referral type',
    { dropdownOptions: alternatives(leadReferralType, id, (r) => r.name) });

  const handleCancellationReasonDelete = (id: string) => cancellationReasonDelete.showDeleteModal(
    id, leadCancellationReasons.find((r) => r.id === id)?.reason ?? 'this reason',
    { dropdownOptions: alternatives(leadCancellationReasons, id, (r) => r.reason) });

  const handlePoStatusDelete = (id: string) => poStatusDelete.showDeleteModal(
    id, leadPoStatuses.find((s) => s.id === id)?.name ?? 'this PO status',
    { dropdownOptions: alternatives(leadPoStatuses, id, (s) => s.name) });

  const handleMeetingScheduleDelete = (id: string) => meetingScheduleDelete.showDeleteModal(
    id, meetingSchedules.find((m) => m.id === id)?.name ?? 'this schedule',
    { dropdownOptions: alternatives(meetingSchedules, id, (m) => m.name) });

  const handleCategoryDelete = (id: string) => categoryDelete.showDeleteModal(
    id, projectCategories.find((c) => c.id === id)?.name ?? 'this category',
    { dropdownOptions: alternatives(projectCategories, id, (c) => c.name) });

  const handleSubcategoryDelete = (id: string) => subcategoryDelete.showDeleteModal(
    id, projectSubcategories.find((s) => s.id === id)?.name ?? 'this subcategory',
    { dropdownOptions: alternatives(projectSubcategories, id, (s) => s.name) });

  const directSourceDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => {
      await deleteLeadDirectSource(itemId, targetId);
    },
    defaultConfig: {
      entityName: 'Lead Direct Source',
      entityDisplayName: '',
      showTransferOption: true,
      transferDescription: 'All leads using this direct source will be transferred to the selected source.',
    },
    onSuccess: () => { fetchLeadDirectSources(); },
  });

  const serviceDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => {
      await deleteProjectService(itemId, targetId);
    },
    defaultConfig: {
      entityName: 'Project Service',
      entityDisplayName: '',
      showTransferOption: true,
      transferDescription: 'All projects and leads using this service will be transferred to the selected service.',
    },
    onSuccess: () => { fetchProjectServices(); },
  });

  const handleDirectSourceDelete = (id: string) => {
    const sourceToDelete = leadDirectSource.find(s => s.id === id);
    const dropdownOptions: DropdownOption[] = leadDirectSource
      .filter(s => s.id !== id && s.id && s.name)
      .map(s => ({ key: s.id!, value: s.name }));
    directSourceDeleteConfirmation.showDeleteModal(id, sourceToDelete?.name || 'Unknown Source', {
      dropdownOptions,
      showTransferOption: dropdownOptions.length > 0,
      transferDescription: dropdownOptions.length > 0
        ? 'All leads using this direct source will be transferred to the selected source.'
        : 'This is the last direct source and cannot be transferred.',
    });
  };

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

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchLeadStatuses(); }, []);
  useEffect(() => { fetchLeadReferralTypes(); }, []);
  useEffect(() => { fetchLeadDirectSources(); }, []);
  useEffect(() => { fetchLeadCancellationReasons(); }, []);
  useEffect(() => { fetchLeadPoStatuses(); }, []);
  useEffect(() => { fetchMeetingSchedules(); }, []);
  useEffect(() => { fetchProjectServices(); }, []);
  useEffect(() => { fetchProjectCategories(); fetchProjectSubcategories(); }, []);

  useEventBus(EVENT_KEYS.leadStatusCreated, fetchLeadStatuses);
  useEventBus(EVENT_KEYS.leadReferralTypeCreated, fetchLeadReferralTypes);
  useEventBus(EVENT_KEYS.leadDirectSourceCreated, fetchLeadDirectSources);
  useEventBus(EVENT_KEYS.leadCancellationReasonCreated, fetchLeadCancellationReasons);
  useEventBus(EVENT_KEYS.leadCancellationReasonUpdated, fetchLeadCancellationReasons);
  useEventBus(EVENT_KEYS.leadPoStatusCreated, fetchLeadPoStatuses);
  useEventBus(EVENT_KEYS.leadPoStatusUpdated, fetchLeadPoStatuses);
  useEventBus(EVENT_KEYS.meetingScheduleCreated, fetchMeetingSchedules);
  useEventBus(EVENT_KEYS.meetingScheduleUpdated, fetchMeetingSchedules);
  useEventBus(EVENT_KEYS.meetingScheduleDeleted, fetchMeetingSchedules);
  useEventBus(EVENT_KEYS.projectServiceCreated, fetchProjectServices);
  useEventBus(EVENT_KEYS.projectServiceUpdated, fetchProjectServices);
  useEventBus(EVENT_KEYS.projectCategoryCreated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectCategoryUpdated, fetchProjectCategories);
  useEventBus(EVENT_KEYS.projectSubcategoryCreated, () => { fetchProjectSubcategories(); fetchProjectCategories(); });
  useEventBus(EVENT_KEYS.projectSubcategoryUpdated, () => { fetchProjectSubcategories(); fetchProjectCategories(); });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Lead Configuration"
        subtitle="Everything the lead form offers, plus the project configuration leads convert into"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {/* ── Lead Settings Tab ───────────────────────────────────────────────── */}
        {activeTab === 'lead' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

            {/* 1. Lead Prefix Settings — Auto-Numbering (TOP PRIORITY) */}
            <ConfigSectionCard
              title="Lead Prefix Settings"
              description="Set each organization's lead prefix. New leads are numbered using the prefix of the organization they are created in."
              icon="bi-hash"
              iconColor="amber"
              loading={loading}
            >
              <PerOrgPrefixSettings typeLabel="Lead" typeValue="LEAD" />
            </ConfigSectionCard>

            {/* 2. Lead Status — Core */}
            <ConfigSectionCard
              title="Lead Status"
              description="Define the stages a lead moves through during the sales process."
              icon="bi-flag"
              iconColor="primary"
              primaryAction={{
                label: 'New Status',
                icon: 'bi-plus-lg',
                onClick: handleModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {leadStatus.length === 0
                ? <EmptyState label="statuses" />
                : (
                  <ChipGrid>
                    {leadStatus.map((s) => (
                      <ColorChip
                        key={s.id}
                        name={s.name}
                        color={s.color}
                        onEdit={() => handleEdit(s)}
                        onDelete={() => handleDelete(s.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* 2. Lead Direct Source — Lead Origin */}
            <ConfigSectionCard
              title="Lead Direct Source"
              description="Track where leads are originating from to measure channel effectiveness."
              icon="bi-broadcast"
              iconColor="teal"
              primaryAction={{
                label: 'New Source',
                icon: 'bi-plus-lg',
                onClick: handleDirectSourceModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {leadDirectSource.length === 0
                ? <EmptyState label="direct sources" />
                : (
                  <ChipGrid>
                    {leadDirectSource.map((s) => (
                      <ColorChip
                        key={s.id}
                        name={s.name}
                        color={s.color}
                        onEdit={() => handleDirectSourceEdit(s)}
                        onDelete={() => handleDirectSourceDelete(s.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* 3. Lead Referral Type — Lead Categorization */}
            <ConfigSectionCard
              title="Lead Referral Type"
              description="Categorize the type of referral that brought in a lead."
              icon="bi-people"
              iconColor="green"
              primaryAction={{
                label: 'New Referral Type',
                icon: 'bi-plus-lg',
                onClick: handleReferralTypeModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {leadReferralType.length === 0
                ? <EmptyState label="referral types" />
                : (
                  <ChipGrid>
                    {sortItemsAlphabetically(leadReferralType).map((r) => (
                      <ColorChip
                        key={r.id}
                        name={r.name}
                        color={r.color}
                        onEdit={() => handleReferralTypeEdit(r)}
                        onDelete={() => handleReferralTypeDelete(r.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* 4. Lead Cancellation Reasons — Edge Case */}
            <ConfigSectionCard
              title="Lead Cancellation Reasons"
              description="Specify why a lead may be cancelled to improve reporting and insights."
              icon="bi-x-circle"
              iconColor="danger"
              primaryAction={{
                label: 'New Reason',
                icon: 'bi-plus-lg',
                onClick: handleCancellationReasonModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {leadCancellationReasons.length === 0
                ? <EmptyState label="cancellation reasons" />
                : (
                  <ChipGrid>
                    {sortCancellationReasonsAlphabetically(leadCancellationReasons).map((r: LeadCancellationReason) => (
                      <ColorChip
                        key={r.id}
                        name={r.reason}
                        color={r.color}
                        onEdit={() => handleCancellationReasonEdit(r)}
                        onDelete={() => handleCancellationReasonDelete(r.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* 5. PO Status — Lead Form Fields */}
            <ConfigSectionCard
              title="PO Status"
              description="Options offered in the lead form's PO Status field, on the Purchase Order block of a received lead."
              icon="bi-receipt"
              iconColor="amber"
              primaryAction={{
                label: 'New PO Status',
                icon: 'bi-plus-lg',
                onClick: handlePoStatusModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {leadPoStatuses.length === 0
                ? <EmptyState label="PO statuses" />
                : (
                  <ChipGrid>
                    {leadPoStatuses.map((s) => (
                      <ColorChip
                        key={s.id}
                        name={s.name}
                        color={s.color}
                        onEdit={() => handlePoStatusEdit(s)}
                        onDelete={() => handlePoStatusDelete(s.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* 6. Services — Lead Form Fields */}
            <ConfigSectionCard
              title="Services"
              description="Service options offered in the lead form's Services field."
              icon="bi-gear"
              iconColor="blue"
              primaryAction={{
                label: 'New Service',
                icon: 'bi-plus-lg',
                onClick: handleServiceModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {projectServices.length === 0
                ? <EmptyState label="project services" />
                : (
                  <ChipGrid>
                    {sortItemsAlphabetically(projectServices).map((s) => (
                      <ColorChip
                        key={s.id}
                        name={s.name}
                        color={s.color}
                        onEdit={() => handleServiceEdit(s)}
                        onDelete={() => handleServiceDelete(s.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* 7. Categories & Subcategories — Lead Form Fields */}
            <ConfigSectionCard
              title="Categories & Subcategories"
              description="Options offered in the lead form's Categories and Sub Categories fields. Each category expands to show its subcategories inline."
              icon="bi-diagram-3"
              iconColor="purple"
              secondaryActions={[{
                label: 'New Subcategory',
                icon: 'bi-plus-lg',
                onClick: handleSubcategoryModalOpen,
                variant: 'secondary',
              }]}
              primaryAction={{
                label: 'New Category',
                icon: 'bi-plus-lg',
                onClick: handleCategoryModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {projectCategories.length === 0
                ? <EmptyState label="categories" />
                : (
                  <CategoryTreeExplorer
                    categories={projectCategories}
                    subcategories={projectSubcategories}
                    onCategoryEdit={handleCategoryEdit}
                    onCategoryDelete={handleCategoryDelete}
                    onSubcategoryEdit={handleSubcategoryEdit}
                    onSubcategoryDelete={handleSubcategoryDelete}
                    onAddSubcategory={handleSubcategoryModalOpen}
                  />
                )
              }
            </ConfigSectionCard>

            {/* 8. Project Points — Dynamic Master Templates */}
            <ProjectPointsConfigSection />

            {/* 9. Meeting Schedules — Project-Level Configuration */}
            <ConfigSectionCard
              title="Meeting Schedules"
              description="Define meeting schedules per project type with area brackets. On a lead, the total commercial area picks the bracket, and the completion year is derived from the inquiry date."
              icon="bi-calendar2-week"
              iconColor="teal"
              primaryAction={{
                label: 'New Schedule',
                icon: 'bi-plus-lg',
                onClick: handleMeetingScheduleModalOpen,
                variant: 'primary',
              }}
              loading={loading}
            >
              {meetingSchedules.length === 0
                ? <EmptyState label="meeting schedules" />
                : (
                  <ChipGrid>
                    {meetingSchedules.map((m) => (
                      <MeetingScheduleChip
                        key={m.id}
                        schedule={m}
                        onEdit={() => handleMeetingScheduleEdit(m)}
                        onDelete={() => handleMeetingScheduleDelete(m.id!)}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>
                    </div>
        )}

        {/* ── Project Settings Tab ────────────────────────────────────────────── */}
        {activeTab === 'project' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
            {/* The real project configuration, rendered from the Project
                Configuration page itself rather than copied, so editing it here
                and editing it there are the same thing. */}
            <ProjectConfiguration embedded />
          </div>
        )}

        {/* ── Templates Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
            <ConfigSectionCard
              title="Proposal Template Export Builder"
              description="Manage .docx templates, payment stages, and area-based rules for proposal generation."
              icon="bi-file-earmark-text"
              iconColor="purple"
            >
              <div style={{
                background: 'linear-gradient(135deg, #fafbfd 0%, #f3f4f9 100%)',
                borderRadius: RADIUS.lg,
                padding: SP.lg,
                display: 'flex',
                alignItems: 'flex-start',
                gap: SP.md,
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: RADIUS.lg,
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <AppIcon name="bi-file-earmark-word" className="fs-1" color="#7c3aed" />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: '14px', color: C.textPrimary, marginBottom: '4px' }}>
                    Template Builder
                  </div>
                  <div style={{ fontFamily: FONT.body, fontWeight: 400, fontSize: '12.5px', color: C.textMuted, lineHeight: 1.5 }}>
                    Create and manage Word (.docx) proposal templates with dynamic fields, payment stages, and area-based pricing rules. Templates are used when exporting proposals from leads.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: SP.sm, flexShrink: 0 }}>
                  <Link
                    to="/leads/documentation-builder"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: RADIUS.md,
                      border: `1px solid ${C.border}`,
                      backgroundColor: '#fff',
                      color: C.textPrimary,
                      fontFamily: FONT.body,
                      fontWeight: 500,
                      fontSize: '13px',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d1d5e0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(24,28,50,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <AppIcon name="bi-book" className="fs-7" />
                    Docs & Validation
                  </Link>
                  <Link
                    to="/leads/configuration"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: RADIUS.md,
                      border: 'none',
                      backgroundColor: C.primary,
                      color: '#fff',
                      fontFamily: FONT.body,
                      fontWeight: 600,
                      fontSize: '13px',
                      textDecoration: 'none',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                      boxShadow: `0 4px 12px ${C.primaryShadow}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 18px ${C.primaryShadowMd}`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 12px ${C.primaryShadow}`; }}
                  >
                    <AppIcon name="bi-box-arrow-up-right" className="fs-7" />
                    Open Builder
                  </Link>
                </div>
              </div>
            </ConfigSectionCard>
          </div>
        )}
      </ConfigPageLayout>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}

      <LeadsConfigForm
        show={showModal}
        onClose={handleModalClose}
        onSuccess={fetchLeadStatuses}
        initialData={editingStatus}
        isEditing={!!editingStatus}
        type="status"
        title="Status"
      />
      <LeadsConfigForm
        show={showReferralTypeModal}
        onClose={handleReferralTypeModalClose}
        onSuccess={fetchLeadReferralTypes}
        initialData={editingReferralType}
        isEditing={!!editingReferralType}
        type="referral"
        title="Referral Type"
      />
      <LeadsConfigForm
        show={showDirectSourceModal}
        onClose={handleDirectSourceModalClose}
        onSuccess={fetchLeadDirectSources}
        initialData={editingDirectSource}
        isEditing={!!editingDirectSource}
        type="direct-source"
        title="Direct Source"
      />
      <LeadsConfigForm
        show={showCancellationReasonModal}
        onClose={handleCancellationReasonModalClose}
        onSuccess={fetchLeadCancellationReasons}
        initialData={editingCancellationReason ? {
          ...editingCancellationReason,
          name: editingCancellationReason.reason,
          color: editingCancellationReason.color,
        } : null}
        isEditing={!!editingCancellationReason}
        type="cancellation-reason"
        title="Cancellation Reason"
      />
      <LeadsConfigForm
        show={showPoStatusModal}
        onClose={handlePoStatusModalClose}
        onSuccess={fetchLeadPoStatuses}
        initialData={editingPoStatus}
        isEditing={!!editingPoStatus}
        type="po-status"
        title="PO Status"
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
        onClose={() => { setShowCategoryModal(false); setEditingCategory(null); }}
        onSuccess={fetchProjectCategories}
        type="category"
        title="Category"
        isEditing={!!editingCategory}
        initialData={editingCategory}
      />
      <ProjectConfigForm
        show={showSubcategoryModal}
        onClose={() => { setShowSubcategoryModal(false); setEditingSubcategory(null); }}
        onSuccess={() => { fetchProjectSubcategories(); fetchProjectCategories(); }}
        type="subcategory"
        title="Subcategory"
        isEditing={!!editingSubcategory}
        initialData={editingSubcategory}
      />

      <MeetingScheduleModal
        show={showMeetingScheduleModal}
        onClose={handleMeetingScheduleModalClose}
        onSuccess={fetchMeetingSchedules}
        initialData={editingMeetingSchedule}
        isEditing={!!editingMeetingSchedule}
      />

      {directSourceDeleteConfirmation.DeleteModal}
      {serviceDeleteConfirmation.DeleteModal}
      {statusDelete.DeleteModal}
      {referralTypeDelete.DeleteModal}
      {cancellationReasonDelete.DeleteModal}
      {poStatusDelete.DeleteModal}
      {meetingScheduleDelete.DeleteModal}
      {categoryDelete.DeleteModal}
      {subcategoryDelete.DeleteModal}
    </>
  );
};

export default LeadsConfigurationMain;
