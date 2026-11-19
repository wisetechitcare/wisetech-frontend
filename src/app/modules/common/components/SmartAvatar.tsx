import React from "react";
import { SmartAvatar as KitSmartAvatar, type SmartAvatarStatus } from "@/ds/ui/smart-avatar";

/**
 * Legacy prop names for the kit's SmartAvatar (`@/ds/ui/smart-avatar`), kept so existing call sites read
 * unchanged. The look and behaviour live ONLY in the kit; new code imports the kit component directly.
 */
export type AvatarStatus = SmartAvatarStatus;

interface Props {
  name?: string | null;
  id?: string | number | null;
  imageUrl?: string | null;
  size?: number;
  status?: AvatarStatus | null;
  /** Logos default to `contain` (never cropped); pass `cover` for photos of people. */
  imageFit?: "contain" | "cover";
  shape?: "circle" | "rounded";
  /** Clicking a loaded image opens it full size. */
  enablePreview?: boolean;
  className?: string;
}

const SmartAvatar: React.FC<Props> = ({
  name, id, imageUrl, size = 56, status, imageFit = "contain", shape = "circle", enablePreview = false, className,
}) => (
  <KitSmartAvatar
    name={name}
    seed={id ?? name}
    src={imageUrl}
    size={size}
    status={status}
    fit={imageFit}
    shape={shape}
    preview={enablePreview}
    className={className}
  />
);

export default SmartAvatar;
