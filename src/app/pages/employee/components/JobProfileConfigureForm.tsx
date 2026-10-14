import React, { useState } from "react";
import { Box } from "@mui/material";
import { Formik } from "formik";
import * as Yup from "yup";
import { createDesignation, updateDesignationById } from "@services/options";
import { apiErrorMessage } from "@utils/apiError";
import {
  ConfigureFormDialog,
  InlineHint,
  WtFieldFormik,
  toast,
} from "@app/modules/common/components/ui";
import HierarchicalTaskSelect, { buildTaskOptions } from "@app/pages/employee/tasks/components/HierarchicalTaskSelect";
import { PATH_SEPARATOR, getPresetPath, getPresetSubtreeIds } from "@utils/presetTaskHierarchy";

export interface JobProfileItem {
  id: string;
  /** Display name. Mapped from the designation row's `role` column by the caller. */
  name: string;
  /** Carried through so an edit can round-trip them — see handleSubmit. */
  companyId?: string;
  isActive?: boolean;
  /** Null / absent for a top-level profile. Mapped from the designation row. */
  parentId?: string | null;
}

interface JobProfileFormProps {
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: JobProfileItem | null;
  isEditing?: boolean;
  /** Company to file a NEW job profile under; resolved by the parent from the list. */
  companyId?: string;
  /** Create the new profile UNDER this one. Absent creates a top-level profile. */
  parentId?: string | null;
  /** The parent's name, so the dialog can say where the new profile will land. */
  parentName?: string | null;
  /**
   * Every profile, flat. Feeds the Parent picker — without it the 24 existing
   * profiles could only ever sit at the top level, since [Add child] on the tree
   * CREATES a node and cannot move one that already exists.
   */
  allProfiles?: JobProfileItem[];
}

const validationSchema = Yup.object().shape({
  name: Yup.string().trim().required("Job profile name is required"),
});

/**
 * Create / rename a job profile.
 *
 * Backed by the DESIGNATIONS table, which is what the onboarding "Job Profile"
 * dropdown actually reads. This card used to manage employee_configurations
 * (JOB_PROFILE) instead — a separate table nothing consumed, so anything added here
 * never appeared in the form while the 24 real designations could not be edited from
 * this screen at all.
 *
 * The column is `role`, not `name`; the label stays "Job Profile" because that is what
 * the form calls it.
 */
const JobProfileConfigureForm: React.FC<JobProfileFormProps> = ({
  show,
  onClose,
  onSuccess,
  initialData,
  isEditing = false,
  companyId,
  parentId,
  parentName,
  allProfiles = [],
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Any profile may be the parent, at any depth — EXCEPT the one being edited and
  // everything beneath it, which would detach that subtree from every root. The server
  // rejects those moves too; excluding them here keeps the invalid choice off-screen.
  const parentOptions = React.useMemo(
    () => buildTaskOptions(allProfiles, getPresetSubtreeIds(allProfiles, initialData?.id)),
    [allProfiles, initialData?.id],
  );

  const pathFor = (id?: string) => (id ? getPresetPath(allProfiles, id) : []);

  const initialValues = {
    name: initialData?.name || "",
    // Preset from the tree's [Add child] action, or the row's current parent when
    // editing — so opening a nested profile shows where it already sits.
    parentId: parentId ?? initialData?.parentId ?? "",
  };

  const handleSubmit = async (values: typeof initialValues) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const role = values.name.trim();
      if (isEditing && initialData?.id) {
        // Both schemas are `.strict(true)` and require role + isActive + companyId, so
        // a name-only payload is rejected. isActive is round-tripped from the row on
        // purpose: the older Designations screen hardcodes `isActive: false` here and
        // the handler passes the body straight to Prisma, so editing there silently
        // retires the designation. Preserving the current value avoids that.
        // `parentId` IS sent, and `null` is meaningful — it moves the profile back to
        // the top level. The picker is the only way to re-parent one of the profiles
        // that already exist, so an edit has to be able to say "no parent".
        await updateDesignationById(initialData.id, {
          role,
          companyId: initialData.companyId,
          isActive: initialData.isActive ?? true,
          parentId: values.parentId || null,
        });
        toast({ icon: "success", title: "Job profile updated" });
      } else {
        if (!companyId) {
          setError("Could not determine the company to add this job profile to.");
          return;
        }
        // The create endpoint takes a LIST — it was built for bulk seeding.
        await createDesignation([{ role, companyId, isActive: true, parentId: values.parentId || null }]);
        toast({ icon: "success", title: "Job profile created" });
      }
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, `Failed to ${isEditing ? "update" : "create"} job profile`));
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtitle =
    !isEditing && parentName ? `Under “${parentName}”` : undefined;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(fk) => (
        <ConfigureFormDialog
          open={show}
          onClose={onClose}
          title={`${isEditing ? "Edit" : "New"} Job Profile`}
          subtitle={subtitle}
          saving={isSubmitting}
          error={error}
          onSubmit={fk.handleSubmit}
          submitLabel={isEditing ? "Update" : "Create"}
        >
          <WtFieldFormik
            name="name"
            label="Job Profile Name"
            required
            autoFocus
            placeholder="e.g. Junior Engineers, Senior Draughtsman"
            disabled={isSubmitting}
          />

          {/* Parent — HierarchicalTaskSelect stays until the tree picker is kit-migrated. */}
          <Box>
            <HierarchicalTaskSelect
              formikField="parentId"
              inputLabel={
                <>
                  Parent Job Profile{" "}
                  <Box component="span" sx={{ color: "text.secondary", fontWeight: 400, ml: 0.5 }}>
                    (optional)
                  </Box>
                </>
              }
              options={parentOptions}
              placeholder="None — top-level job profile"
              helpText={
                <Box sx={{ mt: 1, fontSize: 12, color: "text.secondary" }}>
                  {fk.values.parentId ? (
                    <>
                      <Box component="span" sx={{ fontWeight: 500 }}>Parent:</Box>{" "}
                      {pathFor(fk.values.parentId).join(PATH_SEPARATOR)}
                      {fk.values.name ? (
                        <>
                          <br />
                          <Box component="span" sx={{ fontWeight: 500 }}>
                            {isEditing ? "Full hierarchy:" : "Will be created as:"}
                          </Box>{" "}
                          {[...pathFor(fk.values.parentId), fk.values.name].join(PATH_SEPARATOR)}
                        </>
                      ) : null}
                    </>
                  ) : (
                    "Leave empty for a top-level profile. Pick any profile to file this one under it."
                  )}
                </Box>
              }
            />
          </Box>

          <InlineHint>
            Also listed as “Designations” under Organization Profile → Configure.
          </InlineHint>
        </ConfigureFormDialog>
      )}
    </Formik>
  );
};

export default JobProfileConfigureForm;
