import React, { useEffect, useState } from 'react';
import { getAllPaymentPlans, deletePaymentPlan } from '@services/paymentPlan';
import { getAllProjectCategories, getAllProjectSubcategories } from '@services/projects';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';
import { deleteConfirmation } from '@utils/modal';
import { PaymentPlan } from '@models/leads';
import type { CategoryLike, SubCategoryLike } from '@utils/categoryScope';
import { ChipGrid, ConfigSectionCard, EmptyState, C, FONT, RADIUS } from '@app/modules/configuration';
import { ToneChip } from '@app/modules/common/components/ui/chips';
import PaymentPlanModal from './PaymentPlanModal';

/**
 * Payment plans, and through them the deliverables — ONE component, mounted in two places.
 *
 * ─── WHY IT IS A COMPONENT AND NOT A COPY ────────────────────────────────────
 * It renders on Projects → Configure and on Tasks → Configure → Deliverables. Those are two
 * routes onto the same configuration, so a plan added from either has to appear in the other.
 * Copying the card into the second page would have satisfied the screenshot and nothing else:
 * two fetches, two delete handlers and two chips to keep in step, and the first divergence
 * would be silent — a plan created on one page simply missing from the other.
 *
 * It therefore takes NO props and owns everything it needs: its own fetch, its own modal, its
 * own delete. Dropping it into a third page is one line, and there is no state for a host page
 * to hold, forget to refresh, or hold differently from its neighbour.
 *
 * ─── DELIVERABLES LIVE INSIDE A PLAN'S STAGES ────────────────────────────────
 * There is no free-standing deliverable: one belongs to a stage, a stage belongs to a plan.
 * The Deliverables tab is therefore this list, and editing a plan opens the stage tree where
 * deliverables are actually written (PaymentPlanModal → PaymentPlanStagesTree →
 * StageDeliverableList).
 *
 * The event bus is what keeps the two mounts honest while both are alive: the modal announces
 * a create, update or delete, and every mounted copy refetches. A page-local callback would
 * only ever refresh the page it was declared on.
 */
