import { useEffect, useState } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import { createNewConfiguration, fetchConfiguration, updateConfigurationById } from '@services/company';
import { successConfirmation, errorConfirmation } from '@utils/modal';
import { LEAVE_POLICY_KEY } from '@constants/configurations-key';

/**
 * Admin settings for the multi-type auto-allocation policy (F1 + F5):
 *  - Probation window (block paid leave for new joiners)
 *  - Paid leave-type consumption priority order
 *  - Cumulative-overflow behaviour
 *
 * Persists to the "leave policy" feature-config module, consumed by the backend
 * Leave Allocation Engine (utils/leavePolicyConfig.ts → utils/leaveAllocation.ts).
 */

const DEFAULT_PRIORITY = ['Casual Leaves', 'Sick Leaves', 'Floater Leaves', 'Annual Leaves'];

interface PolicyState {
    probationEnabled: boolean;
    probationDurationDays: number;
    allowUnpaidDuringProbation: boolean;
    allocationPriority: string[];
    cumulativeOverflow: 'spillToUnpaid' | 'block';
    penaltyEnabled: boolean;
    penaltyCutoffTime: string;
    penaltyType: 'halfDaySalaryDeduction' | 'halfPaidLeave' | 'fixedAmountDeduction';
    penaltyFixedAmount: number;
}

const DEFAULTS: PolicyState = {
    probationEnabled: false,
    probationDurationDays: 90,
    allowUnpaidDuringProbation: true,
    allocationPriority: DEFAULT_PRIORITY,
    cumulativeOverflow: 'spillToUnpaid',
    penaltyEnabled: false,
    penaltyCutoffTime: '12:00',
    penaltyType: 'halfDaySalaryDeduction',
    penaltyFixedAmount: 0,
};

