import { Suspense, lazy } from 'react';
import type { MaterialTableProps } from './MaterialTableImpl';

/**
 * Lazy boundary for the table engine.
 *
 * MaterialTableImpl is imported by 88 pages. Because those pages are themselves
 * lazy routes, Rollup hoisted the shared module into the ENTRY chunk — the
 * engine and, through it, material-react-table (the 284KB vendor-table chunk)
 * were downloaded on first load even by users landing on a route with no table
 * on it. Measured: the impl's body was inside the 3.4MB index chunk.
 *
 * The dynamic import here creates the split point, so all 88 call sites get
 * on-demand loading from one place instead of 88 React.lazy() edits.
 *
 * Keep this file dependency-free — no MUI, no MRT, no kit imports. Anything
 * imported here lands back in the entry chunk and undoes the split. That is why
 * the fallback below is plain Tailwind rather than the shared skeleton.
 */
const MaterialTableImpl = lazy(() => import('./MaterialTableImpl'));

// Literal class strings, not computed widths: Tailwind's JIT scans source text,
// so a runtime-built `basis-[${n}%]` would never be generated.
const SKELETON_COLUMNS = [
    'basis-[22%]',
    'basis-[16%]',
    'basis-[18%]',
    'basis-[14%]',
    'basis-[20%]',
    'basis-[12%]',
];

/** Cheap stand-in while the engine chunk downloads. Mirrors the impl's own
 *  skeleton so the transition into the real table isn't a visual jump. */
function TableChunkSkeleton() {
    return (
        <div
            className="overflow-hidden rounded-xl border border-[#EAECF0] bg-white dark:border-[#30363d] dark:bg-[#0d1117]"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">Loading table…</span>
            <div className="flex h-12 items-center gap-4 border-b-2 border-[#EAECF0] bg-[#FAFBFC] px-4 dark:border-[#30363d] dark:bg-[#161b22]">
                {SKELETON_COLUMNS.map((basis) => (
                    <div
                        key={basis}
                        className={`h-3 shrink-0 grow-0 animate-pulse rounded bg-[#E5E7EB] dark:bg-[#30363d] ${basis}`}
                    />
                ))}
            </div>
            {[0, 1, 2, 3, 4].map((row) => (
                <div
                    key={row}
                    className="flex h-[52px] items-center gap-4 border-b border-[#F3F4F6] px-4 dark:border-[#21262d]"
                >
                    {SKELETON_COLUMNS.map((basis) => (
                        <div
                            key={basis}
                            className={`h-3 shrink-0 grow-0 animate-pulse rounded bg-[#F3F4F6] dark:bg-[#21262d] ${basis}`}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}

function MaterialTable(props: MaterialTableProps) {
    return (
        <Suspense fallback={<TableChunkSkeleton />}>
            <MaterialTableImpl {...props} />
        </Suspense>
    );
}

export type { MaterialTableProps };
export default MaterialTable;
