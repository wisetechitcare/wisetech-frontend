import React, { useState, useCallback } from 'react';
import DeleteConfirmationModal from '../components/common/DeleteConfirmationModal';
import { DeleteFunction, DeleteConfirmationConfig } from '../types/deleteConfirmation';
import { toast } from '@app/modules/common/components/ui';
import { errorConfirmation } from '@utils/modal';
import { apiErrorMessage } from '@utils/apiError';

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

            toast({
                icon: 'success',
                title: 'Deleted',
                text: 'Data has been deleted successfully.',
            });

            onSuccess?.();
            closeModal();
        } catch (error) {
            // The server refuses a delete whose option is still in use, and that
            // refusal is the most useful thing this dialog can say — it names the
            // records to reassign. It used to reach `console.error` only, so the
            // modal just sat there and the user learned nothing.
            // Same treatment `utils/configDelete` gives the non-transfer lists: the
            // sentence lives in `detail`, and `.message` is only the HTTP status name.
            if (onError) onError(error);
            else await errorConfirmation(
                apiErrorMessage(error, 'Could not delete this. Please try again.'),
                'Could not delete',
            );
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
