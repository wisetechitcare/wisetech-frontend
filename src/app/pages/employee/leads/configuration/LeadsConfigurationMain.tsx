import { getAllLeadStatus, deleteLeadStatus, getAllLeadReferralType, deleteLeadReferralType, getAllLeadDirectSource, deleteLeadDirectSource, getAllLeadCancellationReasons, deleteLeadCancellationReason } from "@services/lead";
import { getAllPaymentPlans, deletePaymentPlan } from "@services/paymentPlan";
import { getAllMeetingSchedules, deleteMeetingSchedule } from "@services/meetingSchedule";
import PaymentPlanModal from "./components/PaymentPlanModal";
import MeetingScheduleModal from "./components/MeetingScheduleModal";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import { fetchAllPrefixSettings, createPrefixSetting, updatePrefixSetting } from "@services/options";

import { getAllProjectServices, deleteProjectService } from "@services/projects";
import React, { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";
import LeadsConfigForm from "./components/LeadsConfigForm";
import CategoryTreeExplorer from "./components/CategoryTreeExplorer";
import { LeadDirectSource, LeadReferralType, LeadStatus, LeadCancellationReason, PaymentPlan, MeetingScheduleType } from "@models/leads";
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
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';
import type { ConfigTab } from '@app/modules/configuration';
import { ProjectPointsConfigSection } from '@app/modules/projectPoints';

// ─── ColorChip ────────────────────────────────────────────────────────────────

interface ColorChipProps {
  name: string;
  color: string;
  badge?: string;
  onEdit: () => void;
  onDelete: () => void;
}

const ColorChip: React.FC<ColorChipProps> = ({ name, color, badge, onEdit, onDelete }) => {
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
      {/* Left color accent */}
      <div style={{
        position: 'absolute',
        top: 0, bottom: 0, left: 0,
        width: '3px',
        backgroundColor: color || '#ccc',
        borderRadius: '3px 0 0 3px',
        opacity: 0.8,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '10px', height: '10px',
          borderRadius: '50%',
          backgroundColor: color || '#ccc',
          flexShrink: 0,
          boxShadow: `0 0 0 2px ${color ? color + '30' : '#ccc'}`,
        }} />
        <span style={{
          fontFamily: FONT.body,
          fontWeight: 500,
          fontSize: '13px',
          color: C.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
        {badge && (
          <span style={{
            fontFamily: FONT.body,
            fontSize: '9px',
            fontWeight: 700,
            color: '#0A5C2A',
            background: '#EDFDF3',
            border: '1px solid #17C96433',
            borderRadius: '999px',
            padding: '2px 7px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}>
            {badge}
          </span>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '4px',
        flexShrink: 0,
        opacity: hov ? 1 : 0.35,
        transition: 'opacity 0.15s ease',
      }}>
        <button
          onClick={onEdit}
          style={{
            background: hov ? '#eff6ff' : 'transparent',
            border: 'none',
            borderRadius: RADIUS.sm,
            padding: '4px 7px',
            cursor: 'pointer',
            color: '#4f82c4',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s ease',
          }}
        >
          <i className="bi bi-pencil" style={{ fontSize: '11px' }} />
        </button>
        <button
          onClick={onDelete}
          style={{
            background: hov ? '#fff5f8' : 'transparent',
            border: 'none',
            borderRadius: RADIUS.sm,
            padding: '4px 7px',
            cursor: 'pointer',
            color: C.danger,
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.15s ease',
          }}
        >
          <i className="bi bi-trash" style={{ fontSize: '11px' }} />
        </button>
      </div>
    </div>
  );
};

// ─── ChipGrid ─────────────────────────────────────────────────────────────────

const ChipGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: SP.sm,
    marginTop: SP.md,
  }}>
    {children}
  </div>
);

// ─── EmptyState ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{
    textAlign: 'center',
    padding: '28px 16px',
    color: C.textMuted,
    fontFamily: FONT.body,
    fontSize: '13px',
  }}>
    <i className="bi bi-inbox" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
    No {label} configured yet
  </div>
);

