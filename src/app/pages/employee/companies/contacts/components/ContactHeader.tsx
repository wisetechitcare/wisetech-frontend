import React from "react";
import { Box, Link, Stack, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";
import {
  AppIcon,
  GlassSurface,
  ToneChip,
  WtButton,
  WtIconButton,
} from "@app/modules/common/components/ui";

/**
 * The contact identity card.
 *
 * It replaces a header that showed a name, a role and a lone Edit button — every way to
 * actually REACH the person (phone, email, address) lived one tab away in Overview. Here
 * the phone number and the email address are the links themselves, so reading the header
 * and acting on it are the same gesture.
 *
 * Actions grey out from the data rather than from a flag: no phone on file, no Call. The
 * disabled styling is `WtButton`'s own (correct in light AND dark) — the reason why goes
 * in a tooltip, because a grey button that won't say what's missing is just a dead end.
 */

/** `tel:` wants digits and an optional leading `+`; people type spaces, dashes, brackets. */
const telHref = (phone?: string | null): string | null => {
  const dialable = (phone || "").replace(/[^\d+]/g, "");
  return dialable.replace(/\D/g, "").length >= 6 ? `tel:${dialable}` : null;
};

const mailHref = (email?: string | null): string | null => {
  const address = (email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) ? `mailto:${address}` : null;
};

interface Props {
  contact: any;
  onBack: () => void;
  onEdit: () => void;
  onScheduleMeeting: () => void;
}

const ContactHeader: React.FC<Props> = ({ contact, onBack, onEdit, onScheduleMeeting }) => {
  const navigate = useNavigate();

  const phone = contact?.phone || contact?.phone2 || null;
  const tel = telHref(phone);
  const mail = mailHref(contact?.email);

  // The admin-configured status owns both the label and the colour; `isContactActive` is
  // derived from its name on save, so it is only the fallback for rows saved without one.
  const statusName: string =
    contact?.ClientContactStatus?.name ||
    (contact?.isContactActive === false ? "Inactive" : "Active");
  const statusColor: string | undefined = contact?.ClientContactStatus?.color || undefined;

  const services: string[] = (contact?.serviceMappings || [])
    .map((m: any) => m?.service?.name)
    .filter(Boolean);

  const company = contact?.company;
  const location = [contact?.city, contact?.state, contact?.country].filter(Boolean).join(", ");

  const metaDot = (
    <Box component="span" sx={{ color: "text.disabled", userSelect: "none" }}>
      ·
    </Box>
  );

  /** A greyed action still has to say what is missing. */
  const action = (
    label: string,
    icon: string,
    href: string | null,
    missing: string,
    onClick?: () => void
  ) => (
    <Tooltip title={href || onClick ? "" : missing} disableInteractive>
      <Box component="span" sx={{ display: "inline-flex" }}>
        <WtButton
          inverted
          size="small"
          disabled={!href && !onClick}
          {...(href ? { href } : {})}
          onClick={onClick}
          startIcon={<AppIcon name={icon} className="fs-5" />}
          sx={{ whiteSpace: "nowrap" }}
        >
          {label}
        </WtButton>
      </Box>
    </Tooltip>
  );

  return (
    <GlassSurface
      variant="thin"
      radius={16}
      sx={{
        p: { xs: 2, md: 2.5 },
        mb: { xs: 2, md: 3 },
        display: "flex",
        alignItems: "flex-start",
        gap: { xs: 1.5, md: 2.5 },
        flexWrap: { xs: "wrap", lg: "nowrap" },
      }}
    >
      {/* Navigation chrome, not content — so it recedes: no resting fill or border, and
          smaller than the avatar tile it sits beside. WtIconButton's hover tint still
          applies, so it only gains weight when you reach for it. */}
      <WtIconButton
        onClick={onBack}
        title="Back"
        sx={{
          mt: 0.25,
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: "10px",
          bgcolor: "transparent",
          borderColor: "transparent",
          "& .fs-3": { fontSize: "1.05rem" },
        }}
      >
        <AppIcon name="arrow-left" className="fs-3" />
      </WtIconButton>

      <Box sx={{ flexShrink: 0 }}>
        <SmartAvatar
          name={contact?.fullName}
          id={contact?.id}
          imageUrl={contact?.profilePhoto}
          size={84}
          shape="rounded"
          imageFit="cover"
          status={contact?.isContactActive === false ? "inactive" : "active"}
          enablePreview
        />
      </Box>

      {/* Identity. minWidth:0 so a long email truncates instead of shoving the actions off-screen. */}
      <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2, minWidth: 0 }}>
            {contact?.fullName}
          </Typography>
          {contact?.isPrimaryContact && (
            <ToneChip
              tone="warning"
              dense
              icon={<AppIcon name="star" className="fs-7" />}
              label="Primary contact"
            />
          )}
          <ToneChip dense tone="success" color={statusColor} label={statusName} />
        </Stack>

        <Stack direction="row" alignItems="center" gap={0.75} flexWrap="wrap">
          {contact?.roleInCompany && (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {contact.roleInCompany}
            </Typography>
          )}
          {contact?.roleInCompany && company?.companyName && metaDot}
          {company?.companyName && (
            <Link
              component="button"
              type="button"
              onClick={() => navigate(`/companies/${company.id}`)}
              underline="hover"
              variant="body2"
              sx={{ fontWeight: 600 }}
            >
              {company.companyName}
            </Link>
          )}
          {services.length > 0 && (contact?.roleInCompany || company?.companyName) && metaDot}
          {services.length > 0 && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
              {services.join(", ")}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap" sx={{ pt: 0.25 }}>
          {tel && (
            <Link
              href={tel}
              underline="hover"
              variant="body2"
              color="text.primary"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
            >
              <AppIcon name="phone" className="fs-6" />
              {phone}
            </Link>
          )}
          {mail && (
            <Link
              href={mail}
              underline="hover"
              variant="body2"
              color="text.primary"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, minWidth: 0 }}
            >
              <AppIcon name="sms" className="fs-6" />
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                {contact.email}
              </Box>
            </Link>
          )}
          {location && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
            >
              <AppIcon name="geolocation" className="fs-6" />
              {location}
            </Typography>
          )}
        </Stack>
      </Stack>

      <Stack
        direction="row"
        gap={1}
        flexWrap="wrap"
        sx={{
          flexShrink: 0,
          width: { xs: "100%", lg: "auto" },
          justifyContent: { lg: "flex-end" },
        }}
      >
        {action("Call", "phone", tel, "No phone number on file")}
        {action("Send message", "sms", mail, "No email address on file")}
        {action("Schedule meeting", "calendar-add", null, "", onScheduleMeeting)}
        <WtButton
          size="small"
          onClick={onEdit}
          startIcon={<AppIcon name="pencil" className="fs-5" />}
          sx={{ whiteSpace: "nowrap" }}
        >
          Edit details
        </WtButton>
      </Stack>
    </GlassSurface>
  );
};

export default ContactHeader;
