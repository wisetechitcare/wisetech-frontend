import { useEffect, useState } from "react";
import dayjs from "dayjs";
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassCard } from "@app/modules/common/components/ui/tw";
import { fetchPublicHolidays } from "@services/company";

function Holidays() {
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {

        async function fetchHolidays() {

            const { data: { publicHolidays } } = await fetchPublicHolidays('2024', 'India');

            setHolidays(publicHolidays);

        }

        fetchHolidays();
    }, []);

    return (
        <GlassCard preset="section">
            {holidays.map((rule: any, index: number) => (
                <div key={rule.date ?? index}>
                    <div className="flex items-center justify-between gap-2 py-2">
                        <span className="font-semibold text-slate-900">{rule.holiday.name}</span>
                        <span className="font-semibold text-slate-500 whitespace-nowrap">{dayjs(rule.date).format('DD/MM/YYYY')}</span>
                    </div>
                    {index !== holidays.length - 1 && <hr className="m-0 border-t border-slate-200" />}
                </div>
            ))}
        </GlassCard>
    );
}

export default Holidays;
