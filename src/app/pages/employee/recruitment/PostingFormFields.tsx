import { Stack } from "@mui/material";
import { WtField, WtDateField, WtSwitchField } from "@app/modules/common/components/ui";
import { SEARCHABLE_FROM } from "@utils/requisitions";
import type { PostingPayload } from "@services/recruitment";

export interface PostingRoleOption {
    id: string;
    title: string;
    prefix?: string | null;
}

export interface PostingFormFieldsProps {
    value: PostingPayload;
    onChange: (next: PostingPayload) => void;
    /** When set, show Role picker (attach-to-existing advert flow). */
    roleOptions?: PostingRoleOption[];
    rolesLoading?: boolean;
    roleLocked?: boolean;
    roleError?: string;
    /** Show the Publish immediately / Published switch (modal only; wizard uses footer). */
    showPublishSwitch?: boolean;
    isEditing?: boolean;
    disabled?: boolean;
}

/**
 * Public advert fields — one UI for Adverts modal and Create Role wizard.
 * Screening questions stay on `ApplyFormConfigBuilder` (caller composes).
 */
export function PostingFormFields({
    value,
    onChange,
    roleOptions,
    rolesLoading = false,
    roleLocked = false,
    roleError,
    showPublishSwitch = false,
    isEditing = false,
    disabled = false,
}: PostingFormFieldsProps) {
    const patch = (partial: Partial<PostingPayload>) => onChange({ ...value, ...partial });
    const showRole = roleOptions !== undefined;

    return (
        <Stack spacing={2}>
            {showRole && (
                <WtField
                    label="Role"
                    required
                    fullWidth
                    value={value.requisitionId ?? ""}
                    onChange={(v) => patch({ requisitionId: v })}
                    options={roleOptions!.map((r) => ({
                        value: r.id,
                        label: r.prefix ? `${r.prefix} · ${r.title}` : r.title,
                    }))}
                    searchable={roleOptions!.length >= SEARCHABLE_FROM}
                    placeholder={
                        rolesLoading
                            ? "Loading roles…"
                            : roleOptions!.length
                              ? "Choose an approved role"
                              : "No approved roles yet"
                    }
                    disabled={roleLocked || rolesLoading || disabled}
                    error={roleError}
                    hint={
                        roleLocked
                            ? "The role an advert points at cannot be changed — its public link was minted for this one. Remove the advert and post the role again."
                            : "Only approved, open roles can be advertised."
                    }
                />
            )}
            <WtField
                label="Public Title"
                fullWidth
                value={value.title ?? ""}
                onChange={(v) => patch({ title: v })}
                disabled={disabled}
                hint="Defaults to the role's own title if left blank."
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <WtField
                    label="Location"
                    sx={{ flex: 1 }}
                    value={value.location ?? ""}
                    onChange={(v) => patch({ location: v })}
                    disabled={disabled}
                />
                <WtField
                    label="Employment Type"
                    sx={{ flex: 1 }}
                    value={value.employmentType ?? ""}
                    onChange={(v) => patch({ employmentType: v })}
                    disabled={disabled}
                />
            </Stack>
            <WtDateField
                label="Closes On"
                value={value.expiresAt ?? ""}
                onChange={(v) => patch({ expiresAt: v || null })}
                helperText="After this date the advert comes off the careers page on its own. Leave blank to keep it up until you take it down."
                disabled={disabled}
            />
            <WtField
                label="Public Description"
                fullWidth
                multiline
                minRows={4}
                value={value.descriptionHtml ?? ""}
                onChange={(v) => patch({ descriptionHtml: v })}
                disabled={disabled}
                hint="What a candidate reads. The internal job description is not published."
            />
            <WtSwitchField
                title="Remote"
                checked={!!value.isRemote}
                onChange={(e) => patch({ isRemote: e.target.checked })}
                disabled={disabled}
            />
            <WtSwitchField
                title="Show Salary Range Publicly"
                description="Puts this role's CTC band on the careers page and in its Google listing. Off by default — it is internal pay data, and once published it cannot be unseen."
                checked={!!value.showSalary}
                onChange={(e) => patch({ showSalary: e.target.checked })}
                disabled={disabled}
            />
            {showPublishSwitch && (
                <WtSwitchField
                    title={isEditing ? "Published" : "Publish immediately"}
                    description="Make it live on the careers page."
                    checked={!!value.isPublished}
                    onChange={(e) => patch({ isPublished: e.target.checked })}
                    disabled={disabled}
                />
            )}
        </Stack>
    );
}

export default PostingFormFields;
