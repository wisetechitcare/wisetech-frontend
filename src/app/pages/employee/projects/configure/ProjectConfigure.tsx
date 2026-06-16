import {
  getAllProjectSubcategories,
  getAllProjectCategories,
  deleteProjectCategory,
  deleteProjectSubcategory,
  deleteProjectService,
  deleteProjectStatus,
  getAllProjectServices,
  getAllProjectStatuses,
  getAllStakeholders,
  deleteStakeholderService,
} from "@services/projects";
import React, { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import ProjectConfigForm from "./components/ProjectConfigForm";
import { ProjectItem } from "@models/clientProject";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import { DropdownOption } from "./../../../../../types/deleteConfirmation";
import PrefixSettingsForm from "@app/modules/common/components/PrefixSettingsForm";
import ProjectButtonSettings from "./ProjectButtonSettingUI";
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
          <i className="bi bi-pencil" style={{ fontSize: '11px' }} />
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{ background: hov ? '#fff5f8' : 'transparent', border: 'none', borderRadius: RADIUS.sm, padding: '4px 7px', cursor: 'pointer', color: C.danger, display: 'flex', alignItems: 'center', transition: 'background 0.15s ease' }}
          >
            <i className="bi bi-trash" style={{ fontSize: '11px' }} />
          </button>
        )}
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
    <i className="bi bi-inbox" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
    No {label} configured yet
  </div>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: ConfigTab[] = [
  { id: 'settings', label: 'Project Settings', icon: 'bi-kanban' },
  { id: 'buttons', label: 'Button Settings', icon: 'bi-toggles' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const ProjectConfiguration = () => {
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(false);

  const [projectStatuses, setProjectStatuses] = useState<ProjectItem[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ProjectItem | null>(null);

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

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStatusModalOpen = () => setShowStatusModal(true);
  const handleStatusModalClose = () => { setShowStatusModal(false); setEditingStatus(null); };
  const handleStatusEdit = (s: ProjectItem) => { setEditingStatus(s); setShowStatusModal(true); };

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

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchProjectStatuses = async () => {
    try {
      setLoading(true);
      const response = await getAllProjectStatuses();
      if (response?.projectStatuses) {
        const sorted = [...response.projectStatuses].sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
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

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProjectStatuses();
    fetchStakeholders();
    fetchProjectServices();
    fetchProjectCategories();
    fetchProjectSubcategories();
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

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Project Configuration"
        subtitle="Manage project statuses, stakeholders, prefix, and UI settings"
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {/* ── Project Settings Tab ─────────────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

            {/* Project Status */}
            <ConfigSectionCard
              title="Project Status"
              description="Define the lifecycle stages a project moves through."
              icon="bi-flag"
              iconColor="primary"
              primaryAction={{ label: 'New Status', icon: 'bi-plus-lg', onClick: handleStatusModalOpen, variant: 'primary' }}
              loading={loading}
            >
              {projectStatuses.length === 0
                ? <EmptyState label="project statuses" />
                : (
                  <ChipGrid>
                    {projectStatuses.map((s) => (
                      <ColorChip
                        key={s.id} name={s.name} color={s.color}
                        onEdit={() => handleStatusEdit(s)}
                        onDelete={() => handleDelete(s.id, 'status')}
                      />
                    ))}
                  </ChipGrid>
                )
              }
            </ConfigSectionCard>

            {/* Stakeholders Services */}
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

            {/* Project Prefix Settings */}
            <ConfigSectionCard
              title="Project Prefix Settings"
              description="Configure the auto-generated prefix format for new project IDs."
              icon="bi-hash"
              iconColor="amber"
              loading={loading}
            >
              <PrefixSettingsForm typeLabel="Project" typeValue="PROJECT" />
            </ConfigSectionCard>
          </div>
        )}

        {/* ── Button Settings Tab ──────────────────────────────────────────────── */}
        {activeTab === 'buttons' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>
            <ConfigSectionCard
              title="Project Button Visibility"
              description="Control which action buttons are visible on the project workspace."
              icon="bi-toggles"
              iconColor="purple"
            >
              <ProjectButtonSettings />
            </ConfigSectionCard>
          </div>
        )}
      </ConfigPageLayout>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}

      <ProjectConfigForm
        show={showStatusModal}
        onClose={handleStatusModalClose}
        onSuccess={fetchProjectStatuses}
        type="status"
        title="Status"
        isEditing={!!editingStatus}
        initialData={editingStatus}
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

      {serviceDeleteConfirmation.DeleteModal}
    </>
  );
};

export default ProjectConfiguration;
