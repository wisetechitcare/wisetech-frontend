import Swal from 'sweetalert2';

export const successConfirmation = (message: string) => {
    return Swal.fire({
        title: 'Success!',
        text: message,
        icon: 'success',
        confirmButtonText: 'Ok',
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
}

export const errorConfirmation = (message: string) => {
    // Ensure the message is not null or undefined
    if (!message) {
        message = "An unknown error occurred.";
    }

    // Check if the message contains HTML tags
    const isHtml = /<[a-z][\s\S]*>/i.test(message);

    // Format the message only if it contains newlines and is not already HTML
    const formattedMessage = !isHtml && message.includes('\n')
        ? message.replace(/\n/g, '<br>')
        : message;

    return Swal.fire({
        title: 'Error!',
        text: !isHtml && message.includes('\n') ? "Please fix the following errors:" : "", // Show only if needed
        html: formattedMessage, // Use the formatted message for HTML rendering
        icon: 'error',
        confirmButtonText: 'Ok'
    });
};


export const deleteConfirmation = async (message: string, confirmButtonText:string = "Yes, delete it!", swalFireTitle:string="Deleted!") => {
    return Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        cancelButtonColor: "#d33",
        confirmButtonText: confirmButtonText
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: swalFireTitle,
                text: message,
                icon: "success"
            });
            return true;
        }
        else {
            return false;
        }
    });
}
export const removeConfirmation = async (message: string, confirmButtonText:string = "Yes, remove it!", swalFireTitle:string="Remove!") => {
    return Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        cancelButtonColor: "#d33",
        confirmButtonText: confirmButtonText
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({
                title: swalFireTitle,
                text: message,
                icon: "success"
            });
            return true;
        }
        else {
            return false;
        }
    });
}


export const rejectConfirmation = async (confirmButtonText: string = 'Yes, reject it!'): Promise<boolean> => {
    const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        cancelButtonColor: "#d33",
        confirmButtonText: confirmButtonText
    });

    return result.isConfirmed;
};


export const customConfirmation = async (confirmButtonText: string = 'Yes', cancelButtonText: string = 'No'): Promise<boolean> => {
    const result = await Swal.fire({
        title: "Wait!",
        text: "Would you like to count this as a revision?",
        icon: "warning",
        showCancelButton: true,
        cancelButtonText: cancelButtonText,
        cancelButtonColor: "#d33",
        confirmButtonText: confirmButtonText
    });

    return result.isConfirmed;
};

export const warningNotification = (message: string, title: string = "Warning!") => {
    return Swal.fire({
        title: title,
        text: message,
        icon: 'warning',
        confirmButtonText: 'Understood',
        confirmButtonColor: '#ff9500',
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
};
