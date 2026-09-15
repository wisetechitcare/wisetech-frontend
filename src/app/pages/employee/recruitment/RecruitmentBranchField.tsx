import type { SxProps, Theme } from "@mui/material";
import { WtField } from "@app/modules/common/components/ui";
import { useRecruitmentBranches } from "@/hooks/useRecruitmentBranches";

/**
 * The Branch field on a requisition or an offer.
 *
 * One component for both forms, because the branch is what decides the currency of every
 * salary on the record, and two copies would disagree about labels, the empty state or what
 * "no branch" means. It says which currency the branch uses right under the field, so choosing
 * a branch visibly changes the salary fields beside it.
 *
 * A long list becomes searchable; a family with several orgs shows which org each branch
 * belongs to, because "Head Office" alone is ambiguous across them.
 */
interface Props {
    value: string | null | undefined;
    onChange: (branchId: string) => void;
    required?: boolean;
    /** Read-only, e.g. on a record whose terms are frozen. */
    disabled?: boolean;
    /** A server or form message; replaces the currency hint when set. */
    error?: string;
    sx?: SxProps<Theme>;
}

/** Past this many branches a plain menu becomes a scroll hunt, so the field turns searchable. */
const SEARCHABLE_FROM = 8;

export const RecruitmentBranchField = ({ value, onChange, required, disabled, error, sx }: Props) => {
    const { branches, byId, isLoading, isError, spansOrgs } = useRecruitmentBranches();
    const selected = value ? byId.get(value) : undefined;

    const options = branches.map((b) => ({
        value: b.id,
        label: spansOrgs && b.companyName ? `${b.name} · ${b.companyName}` : b.name,
    }));

    const message = error
        ?? (isError ? "Could not load branches. Refresh to try again." : undefined)
        ?? (!isLoading && !branches.length ? "No active branches yet — add one under Company › Branches first." : undefined);

    return (
        <WtField
            label="Branch"
            required={required}
            value={selected ? selected.id : ""}
            onChange={onChange}
            options={options}
            searchable={options.length >= SEARCHABLE_FROM}
            placeholder={isLoading ? "Loading branches…" : "Choose a branch"}
            disabled={disabled || isLoading || isError || !branches.length}
            error={message}
            hint={selected ? `Salaries are in ${selected.currency}` : "Decides the currency salaries are in"}
            icon="geolocation"
            sx={sx}
        />
    );
};

export default RecruitmentBranchField;