const PaymentPlanChip: React.FC<{
    plan: PaymentPlan;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ plan, onEdit, onDelete }) => {
    const [hov, setHov] = useState(false);
    const stageCount = plan.stages?.length || 0;
    const total = (plan.stages || []).reduce(
        (sum, s) => sum + (parseFloat(String(s.percentage)) || 0),
        0,
    );
    const roundedTotal = Math.round(total * 1000) / 1000;
    const balanced = roundedTotal === 100;
    // `plan.name` is the server-derived project-type label — a plan has no name of its own.
    const scopeLabel = plan.name || '';

    return (
        <div
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
                backgroundColor: hov ? '#ffffff' : '#f7f8fa',
                border: `1px solid ${hov ? '#d1d5e0' : '#eaecf0'}`,
                borderRadius: RADIUS.lg,
                padding: '12px 14px',
                transition: 'all 0.15s ease',
                boxShadow: hov ? '0 4px 14px rgba(24,28,50,0.09)' : '0 1px 3px rgba(24,28,50,0.04)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            fontFamily: FONT.body, fontWeight: 600, fontSize: '13px', color: C.textPrimary,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {scopeLabel || 'No project category'}
                        </span>
                        {/* The kit's chip rather than the hand-rolled green span this section
                            carried: the hex pair in that span stayed the same colour in dark
                            mode, which is what the styling rule is there to stop. */}
                        {plan.isDefault && (
                            <ToneChip
                                tone="success"
                                dense
                                label="Default"
                                sx={{ flexShrink: 0, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.4px' }}
                            />
                        )}
                    </div>
                    <div style={{ marginTop: 4, fontFamily: FONT.body, fontSize: '11.5px', color: C.textMuted }}>
                        {stageCount} stage{stageCount === 1 ? '' : 's'}
                        {' · '}
                        <span style={{ color: balanced ? '#0A5C2A' : C.danger, fontWeight: 600 }}>
                            {roundedTotal}%
                        </span>
                    </div>
                    {/* Plans written before they carried a project type fall back to a placeholder
                        title, so say what to do about it rather than leaving it unexplained. */}
                    {!plan.categoryId && (
                        <div style={{ marginTop: 2, fontFamily: FONT.body, fontSize: '11px', color: C.danger }}>
                            Edit to set its project category
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: hov ? 1 : 0.35, transition: 'opacity 0.15s ease' }}>
                    <button
                        onClick={onEdit}
                        style={{
                            background: hov ? '#eff6ff' : 'transparent', border: 'none', borderRadius: RADIUS.sm,
                            padding: '4px 7px', cursor: 'pointer', color: '#4f82c4', display: 'flex', alignItems: 'center',
                        }}
                    >
                        <i className="bi bi-pencil" style={{ fontSize: '11px' }} />
                    </button>
                    <button
                        onClick={onDelete}
                        style={{
                            background: hov ? '#fff5f8' : 'transparent', border: 'none', borderRadius: RADIUS.sm,
                            padding: '4px 7px', cursor: 'pointer', color: C.danger, display: 'flex', alignItems: 'center',
                        }}
                    >
                        <i className="bi bi-trash" style={{ fontSize: '11px' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const PaymentPlansSection: React.FC = () => {
    const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<PaymentPlan | null>(null);
    // The project-category tree the plan's picker offers. Loaded HERE rather than taken as a
    // prop: this section is mounted on two pages and only one of them happens to have the tree
    // already. Left to the host, the picker opens empty on the other — and on an edit the
    // stored category cannot be resolved to a label either, so it reads as "nothing selected"
    // when something very much is.
    const [categories, setCategories] = useState<CategoryLike[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategoryLike[]>([]);

    const fetchPaymentPlans = async () => {
        try {
            setLoading(true);
            const response = await getAllPaymentPlans();
            if (response?.paymentPlans) setPaymentPlans(response.paymentPlans);
        } catch (error) {
            console.error('Error fetching payment plans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const confirmed = await deleteConfirmation('Payment plan deleted successfully');
            if (!confirmed) return;
            await deletePaymentPlan(id);
            fetchPaymentPlans();
        } catch (error) {
            console.error('Error deleting payment plan:', error);
        }
    };

    const fetchCategoryTree = async () => {
        try {
            const [cats, subs] = await Promise.all([
                getAllProjectCategories(),
                getAllProjectSubcategories(),
            ]);
            if (cats?.projectCategories) setCategories(cats.projectCategories);
            if (subs?.projectSubCategories) setSubCategories(subs.projectSubCategories);
        } catch (error) {
            console.error('Error fetching project category tree:', error);
        }
    };

    useEffect(() => { fetchPaymentPlans(); fetchCategoryTree(); }, []);

    // Both mounts refetch on the same three events, which is what makes "add it here and it
    // shows up there" true while the other page is open rather than only after a reload.
    useEventBus(EVENT_KEYS.paymentPlanCreated, fetchPaymentPlans);
    useEventBus(EVENT_KEYS.paymentPlanUpdated, fetchPaymentPlans);
    useEventBus(EVENT_KEYS.paymentPlanDeleted, fetchPaymentPlans);

    return (
        <>
            <ConfigSectionCard
                title="Payment Plans"
                description="Define stage-wise fee break-up plans. On a project, selecting a plan auto-splits the total commercial cost across its stages by percentage."
                icon="bi-cash-stack"
                iconColor="green"
                primaryAction={{
                    label: 'New Plan',
                    icon: 'bi-plus-lg',
                    onClick: () => { setEditing(null); setShowModal(true); },
                    variant: 'primary',
                }}
                loading={loading}
            >
                {paymentPlans.length === 0
                    ? <EmptyState label="payment plans" />
                    : (
                        <ChipGrid>
                            {paymentPlans.map((plan) => (
                                <PaymentPlanChip
                                    key={plan.id}
                                    plan={plan}
                                    onEdit={() => { setEditing(plan); setShowModal(true); }}
                                    onDelete={() => handleDelete(plan.id!)}
                                />
                            ))}
                        </ChipGrid>
                    )
                }
            </ConfigSectionCard>

            <PaymentPlanModal
                show={showModal}
                onClose={() => { setShowModal(false); setEditing(null); }}
                onSuccess={fetchPaymentPlans}
                initialData={editing}
                isEditing={!!editing}
                categories={categories}
                subCategories={subCategories}
            />
        </>
    );
};

export default PaymentPlansSection;
