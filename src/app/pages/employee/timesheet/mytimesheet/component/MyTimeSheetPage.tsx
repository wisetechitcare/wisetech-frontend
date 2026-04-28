import { Button } from "@mui/material";
import React, { useEffect } from "react";
import MyTimeSheetToggle from "./MyTimeSheetToggle";
import { fetchConfiguration } from "@services/company";
import { useState } from "react";
import {
  DATE_SETTINGS_KEY,
  LEAVE_MANAGEMENT,
} from "@constants/configurations-key";
import NewTimeLogForm from "../../employeetimesheet/component/NewTimeLogForm";
import { memo } from "react";

const MemoizedTimeSheetToggle = memo(MyTimeSheetToggle);

const MyTimeSheetPage = () => {
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchDateSettings() {
      try {
        const {
          data: { configuration },
        } = await fetchConfiguration(DATE_SETTINGS_KEY);
        const parsed =
          typeof configuration.configuration === "string"
            ? JSON.parse(configuration.configuration)
            : configuration.configuration;
        setDateSettingsEnabled(parsed?.useDateSettings ?? false);
      } catch (err) {
        console.error("Error fetching date settings", err);
        setDateSettingsEnabled(false);
      }
    }

    fetchDateSettings();
  }, []);

  const handleNewTimeLogClick = () => {
    setOpen(true);
  };

  const handleCloseTimeSheet = () => {
    setOpen(false);
  };

  return (
    <>
      <div className="px-8 py-6">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div
            // className="mb-4"
            style={{
              fontFamily: "Barlow",
              fontSize: "24px",
              fontWeight: "600",
            }}
          >
            My Timesheet
          </div>
          <div className="d-flex align-items-center gap-3">
            <Button
              variant="contained"
              onClick={handleNewTimeLogClick}
              sx={{
                backgroundColor: "#9D4141",
                "&:hover": {
                  backgroundColor: "#7e3434",
                },
                textTransform: "none",
                px: 3,
                py: 1,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              New Time Log
            </Button>
          </div>
        </div>
        <MemoizedTimeSheetToggle
          dateSettingsEnabled={dateSettingsEnabled}
          fromAdmin={true}
        />
        {open && <NewTimeLogForm show={open} onClose={handleCloseTimeSheet} />}
      </div>
    </>
  );
};

export default MyTimeSheetPage;
