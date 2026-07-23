import { useEffect, useState } from "react";
import { KTIcon } from '@metronic/helpers';
// Shared glass UI kit — single source of truth for the leave-management look.
import { GlassCard, WtButton, IconBox, StatusBadge, Spinner, TRIO } from "@app/modules/common/components/ui/tw";
import {
    fetchAllAddonLeavesAllowances,
    IAddonLeavesAllowance
} from "@services/addonLeavesAllowance";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import AddonLeavesModal from "@app/pages/employee/attendance/AttendanceConfig/component/AddonLeavesModal";

interface AddonLeavesAllowanceCardProps {
    onCardClick?: () => void;
}

function AddonLeavesAllowanceCard({ onCardClick }: AddonLeavesAllowanceCardProps = {}) {
    const [allowances, setAllowances] = useState<IAddonLeavesAllowance[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConfigModal, setShowConfigModal] = useState(false);

    const loadAllowances = async () => {
        try {
            setLoading(true);
            const response = await fetchAllAddonLeavesAllowances();
            if (!response?.hasError && response.data?.addonLeavesAllowances) {
                setAllowances(response.data.addonLeavesAllowances);
            }
        } catch (error) {
            console.error('Error loading addon leaves allowances:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllowances();
    }, []);

    // Real-time: reload tiers when addon allowances change anywhere in the app.
    useEventBus(EVENT_KEYS.addonLeavesAllowanceUpdated, () => {
        loadAllowances();
    });

    const handleConfigClose = () => {
        setShowConfigModal(false);
        loadAllowances();
    };

    const getAllowanceByExperience = (experience: number) => {
        return allowances.find(a => a.experienceInCompany === experience)?.addonLeavesCount || 0;
    };

    return (
        <>
            <GlassCard preset="section" className="sm:p-6">
                <div className="flex justify-between items-start sm:items-center gap-4 mb-5 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                        <IconBox icon="calendar-add" trio={TRIO.blue} size={44} fs="fs-1" />
                        <div className="min-w-0">
                            <p className="font-bold text-[18px] text-slate-900 m-0">Addon Leaves Allowance</p>
                            <p className="text-[14px] text-slate-500 mt-0.5 m-0">
                                Configure additional leave days based on employee experience
                            </p>
                        </div>
                    </div>
                    <WtButton
                        onClick={(e) => { e.stopPropagation(); setShowConfigModal(true); }}
                        startIcon={<KTIcon iconName="setting-2" className="fs-5 text-white" />}
                        className="w-full sm:w-auto"
                    >
                        Configure
                    </WtButton>
                </div>

                {loading ? (
                    <div className="text-center py-10">
                        <Spinner size={40} />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((experience) => {
                            const addonLeaves = getAllowanceByExperience(experience);
                            const isConfigured = allowances.some(a => a.experienceInCompany === experience && a.addonLeavesCount > 0);
                            const trio = isConfigured ? TRIO.green : TRIO.slate;

                            return (
                                <GlassCard key={experience} preset="tile" accentEdge={isConfigured ? "green" : false}
                                    className="text-center py-5 px-3">
                                    <div className="w-[50px] h-[50px] rounded-full mx-auto mb-3 grid place-items-center border font-extrabold text-[20px]"
                                        style={{ backgroundColor: trio.bg, borderColor: trio.bd, color: trio.c }}>
                                        {experience === 11 ? "10+" : experience}
                                    </div>
                                    <p className="font-bold text-[13.5px] text-slate-900 mb-1 m-0">
                                        {experience === 11 ? "10+ Years Experience" : `${experience} Year${experience > 1 ? "s" : ""} Experience`}
                                    </p>
                                    <p className="font-bold text-[18px] text-slate-500 m-0" style={isConfigured ? { color: TRIO.green.c } : undefined}>
                                        {addonLeaves}
                                        <span className="text-[13px] text-slate-500 ml-1">
                                            addon leave{addonLeaves !== 1 ? "s" : ""}
                                        </span>
                                    </p>
                                    <div className="mt-2 flex justify-center">
                                        <StatusBadge trio={trio} label={isConfigured ? "Configured" : "Default (0)"} />
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}

                {!loading && allowances.length > 0 && (
                    <GlassCard preset="row" accentEdge="blue" className="mt-5 flex items-start gap-3">
                        <IconBox icon="information-5" trio={TRIO.blue} size={38} fs="fs-3" />
                        <div>
                            <p className="font-bold text-[14px] text-slate-900 mb-0.5 m-0">How Addon Leaves Work</p>
                            <p className="text-[13px] text-slate-500 leading-normal m-0">
                                Employees receive additional leave days based on their years of experience in the company.
                                These addon leaves are calculated automatically and added to their base leave allowance.
                            </p>
                        </div>
                    </GlassCard>
                )}
            </GlassCard>

            {/* Self-contained Glass Dialog */}
            <AddonLeavesModal open={showConfigModal} onClose={handleConfigClose} />
        </>
    );
}

export default AddonLeavesAllowanceCard;
