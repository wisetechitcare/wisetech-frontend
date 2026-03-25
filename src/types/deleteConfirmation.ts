export interface DropdownOption {
    key: string;
    value: string;
}

export interface DeleteConfirmationConfig {
    entityName: string;
    entityDisplayName: string;
    dropdownOptions?: DropdownOption[];
    showTransferOption?: boolean;
    transferDescription?: string;
}

export type DeleteFunction = (itemId: string, targetId?: string) => Promise<void>;

export interface DeleteConfirmationHookProps {
    deleteFunction: DeleteFunction;
    defaultConfig: DeleteConfirmationConfig;
    onSuccess?: () => void;
    onError?: (error: any) => void;
}
