import {
  fetchAllOrganizationConfigurations,
  deleteOrganizationConfigurationById,
} from "@services/configurations";
import React, { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import OrganizationConfigureForm from "./components/OrganizationConfigureForm";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
  KEYFRAMES,
} from '@app/modules/configuration';

// ─── NameChip (no color field for org config items) ───────────────────────────

interface NameChipProps {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}

const NameChip: React.FC<NameChipProps> = ({ name, onEdit, onDelete }) => {
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
        width: '3px', backgroundColor: C.primary,
        borderRadius: '3px 0 0 3px', opacity: hov ? 0.7 : 0.25,
        transition: 'opacity 0.15s ease',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, paddingLeft: '4px' }}>
        <i className="bi bi-dash-circle" style={{ fontSize: '11px', color: C.textMuted, flexShrink: 0 }} />
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
        <button
          onClick={onDelete}
          style={{ background: hov ? '#fff5f8' : 'transparent', border: 'none', borderRadius: RADIUS.sm, padding: '4px 7px', cursor: 'pointer', color: C.danger, display: 'flex', alignItems: 'center', transition: 'background 0.15s ease' }}
        >
          <i className="bi bi-trash" style={{ fontSize: '11px' }} />
        </button>
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrganizationConfigItem {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const OrganizationConfigure = () => {
  const [loading, setLoading] = useState(false);

  const [shifts, setShifts] = useState<OrganizationConfigItem[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<OrganizationConfigItem | null>(null);

  const [workingTypes, setWorkingTypes] = useState<OrganizationConfigItem[]>([]);
  const [showWorkingTypeModal, setShowWorkingTypeModal] = useState(false);
  const [editingWorkingType, setEditingWorkingType] = useState<OrganizationConfigItem | null>(null);

  const [roomBlocks, setRoomBlocks] = useState<OrganizationConfigItem[]>([]);
  const [showRoomBlockModal, setShowRoomBlockModal] = useState(false);
  const [editingRoomBlock, setEditingRoomBlock] = useState<OrganizationConfigItem | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleShiftModalOpen = () => setShowShiftModal(true);
  const handleShiftModalClose = () => { setShowShiftModal(false); setEditingShift(null); };
  const handleShiftEdit = (s: OrganizationConfigItem) => { setEditingShift(s); setShowShiftModal(true); };

  const handleWorkingTypeModalOpen = () => setShowWorkingTypeModal(true);
  const handleWorkingTypeModalClose = () => { setShowWorkingTypeModal(false); setEditingWorkingType(null); };
  const handleWorkingTypeEdit = (w: OrganizationConfigItem) => { setEditingWorkingType(w); setShowWorkingTypeModal(true); };

  const handleRoomBlockModalOpen = () => setShowRoomBlockModal(true);
  const handleRoomBlockModalClose = () => { setShowRoomBlockModal(false); setEditingRoomBlock(null); };
  const handleRoomBlockEdit = (r: OrganizationConfigItem) => { setEditingRoomBlock(r); setShowRoomBlockModal(true); };

  // ── Fetch functions ─────────────────────────────────────────────────────────

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await fetchAllOrganizationConfigurations('SHIFT');
      if (response?.data?.organizationConfigurations) setShifts(response.data.organizationConfigurations);
    } catch (error) { console.error('Error fetching shifts:', error); }
    finally { setLoading(false); }
  };

  const fetchWorkingTypes = async () => {
    try {
      setLoading(true);
      const response = await fetchAllOrganizationConfigurations('WORKING_TYPE');
      if (response?.data?.organizationConfigurations) setWorkingTypes(response.data.organizationConfigurations);
    } catch (error) { console.error('Error fetching working types:', error); }
    finally { setLoading(false); }
  };

  const fetchRoomBlocks = async () => {
    try {
      setLoading(true);
      const response = await fetchAllOrganizationConfigurations('ROOM_BLOCK');
      if (response?.data?.organizationConfigurations) setRoomBlocks(response.data.organizationConfigurations);
    } catch (error) { console.error('Error fetching room blocks:', error); }
    finally { setLoading(false); }
  };

  // ── Delete handler ──────────────────────────────────────────────────────────

  const handleDelete = async (id: string, type: 'SHIFT' | 'WORKING_TYPE' | 'ROOM_BLOCK') => {
    try {
      const confirmed = await deleteConfirmation(`Successfully deleted ${type.toLowerCase().replace('_', ' ')}`);
      if (!confirmed) return;
      await deleteOrganizationConfigurationById(id);
      switch (type) {
        case 'SHIFT': fetchShifts(); break;
        case 'WORKING_TYPE': fetchWorkingTypes(); break;
        case 'ROOM_BLOCK': fetchRoomBlocks(); break;
      }
    } catch (error) { console.error(`Error deleting ${type}:`, error); }
  };

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchShifts(); fetchWorkingTypes(); fetchRoomBlocks(); }, []);

  useEventBus(EVENT_KEYS.organizationConfigCreated, () => { fetchShifts(); fetchWorkingTypes(); fetchRoomBlocks(); });
  useEventBus(EVENT_KEYS.organizationConfigUpdated, () => { fetchShifts(); fetchWorkingTypes(); fetchRoomBlocks(); });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout
        title="Company Configuration"
        subtitle="Manage office rooms, shifts, and working location types"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

          {/* Room / Blocks */}
          <ConfigSectionCard
            title="Rooms / Blocks"
            description="Define the physical rooms or blocks available across your office locations."
            icon="bi-building"
            iconColor="blue"
            primaryAction={{ label: 'New Room/Block', icon: 'bi-plus-lg', onClick: handleRoomBlockModalOpen, variant: 'primary' }}
            loading={loading}
          >
            {roomBlocks.length === 0
              ? <EmptyState label="rooms or blocks" />
              : (
                <ChipGrid>
                  {roomBlocks.map((r) => (
                    <NameChip
                      key={r.id} name={r.name}
                      onEdit={() => handleRoomBlockEdit(r)}
                      onDelete={() => handleDelete(r.id, 'ROOM_BLOCK')}
                    />
                  ))}
                </ChipGrid>
              )
            }
          </ConfigSectionCard>

          {/* Shifts */}
          <ConfigSectionCard
            title="Shifts"
            description="Configure the shift types that employees are assigned to."
            icon="bi-clock"
            iconColor="teal"
            primaryAction={{ label: 'New Shift', icon: 'bi-plus-lg', onClick: handleShiftModalOpen, variant: 'primary' }}
            loading={loading}
          >
            {shifts.length === 0
              ? <EmptyState label="shifts" />
              : (
                <ChipGrid>
                  {shifts.map((s) => (
                    <NameChip
                      key={s.id} name={s.name}
                      onEdit={() => handleShiftEdit(s)}
                      onDelete={() => handleDelete(s.id, 'SHIFT')}
                    />
                  ))}
                </ChipGrid>
              )
            }
          </ConfigSectionCard>
        </div>
      </ConfigPageLayout>

      {/* ── Modals ──────────────────────────────────────────────────────────────── */}

      <OrganizationConfigureForm
        show={showRoomBlockModal}
        onClose={handleRoomBlockModalClose}
        onSuccess={fetchRoomBlocks}
        initialData={editingRoomBlock}
        isEditing={!!editingRoomBlock}
        type="ROOM_BLOCK"
        title="Room/Block"
      />
      <OrganizationConfigureForm
        show={showShiftModal}
        onClose={handleShiftModalClose}
        onSuccess={fetchShifts}
        initialData={editingShift}
        isEditing={!!editingShift}
        type="SHIFT"
        title="Shift"
      />
      <OrganizationConfigureForm
        show={showWorkingTypeModal}
        onClose={handleWorkingTypeModalClose}
        onSuccess={fetchWorkingTypes}
        initialData={editingWorkingType}
        isEditing={!!editingWorkingType}
        type="WORKING_TYPE"
        title="Working Location Type"
      />
    </>
  );
};

export default OrganizationConfigure;