// ─── PaymentPlanChip ────────────────────────────────────────────────────────────

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

  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [showPaymentPlanModal, setShowPaymentPlanModal] = useState(false);
  const [editingPaymentPlan, setEditingPaymentPlan] = useState<PaymentPlan | null>(null);

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

  const handlePaymentPlanModalOpen = () => { setEditingPaymentPlan(null); setShowPaymentPlanModal(true); };
  const handlePaymentPlanModalClose = () => { setShowPaymentPlanModal(false); setEditingPaymentPlan(null); };
  const handlePaymentPlanEdit = (p: PaymentPlan) => { setEditingPaymentPlan(p); setShowPaymentPlanModal(true); };

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

  const handleDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation('Lead status deleted successfully');
      if (confirmed) { await deleteLeadStatus(id); fetchLeadStatuses(); }
    } catch (error) {
      console.error('Error deleting lead status:', error);
    }
  };

  const handleReferralTypeDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation('Lead referral type deleted successfully');
      if (confirmed) { await deleteLeadReferralType(id); fetchLeadReferralTypes(); }
    } catch (error) {
      console.error('Error deleting lead referral type:', error);
    }
  };

  const handleCancellationReasonDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation('Cancellation reason deleted successfully');
      if (!confirmed) return;
      await deleteLeadCancellationReason(id);
      fetchLeadCancellationReasons();
    } catch (error) {
      console.error('Error deleting cancellation reason:', error);
    }
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

  const handleMeetingScheduleDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation('Meeting schedule deleted successfully');
      if (!confirmed) return;
      await deleteMeetingSchedule(id);
      fetchMeetingSchedules();
    } catch (error) {
      console.error('Error deleting meeting schedule:', error);
    }
  };

  const handleCategoryDelete = async (id: string) => {
    try {
      const category = projectCategories.find((c) => c.id === id);
      if (category && category.subCategories && category.subCategories > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Cannot Delete',
          text: `This category has ${category.subCategories} subcategory(s) and cannot be deleted. Please remove all subcategories first.`,
          confirmButtonColor: '#1E3A8A',
        });
        return;
      }
      const confirmed = await deleteConfirmation('Category deleted successfully');
      if (!confirmed) return;
      await deleteProjectCategory(id);
      fetchProjectCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleSubcategoryDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation('Subcategory deleted successfully');
      if (!confirmed) return;
      await deleteProjectSubcategory(id);
      await Promise.all([fetchProjectSubcategories(), fetchProjectCategories()]);
    } catch (error) {
      console.error('Error deleting subcategory:', error);
    }
  };

  // ── Delete confirmation hooks ────────────────────────────────────────────────

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
    onError: (error) => {
      console.error('Failed to delete lead direct source:', error);
      alert('Failed to delete lead direct source');
    },
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
    onError: (error: any) => {
      console.error('Failed to delete project service:', error);
      alert('Failed to delete project service');
    },
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
  useEffect(() => { fetchPaymentPlans(); }, []);
  useEffect(() => { fetchMeetingSchedules(); }, []);
  useEffect(() => { fetchProjectServices(); }, []);
  useEffect(() => { fetchProjectCategories(); fetchProjectSubcategories(); }, []);

  useEventBus(EVENT_KEYS.leadStatusCreated, fetchLeadStatuses);
  useEventBus(EVENT_KEYS.leadReferralTypeCreated, fetchLeadReferralTypes);
  useEventBus(EVENT_KEYS.leadDirectSourceCreated, fetchLeadDirectSources);
  useEventBus(EVENT_KEYS.leadCancellationReasonCreated, fetchLeadCancellationReasons);
  useEventBus(EVENT_KEYS.leadCancellationReasonUpdated, fetchLeadCancellationReasons);
  useEventBus(EVENT_KEYS.paymentPlanCreated, fetchPaymentPlans);
  useEventBus(EVENT_KEYS.paymentPlanUpdated, fetchPaymentPlans);
  useEventBus(EVENT_KEYS.paymentPlanDeleted, fetchPaymentPlans);
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
        subtitle="Manage lead statuses, sources, referrals, and project settings"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {/* ── Lead Settings Tab ───────────────────────────────────────────────── */}
        {activeTab === 'lead' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

            {/* Lead Status */}
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

            {/* Lead Cancellation Reasons */}
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

            {/* Lead Direct Source */}
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

            {/* Lead Referral Type */}
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

            {/* Payment Plans (stage-wise fee break-up) */}
            <ConfigSectionCard
              title="Payment Plans"
              description="Define stage-wise fee break-up plans. On a lead, selecting a plan auto-splits the total commercial cost across its stages by percentage."
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

            {/* Meeting Schedules (project type → area brackets → meetings) */}
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

            {/* Lead Prefix Settings */}
            <ConfigSectionCard
              title="Lead Prefix Settings"
              description="Configure the auto-generated prefix format for new lead IDs."
              icon="bi-hash"
              iconColor="amber"
              loading={loading}
            >
              <PrefixSettingsForm
                typeLabel="Lead"
                typeValue="LEAD"
              />
            </ConfigSectionCard>
          </div>
        )}

        {/* ── Project Settings Tab ────────────────────────────────────────────── */}
        {activeTab === 'project' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

            {/* Project Services */}
            <ConfigSectionCard
              title="Project Services"
              description="Define the service types that can be assigned to projects and leads."
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

            {/* Project Points — dynamic master templates */}
            <ProjectPointsConfigSection />

            {/* Project Categories & Subcategories — tree view */}
            <ConfigSectionCard
              title="Project Categories & Subcategories"
              description="Each category expands to show its subcategories inline."
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
                  <i className="bi bi-file-earmark-word" style={{ fontSize: '22px', color: '#7c3aed' }} />
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
                    to="/qc/leads/documentation-builder"
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
                    <i className="bi bi-book" style={{ fontSize: '13px' }} />
                    Docs & Validation
                  </Link>
                  <Link
                    to="/qc/leads/configuration"
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
                    <i className="bi bi-box-arrow-up-right" style={{ fontSize: '13px' }} />
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

      <PaymentPlanModal
        show={showPaymentPlanModal}
        onClose={handlePaymentPlanModalClose}
        onSuccess={fetchPaymentPlans}
        initialData={editingPaymentPlan}
        isEditing={!!editingPaymentPlan}
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
    </>
  );
};

export default LeadsConfigurationMain;