function LeavePolicy() {
    const [configId, setConfigId] = useState<string | null>(null);
    const [state, setState] = useState<PolicyState>(DEFAULTS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const { data: { configuration } } = await fetchConfiguration(LEAVE_POLICY_KEY);
                if (configuration?.id) setConfigId(configuration.id);
                const raw = configuration?.configuration;
                const cfg = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
                const p = cfg.probation ?? {};
                const sp = cfg.sameDayPenalty ?? {};
                setState({
                    probationEnabled: !!p.enabled,
                    probationDurationDays: Number(p.durationDays) > 0 ? Number(p.durationDays) : 90,
                    allowUnpaidDuringProbation: p.allowUnpaidDuringProbation !== false,
                    allocationPriority:
                        Array.isArray(cfg.allocationPriority) && cfg.allocationPriority.length > 0
                            ? cfg.allocationPriority.map(String)
                            : DEFAULT_PRIORITY,
                    cumulativeOverflow: cfg.cumulativeOverflow === 'block' ? 'block' : 'spillToUnpaid',
                    penaltyEnabled: !!sp.enabled,
                    penaltyCutoffTime: sp.cutoffTime ?? '12:00',
                    penaltyType: sp.penaltyType === 'halfPaidLeave' ? 'halfPaidLeave'
                        : sp.penaltyType === 'fixedAmountDeduction' ? 'fixedAmountDeduction'
                        : 'halfDaySalaryDeduction',
                    penaltyFixedAmount: Number(sp.fixedDeductionAmount) || 0,
                });
            } catch {
                // No config yet — keep defaults; first save will create it.
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const move = (index: number, dir: -1 | 1) => {
        setState((s) => {
            const next = [...s.allocationPriority];
            const target = index + dir;
            if (target < 0 || target >= next.length) return s;
            [next[index], next[target]] = [next[target], next[index]];
            return { ...s, allocationPriority: next };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const configuration = {
                probation: {
                    enabled: state.probationEnabled,
                    durationDays: Number(state.probationDurationDays) || 90,
                    allowUnpaidDuringProbation: state.allowUnpaidDuringProbation,
                },
                allocationPriority: state.allocationPriority,
                cumulativeOverflow: state.cumulativeOverflow,
                sameDayPenalty: {
                    enabled: state.penaltyEnabled,
                    cutoffTime: state.penaltyCutoffTime || '12:00',
                    penaltyType: state.penaltyType,
                    fixedDeductionAmount: state.penaltyFixedAmount || 0,
                },
            };
            if (configId) {
                await updateConfigurationById(configId, { module: LEAVE_POLICY_KEY, configuration } as any);
            } else {
                await createNewConfiguration({ module: LEAVE_POLICY_KEY, configuration } as any);
            }
            await successConfirmation('Leave policy saved successfully');
        } catch (err) {
            console.error('Error saving leave policy:', err);
            errorConfirmation('Error saving leave policy');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Container fluid className="my-4 d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Container>
        );
    }

    return (
        <div className="container mt-4 mb-7 p-6" style={{ backgroundColor: '#FFFFFF', borderRadius: 10 }}>
            {/* Probation */}
            <h5 className="fw-bold mb-1">New-Joiner Probation</h5>
            <p className="text-muted fs-7 mb-4">
                During probation, paid leave is blocked — new joiners can only take Unpaid leave.
            </p>

            <div className="form-check form-switch mb-3">
                <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="probationEnabled"
                    checked={state.probationEnabled}
                    onChange={(e) => setState((s) => ({ ...s, probationEnabled: e.target.checked }))}
                />
                <label className="form-check-label fw-semibold" htmlFor="probationEnabled">
                    Enforce probation restriction
                </label>
            </div>

            {state.probationEnabled && (
                <div className="row g-3 mb-4 ms-1">
                    <div className="col-md-4">
                        <label className="form-label fs-7 text-muted">Probation length (days from joining)</label>
                        <input
                            type="number"
                            min={1}
                            className="form-control"
                            value={state.probationDurationDays}
                            onChange={(e) =>
                                setState((s) => ({ ...s, probationDurationDays: parseInt(e.target.value) || 0 }))
                            }
                        />
                    </div>
                    <div className="col-md-8 d-flex align-items-end">
                        <div className="form-check form-switch">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="allowUnpaidDuringProbation"
                                checked={state.allowUnpaidDuringProbation}
                                onChange={(e) =>
                                    setState((s) => ({ ...s, allowUnpaidDuringProbation: e.target.checked }))
                                }
                            />
                            <label className="form-check-label" htmlFor="allowUnpaidDuringProbation">
                                Allow Unpaid leave during probation
                            </label>
                        </div>
                    </div>
                </div>
            )}

            <hr />

            {/* Priority order */}
            <h5 className="fw-bold mb-1">Paid Leave Consumption Priority</h5>
            <p className="text-muted fs-7 mb-3">
                When a request spans multiple days, paid balances are consumed top-to-bottom; Unpaid is always used last.
            </p>
            <ul className="list-group mb-4" style={{ maxWidth: 420 }}>
                {state.allocationPriority.map((type, idx) => (
                    <li
                        key={type}
                        className="list-group-item d-flex align-items-center justify-content-between"
                    >
                        <span>
                            <span className="badge bg-light text-dark me-2">{idx + 1}</span>
                            {type}
                        </span>
                        <span>
                            <button
                                type="button"
                                className="btn btn-sm btn-light me-1"
                                disabled={idx === 0}
                                onClick={() => move(idx, -1)}
                                aria-label={`Move ${type} up`}
                            >
                                ↑
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-light"
                                disabled={idx === state.allocationPriority.length - 1}
                                onClick={() => move(idx, 1)}
                                aria-label={`Move ${type} down`}
                            >
                                ↓
                            </button>
                        </span>
                    </li>
                ))}
            </ul>

            <hr />

            {/* Cumulative overflow */}
            <h5 className="fw-bold mb-1">Cumulative Limit Overflow</h5>
            <p className="text-muted fs-7 mb-3">
                What to do when paid days exceed the cumulative monthly pacing limit.
            </p>
            <select
                className="form-select mb-4"
                style={{ maxWidth: 420 }}
                value={state.cumulativeOverflow}
                onChange={(e) =>
                    setState((s) => ({ ...s, cumulativeOverflow: e.target.value === 'block' ? 'block' : 'spillToUnpaid' }))
                }
            >
                <option value="spillToUnpaid">Book the excess as Unpaid leave</option>
                <option value="block">Block the request</option>
            </select>

            <hr />

            {/* Late Leave Apply Penalty */}
            <h5 className="fw-bold mb-1">Late Leave Apply Penalty</h5>
            <p className="text-muted fs-7 mb-4">
                Applies a penalty when an employee requests same-day leave after the cutoff time.
            </p>

            <div className="form-check form-switch mb-3">
                <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="penaltyEnabled"
                    checked={state.penaltyEnabled}
                    onChange={(e) => setState((s) => ({ ...s, penaltyEnabled: e.target.checked }))}
                />
                <label className="form-check-label fw-semibold" htmlFor="penaltyEnabled">
                    Enable late leave apply penalty
                </label>
            </div>

            {state.penaltyEnabled && (
                <div className="row g-3 mb-4 ms-1">
                    <div className="col-md-4">
                        <label className="form-label fs-7 text-muted">Cutoff time (24h, IST)</label>
                        <input
                            type="time"
                            className="form-control"
                            value={state.penaltyCutoffTime}
                            onChange={(e) => setState((s) => ({ ...s, penaltyCutoffTime: e.target.value }))}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label fs-7 text-muted">Penalty type</label>
                        <select
                            className="form-select"
                            value={state.penaltyType}
                            onChange={(e) =>
                                setState((s) => ({
                                    ...s,
                                    penaltyType: e.target.value as 'halfDaySalaryDeduction' | 'halfPaidLeave' | 'fixedAmountDeduction',
                                }))
                            }
                        >
                            <option value="halfDaySalaryDeduction">Deduct half-day salary (LOP)</option>
                            <option value="halfPaidLeave">Deduct half paid leave</option>
                            <option value="fixedAmountDeduction">Deduct fixed amount (₹)</option>
                        </select>
                    </div>
                    {state.penaltyType === 'fixedAmountDeduction' && (
                        <div className="col-md-4">
                            <label className="form-label fs-7 text-muted">Deduction amount (₹)</label>
                            <input
                                type="number"
                                min={1}
                                className="form-control"
                                title="Deduction amount in rupees"
                                value={state.penaltyFixedAmount}
                                onChange={(e) => setState((s) => ({ ...s, penaltyFixedAmount: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                    )}
                </div>
            )}

            <div>
                <button className="btn btn-primary" type="button" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                        <span>
                            Please wait.. <Spinner animation="border" size="sm" />
                        </span>
                    ) : (
                        'Save'
                    )}
                </button>
            </div>
        </div>
    );
}

export default LeavePolicy;
