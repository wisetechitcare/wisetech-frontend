/**
 * Centralized utility for alphabetically sorting dropdown options.
 * It preserves placeholder and "+ Add New" style action items at the top
 * and avoids sorting dropdowns where order is intentional (like priorities, months, days, numeric lists, or status workflows).
 */
export const sortOptionsAlphabetically = (options: any[]): any[] => {
    if (!Array.isArray(options) || options.length <= 1) {
        return options;
    }

    // Convert option labels to lowercase for list type identification
    const lowercaseLabels = options
        .map(o => String(o?.label || '').trim().toLowerCase())
        .filter(Boolean);

    // 1. Do NOT sort priority lists (High, Medium, Low, Critical, Urgent)
    const priorityTerms = ['high', 'medium', 'low', 'critical', 'urgent'];
    if (lowercaseLabels.some(l => priorityTerms.includes(l))) {
        return options;
    }

    // 2. Do NOT sort month lists
    const months = [
        'january', 'february', 'march', 'april', 'may', 'june', 
        'july', 'august', 'september', 'october', 'november', 'december',
        'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    if (lowercaseLabels.every(l => months.includes(l))) {
        return options;
    }

    // 3. Do NOT sort day lists
    const days = [
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
    ];
    if (lowercaseLabels.every(l => days.includes(l))) {
        return options;
    }

    // 4. Do NOT sort numeric or date lists
    const isNumericOrDateList = lowercaseLabels.every(l => {
        return !isNaN(Number(l)) || /^\d+[-/]\d+([-/]\d+)?$/.test(l);
    });
    if (isNumericOrDateList) {
        return options;
    }

    // 5. Do NOT sort status workflows (Draft -> Submitted -> Approved -> Rejected, etc.)
    // Note: We still sort lists containing "Active"/"Inactive"/"Pending" if they are name-based like Contact Status.
    const workflowTerms = ['draft', 'submitted', 'approved', 'rejected', 'pending approval'];
    if (lowercaseLabels.some(l => workflowTerms.includes(l))) {
        return options;
    }

    // Separate action items (e.g. "+ Add New...", "+ New...", "Add New...") to keep them at the top
    const addItems: any[] = [];
    const normalItems: any[] = [];

    options.forEach(option => {
        const label = String(option?.label || '');
        const trimmedLabel = label.trim();
        if (
            trimmedLabel.startsWith('+') || 
            trimmedLabel.toLowerCase().includes('add new') || 
            trimmedLabel.toLowerCase().startsWith('new ')
        ) {
            addItems.push(option);
        } else {
            normalItems.push(option);
        }
    });

    // Sort normal items alphabetically (A-Z, case-insensitive)
    normalItems.sort((a, b) => {
        const labelA = String(a?.label || '');
        const labelB = String(b?.label || '');
        return labelA.localeCompare(labelB, undefined, { sensitivity: 'base', numeric: true });
    });

    return [...addItems, ...normalItems];
};
