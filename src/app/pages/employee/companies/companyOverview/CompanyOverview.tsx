import React, { useEffect, useState } from "react";
import NewCompanyForm from "../companies/components/NewCompanyForm";
import ClientContacts from "../companies/components/ClientContacts";
import ClientContactsForm from "../contacts/components/ClientContactsForm";
import { fetchConfiguration } from "@services/company";
import { DATE_SETTINGS_KEY } from "@constants/configurations-key";
import CompanyOverViewToggle from "./components/CompanyOverViewToggle";
import CompanyChartSettingsModal from "./components/CompanyChartSettingsModal";

function CompanyOverview() {
  const [show, setShow] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);

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
      } finally {
        setIsLoading(false);
      }
    }

    fetchDateSettings();
  }, []);

  const handleChartSettingsModal = () => {
    setShowChartSettingsModal(true);
  };

  return (
    <div>
      {/* <div className='d-flex justify-content-between align-items-center'>
      <h2 className="mb-4" style={{ fontFamily: 'Barlow', fontSize: '24px', fontWeight: '600' }}>Overview</h2>
        <div className='d-flex gap-2'>
          <Button onClick={() => setShow(true)}>New Company</Button>
          <Button onClick={() => setShowContact(true)}>New Contact</Button>
        </div>
      </div> */}
      <div className="d-flex align-items-start align-items-md-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <div
            // className="mb-4"
            style={{
              fontFamily: "Barlow",
              fontSize: "24px",
              fontWeight: "600",
            }}
          >
            Overview
          </div>
          
        </div>
        <div className="d-flex flex-column flex-md-row align-items-end align-items-md-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ cursor: "pointer" }}
            onClick={handleChartSettingsModal}
          >
            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#7A2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <button
            className="btn btn-primary"
            onClick={() => setShow(true)}
          >
            New Company
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowContact(true)}
          >
            New Contact
          </button>
        </div>
      </div>
      <NewCompanyForm show={show} onClose={() => setShow(false)} />
      <ClientContactsForm
        show={showContact}
        onClose={() => setShowContact(false)}
      />
      <CompanyChartSettingsModal show={showChartSettingsModal} onHide={() => setShowChartSettingsModal(false)} />
      <div>
        <CompanyOverViewToggle
          fromAdmin={true}
          resourseAndView={[]}
          dateSettingsEnabled={dateSettingsEnabled}
          checkOwnWithOthers={true}
        />
      </div>
    </div>
  );
}

export default CompanyOverview;
