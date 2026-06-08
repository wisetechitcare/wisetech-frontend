import { useState, useEffect } from 'react';
import { deductionMasterService, PayrollComponent } from '@modules/payroll/services/payrollService';

// Maps SalaryComponentMaster.key → the hardcoded string used inside grossPayBreakdown/deductionBreakdown.
// Must stay in sync with backend's MASTER_KEY_TO_HARDCODED in payrollMasterNames.ts.
const MASTER_KEY_TO_HARDCODED: Record<string, string> = {
    totalWorkingTime:     'Total Working Time',
    overTime:             'Over Time',
    holidays:             'Holidays',
    weekends:             'Weekends',
    leavesTaken:          'Leaves Taken',
    basicSalary:          'Basic Salary',
    houseRentAllowances:  'House Rent Allowances',
    medicalAllowances:    'Medical Allowances',
    conveyanceAllowances: 'Conveyance Allowances',
    educationAllowances:  'Education Allowances',
    dearAllowances:       'Dear Allowances',
    lateCheckins:         'Late Checkins',
    earlyCheckout:        'Early Checkout',
    unpaidLeave:          'Unpaid Leave',
    halfDay:              'Half Day',
    missedPunch:          'Missed Punch',
    providentFund:        'Provident Fund',
    professionalTax:      'Professional Tax',
    professionalFees:     'Professional Fees',
    tds2:                 'TDS 2',
};

export interface ResolvedComponent {
    displayName: string;
    shortCode?: string;
    description?: string;
    sortOrder: number;
    calculationType: string;
    category: string;
    direction: string;
    isActive: boolean;
    defaultAmount?: number | null;
    defaultPercentage?: number | null;
}

/**
 * Fetches SalaryComponentMaster once and returns two resolver functions:
 *
 *  resolveName(hardcodedName)     → updated displayName (or original if no override)
 *  resolveComponent(hardcodedName) → full ResolvedComponent metadata (or null if not in master)
 *
 * Both are safe: fall through unchanged if master is not seeded or fetch fails.
 */
export function useSalaryMaster(): {
    resolveName: (name: string) => string;
    resolveComponent: (name: string) => ResolvedComponent | null;
} {
    const [componentMap, setComponentMap] = useState<Map<string, ResolvedComponent>>(new Map());

    useEffect(() => {
        deductionMasterService.getAll().then((items: PayrollComponent[]) => {
            const map = new Map<string, ResolvedComponent>();
            for (const item of items) {
                const resolved: ResolvedComponent = {
                    displayName:       item.displayName,
                    shortCode:         item.shortCode || undefined,
                    description:       item.description || undefined,
                    sortOrder:         item.sortOrder ?? 0,
                    calculationType:   item.calculationType,
                    category:          item.category,
                    direction:         item.direction,
                    isActive:          item.isActive ?? true,
                    defaultAmount:     item.defaultAmount,
                    defaultPercentage: item.defaultPercentage,
                };
                // System components: breakdown key is the hardcoded engine string
                const hardcoded = MASTER_KEY_TO_HARDCODED[item.key];
                if (hardcoded) {
                    map.set(hardcoded, resolved);
                }
                // Custom components: breakdown key IS the displayName (set by backend injection)
                if (!item.isSystem) {
                    map.set(item.displayName, resolved);
                }
            }
            setComponentMap(map);
        }).catch(() => {});
    }, []);

    return {
        resolveName:     (name: string) => componentMap.get(name)?.displayName ?? name,
        resolveComponent:(name: string) => componentMap.get(name) ?? null,
    };
}

// Backward-compat alias — existing callers that import useSalaryComponentNames still work.
export function useSalaryComponentNames(): (name: string) => string {
    const { resolveName } = useSalaryMaster();
    return resolveName;
}
