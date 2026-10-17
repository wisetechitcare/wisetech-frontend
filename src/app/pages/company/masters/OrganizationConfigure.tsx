import {
  fetchAllOrganizationConfigurations,
  deleteOrganizationConfigurationById,
} from "@services/configurations";
import React, { useEffect, useState } from "react";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import OrganizationConfigureForm from "./components/OrganizationConfigureForm";
import { AppIcon, ConfigColorChip, ConfigChipGrid } from "@app/modules/common/components/ui";
import {
  ConfigPageLayout,
  ConfigSectionCard,
  C,
  FONT,
  SP,
  KEYFRAMES,
} from '@app/modules/configuration';

const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ textAlign: 'center', padding: '28px 16px', color: C.textMuted, fontFamily: FONT.body, fontSize: '13px' }}>
    <AppIcon name="bi-inbox" className="fs-2qx" style={{ display: 'block', marginBottom: '8px', opacity: 0.4 }} />
    No {label} configured yet
  </div>
);

interface OrganizationConfigItem {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const OrganizationConfigure = () => {
  const [loading, setLoading] = useState(false);

  const [shifts, setShifts] = useState<OrganizationConfigItem[]>([]);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<OrganizationConfigItem | null>(null);

  const [workingTypes, setWorkingTypes] = useState<OrganizationConfigItem[]>([]);
  const [showWorkingTypeModal, setShowWorkingTypeModal] = useState(false);
  const [editingWorkingType, setEditingWorkingType] = useState<OrganizationConfigItem | null>(null);

  const handleShiftModalOpen = () => setShowShiftModal(true);
  const handleShiftModalClose = () => { setShowShiftModal(false); setEditingShift(null); };
  const handleShiftEdit = (s: OrganizationConfigItem) => { setEditingShift(s); setShowShiftModal(true); };

  const handleWorkingTypeModalClose = () => { setShowWorkingTypeModal(false); setEditingWorkingType(null); };

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

  const handleDelete = async (id: string, type: 'SHIFT' | 'WORKING_TYPE') => {
    try {
      const confirmed = await deleteConfirmation(`Successfully deleted ${type.toLowerCase().replace('_', ' ')}`);
      if (!confirmed) return;
      await deleteOrganizationConfigurationById(id);
      switch (type) {
        case 'SHIFT': fetchShifts(); break;
        case 'WORKING_TYPE': fetchWorkingTypes(); break;
      }
    } catch (error) { console.error(`Error deleting ${type}:`, error); }
  };

  useEffect(() => { fetchShifts(); fetchWorkingTypes(); }, []);

  useEventBus(EVENT_KEYS.organizationConfigCreated, () => { fetchShifts(); fetchWorkingTypes(); });
  useEventBus(EVENT_KEYS.organizationConfigUpdated, () => { fetchShifts(); fetchWorkingTypes(); });

  return (
    <>
      <style>{KEYFRAMES}</style>
      <ConfigPageLayout>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SP.lg }}>

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
                <ConfigChipGrid>
                  {shifts.map((s) => (
                    <ConfigColorChip
                      key={s.id}
                      name={s.name}
                      onEdit={() => handleShiftEdit(s)}
                      action={{
                        icon: 'bi-trash',
                        title: `Delete ${s.name}`,
                        danger: true,
                        onClick: () => handleDelete(s.id, 'SHIFT'),
                      }}
                    />
                  ))}
                </ConfigChipGrid>
              )
            }
          </ConfigSectionCard>
        </div>
      </ConfigPageLayout>

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
