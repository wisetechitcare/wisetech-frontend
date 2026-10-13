import { useState } from "react";
import {
  ConfigChipGrid,
  ConfigColorChip,
  ConfigPageLayout,
  ConfigSectionCard,
  EmptyState,
} from "@app/modules/configuration";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  deleteDeliveryMode,
  deleteDeliveryStatus,
  deleteGiftRunStatus,
  deleteOccasion,
  saveDeliveryMode,
  saveDeliveryStatus,
  saveGiftRunStatus,
  saveOccasion,
} from "../store/courtesyDeskStore";
import type { ConfigOption } from "../types";
import GiftConfigOptionModal from "./GiftConfigOptionModal";

type ModalKind = "occasion" | "status" | "giftRunStatus" | "mode" | null;

export default function Configure() {
  const desk = useCourtesyDesk();
  const [modal, setModal] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<ConfigOption | null>(null);

  const openNew = (kind: ModalKind) => {
    setEditing(null);
    setModal(kind);
  };

  const openEdit = (kind: ModalKind, option: ConfigOption) => {
    setEditing(option);
    setModal(kind);
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
  };

  return (
    <>
      <ConfigPageLayout>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            padding: "16px 24px",
          }}
        >
          <ConfigSectionCard
            title="Gift Run status"
            description="Lifecycle of a Gift Run — shown in the list and on the run header."
            icon="bi-diagram-3"
            iconColor="purple"
            primaryAction={{
              label: "New Status",
              icon: "bi-plus-lg",
              onClick: () => openNew("giftRunStatus"),
              variant: "primary",
            }}
          >
            {desk.config.giftRunStatuses.length === 0 ? (
              <EmptyState label="statuses" />
            ) : (
              <ConfigChipGrid>
                {desk.config.giftRunStatuses.map((s: ConfigOption) => (
                  <ConfigColorChip
                    key={s.id}
                    name={s.name}
                    color={s.color}
                    onEdit={() => openEdit("giftRunStatus", s)}
                    action={{
                      icon: "bi-trash",
                      title: `Delete ${s.name}`,
                      danger: true,
                      onClick: () => {
                        if (window.confirm(`Delete status “${s.name}”?`))
                          deleteGiftRunStatus(s.id);
                      },
                    }}
                  />
                ))}
              </ConfigChipGrid>
            )}
          </ConfigSectionCard>

          <ConfigSectionCard
            title="Delivery status"
            description="Stages on Delivery recipient lists."
            icon="bi-flag"
            iconColor="primary"
            primaryAction={{
              label: "New Status",
              icon: "bi-plus-lg",
              onClick: () => openNew("status"),
              variant: "primary",
            }}
          >
            {desk.config.deliveryStatuses.length === 0 ? (
              <EmptyState label="statuses" />
            ) : (
              <ConfigChipGrid>
                {desk.config.deliveryStatuses.map((s: ConfigOption) => (
                  <ConfigColorChip
                    key={s.id}
                    name={s.name}
                    color={s.color}
                    onEdit={() => openEdit("status", s)}
                    action={{
                      icon: "bi-trash",
                      title: `Delete ${s.name}`,
                      danger: true,
                      onClick: () => {
                        if (window.confirm(`Delete status “${s.name}”?`))
                          deleteDeliveryStatus(s.id);
                      },
                    }}
                  />
                ))}
              </ConfigChipGrid>
            )}
          </ConfigSectionCard>

          <ConfigSectionCard
            title="Mode"
            description="How gifts are delivered — In Person, Courier, or custom modes."
            icon="bi-truck"
            iconColor="amber"
            primaryAction={{
              label: "New Mode",
              icon: "bi-plus-lg",
              onClick: () => openNew("mode"),
              variant: "primary",
            }}
          >
            {desk.config.deliveryModes.length === 0 ? (
              <EmptyState label="modes" />
            ) : (
              <ConfigChipGrid>
                {desk.config.deliveryModes.map((m: ConfigOption) => (
                  <ConfigColorChip
                    key={m.id}
                    name={m.name}
                    color={m.color}
                    onEdit={() => openEdit("mode", m)}
                    action={{
                      icon: "bi-trash",
                      title: `Delete ${m.name}`,
                      danger: true,
                      onClick: () => {
                        if (window.confirm(`Delete mode “${m.name}”?`))
                          deleteDeliveryMode(m.id);
                      },
                    }}
                  />
                ))}
              </ConfigChipGrid>
            )}
          </ConfigSectionCard>

          <ConfigSectionCard
            title="Occasions"
            description="Used on New Gift Run — pick from the list or add more here."
            icon="bi-calendar-event"
            iconColor="teal"
            primaryAction={{
              label: "New Occasion",
              icon: "bi-plus-lg",
              onClick: () => openNew("occasion"),
              variant: "primary",
            }}
          >
            {desk.config.occasions.length === 0 ? (
              <EmptyState label="occasions" />
            ) : (
              <ConfigChipGrid>
                {desk.config.occasions.map((o: ConfigOption) => (
                  <ConfigColorChip
                    key={o.id}
                    name={o.name}
                    color={o.color}
                    onEdit={() => openEdit("occasion", o)}
                    action={{
                      icon: "bi-trash",
                      title: `Delete ${o.name}`,
                      danger: true,
                      onClick: () => {
                        if (window.confirm(`Delete occasion “${o.name}”?`))
                          deleteOccasion(o.id);
                      },
                    }}
                  />
                ))}
              </ConfigChipGrid>
            )}
          </ConfigSectionCard>
        </div>
      </ConfigPageLayout>

      <GiftConfigOptionModal
        show={modal === "occasion"}
        onClose={closeModal}
        title="Occasion"
        nameLabel="Occasion name"
        initial={editing}
        onSave={saveOccasion}
      />
      <GiftConfigOptionModal
        show={modal === "status"}
        onClose={closeModal}
        title="Delivery status"
        nameLabel="Status name"
        initial={editing}
        onSave={saveDeliveryStatus}
      />
      <GiftConfigOptionModal
        show={modal === "giftRunStatus"}
        onClose={closeModal}
        title="Gift Run status"
        nameLabel="Status name"
        initial={editing}
        onSave={saveGiftRunStatus}
      />
      <GiftConfigOptionModal
        show={modal === "mode"}
        onClose={closeModal}
        title="Mode"
        nameLabel="Mode name"
        initial={editing}
        onSave={saveDeliveryMode}
      />
    </>
  );
}
