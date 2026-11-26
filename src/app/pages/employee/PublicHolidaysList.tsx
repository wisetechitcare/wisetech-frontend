import { useMemo, useState, useEffect } from "react";
import { fetchPublicHolidays } from "@services/company";
import dayjs from 'dayjs';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';
import { Badge } from '@/ds/ui/badge';

interface PublicHoliday {
    id: string
    title: string
    date: string
    color: string
    fixed: boolean
}

function PublicHolidaysList() {
    const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentYear] = useState(new Date().getFullYear() + '');
    const country = 'India';

    useEffect(() => {
        const getAllPublicHolidays = async () => {
            setLoading(true);
            try {
                const { data: { publicHolidays } } = await fetchPublicHolidays(currentYear, country)
                const transformedRes = publicHolidays.map((holiday: { name: string; colorCode: string; date: string; isFixed: boolean }, i: number) => ({
                    id: `${holiday.date}-${i}`,
                    title: holiday.name,
                    color: holiday.colorCode,
                    date: dayjs(holiday.date).format('YYYY.MM.DD'),
                    fixed: holiday.isFixed,
                }));
                setHolidays(transformedRes);
            } catch (error) {
                console.error("Error fetching Public Holidays:", error);
            } finally {
                setLoading(false);
            }
        };
        void getAllPublicHolidays();
    }, [currentYear, country]);

    const columns = useMemo<ColumnDef<PublicHoliday>[]>(() => [
        {
            accessorKey: 'date',
            meta: { label: 'Holiday Date', wrap: false },
            header: ({ column }) => <SortableHeader column={column} title="Holiday Date" />,
        },
        {
            accessorKey: 'title',
            meta: { label: 'Holiday Name' },
            header: ({ column }) => <SortableHeader column={column} title="Holiday Name" />,
        },
        {
            accessorKey: 'fixed',
            meta: {
                label: 'Fixed Holiday',
                wrap: false,
                exportValue: (r) => (r.fixed ? 'Yes' : 'No'),
            },
            header: 'Fixed Holiday',
            cell: ({ row }) => (
                <Badge variant={row.original.fixed ? 'success' : 'danger'} dot>
                    {row.original.fixed ? 'Yes' : 'No'}
                </Badge>
            ),
        },
        {
            accessorKey: 'color',
            meta: { label: 'Color', wrap: false, export: false },
            header: 'Color',
            cell: ({ row }) => (
                <span
                    className="inline-block size-4 rounded-sm border border-border"
                    style={{ backgroundColor: row.original.color || 'var(--foreground)' }}
                    title={row.original.color || '—'}
                    aria-label={row.original.color ? `Color ${row.original.color}` : 'No color'}
                />
            ),
        },
    ], [])

    return (
        <div className="mt-5 space-y-3">
            <h3 className="text-base font-semibold">Public Holidays Lists</h3>
            <DataTable
                caption="Public Holidays"
                columns={columns}
                data={holidays}
                getRowId={(r) => r.id}
                loading={loading}
                stateKey="company.publicHolidays"
                toolbar={(ctx) => (
                    <DataTableExport columns={columns} ctx={ctx} filename="Public Holidays" />
                )}
            />
        </div>
    );
}

export default PublicHolidaysList;
