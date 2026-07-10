import Swal from 'sweetalert2';

/**
 * Enterprise Minimalist Modal System
 * Focuses on clean typography, subtle indicators, and professional spacing.
 */

const commonOptions = {
    buttonsStyling: false,
    customClass: {
        confirmButton: 'btn btn-primary fw-bold px-6 py-3',
        cancelButton: 'btn btn-light fw-bold px-6 py-3 ms-3',
        popup: 'rounded-1 border-0 shadow-sm p-4',
        title: 'fs-3 fw-bold text-dark mb-2 text-center',
        htmlContainer: 'fs-6 text-gray-700 text-center pb-2',
        actions: 'justify-content-center',
    },
    width: '400px',
    showClass: {
        popup: 'animate__animated animate__fadeIn animate__faster'
    },
    hideClass: {
        popup: 'animate__animated animate__fadeOut animate__faster'
    }
};

export const successConfirmation = (message: string, title: string = 'Success') => {
    return Swal.fire({
        ...commonOptions,
        title: title,
        text: message,
        icon: 'success',
        confirmButtonText: 'Dismiss',
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-success fw-bold px-6',
        },
    });
}

export const errorConfirmation = (message: string, title: string = 'Error') => {
    const isHtml = /<[a-z][\s\S]*>/i.test(message || '');
    const formattedMessage = !isHtml && message?.includes('\n')
        ? message.replace(/\n/g, '<br>')
        : (message || "An unexpected error occurred.");

    return Swal.fire({
        ...commonOptions,
        title: title,
        html: formattedMessage,
        icon: 'error',
        confirmButtonText: 'Close',
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-danger fw-bold px-6',
        }
    });
};

export const deleteConfirmation = async (message: string, confirmButtonText: string = "Delete", swalFireTitle: string = "Deleted") => {
    const result = await Swal.fire({
        ...commonOptions,
        title: "Confirm Deletion",
        text: "Are you sure you want to delete this record? This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Cancel',
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-danger fw-bold px-6',
            cancelButton: 'btn btn-light fw-bold px-6 ms-3'
        },
    });

    if (result.isConfirmed) {
        await successConfirmation(message);
        return true;
    }
    return false;
}

export const removeConfirmation = async (message: string, confirmButtonText: string = "Remove", swalFireTitle: string = "Removed") => {
    const result = await Swal.fire({
        ...commonOptions,
        title: "Confirm Removal",
        text: "Are you sure you want to remove this entry?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Cancel',
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-danger fw-bold px-6',
            cancelButton: 'btn btn-light fw-bold px-6 ms-3'
        },
    });

    if (result.isConfirmed) {
        await successConfirmation(message);
        return true;
    }
    return false;
}

export const genericConfirmation = async (title: string, text: string, confirmButtonText: string = 'Confirm', icon: 'warning' | 'info' | 'question' = 'warning'): Promise<boolean> => {
    const result = await Swal.fire({
        ...commonOptions,
        title,
        text,
        icon,
        showCancelButton: true,
        confirmButtonText,
        cancelButtonText: 'Cancel',
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-danger fw-bold px-6',
            cancelButton: 'btn btn-light fw-bold px-6 ms-3'
        },
    });

    return result.isConfirmed;
};

export const rejectConfirmation = async (confirmButtonText: string = 'Reject'): Promise<boolean> => {
    const result = await Swal.fire({
        ...commonOptions,
        title: "Confirm Rejection",
        text: "Are you sure you want to reject this request?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Cancel',
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-danger fw-bold px-6',
            cancelButton: 'btn btn-light fw-bold px-6 ms-3'
        },
    });

    return result.isConfirmed;
};

export type LeadUpdateMode = 'revision' | 'updateOnly' | 'cancelled';

export const customConfirmation = async (confirmButtonText: string = 'Save Revision', cancelButtonText: string = 'Update Only'): Promise<LeadUpdateMode> => {
    const result = await Swal.fire({
        ...commonOptions,
        title: 'Update Lead Information',
        html: `
            <div class="mb-4">
                <p class="fs-6 text-gray-700 mb-4 text-center">You are about to save changes to this lead. Choose how you would like to handle this update:</p>
                <div class="d-flex flex-column gap-2 bg-light p-4 rounded-1 border">
                    <div class="fs-7 fw-bold"><i class="fa fa-info-circle text-primary me-2"></i><strong>Save Revision:</strong> Increments version number and creates a history record.</div>
                    <div class="fs-7 fw-bold mt-2"><i class="fa fa-sync text-muted me-2"></i><strong>Update Only:</strong> Modifies the current record without version tracking.</div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: confirmButtonText,
        cancelButtonText: cancelButtonText,
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-primary fw-bold px-6',
            cancelButton: 'btn btn-light fw-bold px-6 ms-3'
        },
        width: '450px'
    });

    if (result.isConfirmed) return 'revision';
    // Only the explicit "Update Only" button sets DismissReason.cancel — a backdrop
    // click or Escape key is a real abort, not a silent "update only" choice.
    if (result.dismiss === Swal.DismissReason.cancel) return 'updateOnly';
    return 'cancelled';
};

export const warningNotification = (message: string, title: string = "Notification") => {
    return Swal.fire({
        ...commonOptions,
        title: title,
        text: message,
        icon: 'info',
        confirmButtonText: 'Acknowledge',
        customClass: {
            ...commonOptions.customClass,
            confirmButton: 'btn btn-primary fw-bold px-6',
        }
    });
};

/**
 * Enhanced Aliases that support (title, message) OR just (message)
 */
export const showError = (titleOrMessage: string, message?: string) => {
    if (message) {
        return errorConfirmation(message, titleOrMessage);
    }
    return errorConfirmation(titleOrMessage);
};

export const showSuccess = (titleOrMessage: string, message?: string) => {
    if (message) {
        return successConfirmation(message, titleOrMessage);
    }
    return successConfirmation(titleOrMessage);
};

export const showWarning = (titleOrMessage: string, message?: string) => {
    if (message) {
        return warningNotification(message, titleOrMessage);
    }
    return warningNotification(titleOrMessage);
};
