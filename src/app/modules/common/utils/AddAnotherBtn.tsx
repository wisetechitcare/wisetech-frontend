import { WtButton } from "@app/modules/common/components/ui";

interface AddAnotherBtnProps {
  onClick: () => void;
}

/** Dashed full-width “Add Another” — kit button, not a Bootstrap/hand-styled control. */
function AddAnotherBtn({ onClick }: AddAnotherBtnProps) {
  return (
    <WtButton
      type="button"
      ghost
      fullWidth
      onClick={onClick}
      sx={{
        mt: 0.5,
        borderStyle: "dashed",
        borderWidth: 1,
        borderColor: "divider",
        color: "primary.main",
        fontWeight: 600,
        minHeight: 40,
        "&:hover": {
          borderStyle: "dashed",
          borderColor: "primary.main",
          bgcolor: "action.hover",
        },
      }}
    >
      Add Another
    </WtButton>
  );
}

export default AddAnotherBtn;
