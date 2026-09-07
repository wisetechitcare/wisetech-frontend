/**
 * The "New Announcement" launcher.
 *
 * The form it used to carry inline now lives in `AnnouncementFormDialog`, shared with the edit
 * path on the announcements page — this is just the permission check and the button.
 */
import { useState } from "react";
import { KTIcon } from "@metronic/helpers";
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { WtButton } from "@app/modules/common/components/ui";
import AnnouncementFormDialog from "@pages/company/announcement/AnnouncementFormDialog";

function CreateAnnouncementButton({
  setRefetch,
  refetch,
}: {
  setRefetch: (value: boolean) => void;
  refetch: boolean;
}) {
  const [show, setShow] = useState(false);

  const canCreate = hasPermission(
    resourceNameMapWithCamelCase.announcement,
    permissionConstToUseWithHasPermission.create
  );

  if (!canCreate) return null;

  return (
    <>
      <WtButton
        onClick={() => setShow(true)}
        startIcon={<KTIcon iconName="plus" className="fs-5" />}
      >
        new announcement
      </WtButton>

      <AnnouncementFormDialog
        open={show}
        onClose={() => setShow(false)}
        onSaved={() => setRefetch(!refetch)}
      />
    </>
  );
}

export default CreateAnnouncementButton;
