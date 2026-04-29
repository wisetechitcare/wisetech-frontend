import { useState, useEffect } from "react";
import {
  getAllContactRoleTypes,
  getAllContactStatuses,
  deleteContactRoleType,
  deleteContactStatus
} from "@services/companies";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { deleteConfirmation } from "@utils/modal";
import { useDeleteConfirmation } from "@hooks/useDeleteConfirmation";
import type { DropdownOption } from "../types/deleteConfirmation";

export const useContactConfig = () => {
  const [loading, setLoading] = useState(true);
  const [contactRoleTypes, setContactRoleTypes] = useState<any[]>([]);
  const [contactStatuses, setContactStatuses] = useState<any[]>([]);

  // Fetch contact role types
  const fetchContactRoleTypes = async () => {
    try {
      const response = await getAllContactRoleTypes();
      if (response && response.contactRoleTypes) {
        setContactRoleTypes(response.contactRoleTypes);
      }
    } catch (error) {
      console.error("Error fetching contact role types:", error);
    }
  };

  // Fetch contact statuses
  const fetchContactStatuses = async () => {
    try {
      const response = await getAllContactStatuses();
      if (response && response.data && response.data.contactConfigs) {
        setContactStatuses(response.data.contactConfigs);
      }
    } catch (error) {
      console.error("Error fetching contact statuses:", error);
    }
  };

  // Event listeners
  useEventBus(EVENT_KEYS.leadReferralTypeCreated, () => {
    fetchContactRoleTypes();
  });

  useEventBus(EVENT_KEYS.contactStatusCreated, () => {
    fetchContactStatuses();
  });

  // Initial data loading
  const loadInitialData = async () => {
    try {
      await Promise.all([
        fetchContactRoleTypes(),
        fetchContactStatuses(),
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Delete confirmation hook for Contact Role Types
  const contactRoleTypeDeleteConfirmation = useDeleteConfirmation({
    deleteFunction: async (itemId: string, targetId?: string) => {
      await deleteContactRoleType(itemId, targetId);
    },
    defaultConfig: {
      entityName: 'Contact Role Type',
      entityDisplayName: '',
      showTransferOption: true,
      transferDescription: 'All contacts using this role type will be transferred to the selected role type.'
    },
    onSuccess: () => {
      console.log('Contact role type deleted successfully');
      fetchContactRoleTypes();
    },
    onError: (error: any) => {
      console.error('Failed to delete contact role type:', error);
      alert('Failed to delete contact role type');
    }
  });

  // Delete handler for contact role types
  const handleContactRoleTypeDelete = (id: string) => {
    const contactRoleTypeToDelete = contactRoleTypes.find(type => type.id === id);
    const typeName = contactRoleTypeToDelete?.name || 'Unknown Contact Role Type';

    const dropdownOptions: DropdownOption[] = contactRoleTypes
      .filter(type => type.id !== id && type.id && type.name)
      .map(type => ({
        key: type.id!,
        value: type.name
      }));

    contactRoleTypeDeleteConfirmation.showDeleteModal(id, typeName, {
      dropdownOptions,
      showTransferOption: dropdownOptions.length > 0,
      transferDescription: dropdownOptions.length > 0
        ? 'All contacts using this role type will be transferred to the selected role type.'
        : 'This is the last contact role type and cannot be transferred.'
    });
  };

  // Delete handler for contact status
  const handleContactStatusDelete = async (id: string) => {
    try {
      const confirmed = await deleteConfirmation("Contact status deleted successfully");
      if (confirmed) {
        await deleteContactStatus(id);
        fetchContactStatuses();
      }
    } catch (error) {
      console.error("Error deleting contact status:", error);
    }
  };

  return {
    loading,
    contactRoleTypes,
    contactStatuses,
    fetchContactRoleTypes,
    fetchContactStatuses,
    handleContactRoleTypeDelete,
    handleContactStatusDelete,
    contactRoleTypeDeleteConfirmation,
  };
};
