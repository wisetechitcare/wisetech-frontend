import React, { useState, useCallback } from 'react';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import { DeleteFunction, DeleteConfirmationConfig, DropdownOption } from '../types/deleteConfirmation';
import Swal from 'sweetalert2';

interface UseDeleteConfirmationReturn {
    showDeleteModal: (itemId: string, itemDisplayName: string, config?: Partial<DeleteConfirmationConfig>) => void;
    DeleteModal: React.ReactElement;
    isModalVisible: boolean;
    closeModal: () => void;
}

interface UseDeleteConfirmationProps {
    deleteFunction: DeleteFunction;
    defaultConfig: DeleteConfirmationConfig;
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export const useDeleteConfirmation = ({
    deleteFunction,
    defaultConfig,
    onSuccess,
    onError
}: UseDeleteConfirmationProps): UseDeleteConfirmationReturn => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [currentItemId, setCurrentItemId] = useState<string>('');
    const [currentConfig, setCurrentConfig] = useState<DeleteConfirmationConfig>(defaultConfig);
    const [loading, setLoading] = useState(false);

    const showDeleteModal = useCallback((
        itemId: string, 
        itemDisplayName: string, 
        config?: Partial<DeleteConfirmationConfig>
    ) => {
        setCurrentItemId(itemId);
        setCurrentConfig({
            ...defaultConfig,
            ...config,
            entityDisplayName: itemDisplayName
        });
        setIsModalVisible(true);
    }, [defaultConfig]);

    const closeModal = useCallback(() => {
        setIsModalVisible(false);
        setCurrentItemId('');
        setLoading(false);
    }, []);

    const handleConfirm = useCallback(async (targetId?: string) => {
        try {
            setLoading(true);
            await deleteFunction(currentItemId, targetId);
            
            // Show success modal using SweetAlert2
            await Swal.fire({
                title: 'Deleted!',
                text: `Data has been deleted successfully.`,
                icon: 'success',
                confirmButtonText: 'OK',
                willOpen: () => {
                    const element = document.getElementById('kt_content');
                    if (element) {
                        element.style.minHeight = 'calc(100vh - 40px)';
                    }
                },
                willClose: () => {
                    const element = document.getElementById('kt_content');
                    if (element) {
                        element.style.minHeight = '100vh';
                    }
                }
            });
            
            onSuccess?.();
            closeModal();
        } catch (error) {
            onError?.(error);
            console.error('Delete operation failed:', error);
        } finally {
            setLoading(false);
        }
    }, [deleteFunction, onSuccess, onError, closeModal, currentItemId, currentConfig.entityName]);

    const DeleteModal = (
        <DeleteConfirmationModal
            visible={isModalVisible}
            onCancel={closeModal}
            onConfirm={handleConfirm}
            entityName={currentConfig.entityName}
            entityDisplayName={currentConfig.entityDisplayName}
            dropdownOptions={currentConfig.dropdownOptions}
            loading={loading}
            showTransferOption={currentConfig.showTransferOption}
            transferDescription={currentConfig.transferDescription}
        />
    );

    return {
        showDeleteModal,
        DeleteModal,
        isModalVisible,
        closeModal
    };
};

export default useDeleteConfirmation;
