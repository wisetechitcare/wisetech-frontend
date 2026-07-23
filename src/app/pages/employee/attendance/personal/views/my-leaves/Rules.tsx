// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassCard } from "@app/modules/common/components/ui/tw";

interface Rules {
    name: string;
    value: string;
}

const rules = [
    {
        name: 'Total shift time',
        value: '9:00 Hrs'
    },
    {
        name: 'Working time',
        value: '8:00 Hrs'
    },
    {
        name: 'Lunch time',
        value: '1:00 Hrs'
    },
    {
        name: 'Deduction time',
        value: '1:00 Hrs'
    },
];

function Rules() {

    return (
        <GlassCard preset="section">
            {rules.map((rule: Rules, index: number) => (
                <div key={rule.name}>
                    <div className="flex items-center justify-between py-2">
                        <span className="font-semibold text-slate-900">{rule.name}</span>
                        <span className="font-semibold text-slate-500">{rule.value}</span>
                    </div>
                    {index !== rules.length - 1 && <hr className="m-0 border-t border-slate-200" />}
                </div>
            ))}
        </GlassCard>
    );
}

export default Rules;
