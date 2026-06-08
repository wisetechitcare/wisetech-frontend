import React, { useEffect, useState } from 'react'
import MaterialToggleLeaderboard from './MaterialToggleLeaderboard'
import { PageTitle } from '@metronic/layout/core'
import { resourceNameMapWithCamelCase } from '@constants/statistics';
import { fetchConfiguration } from '@services/company';
import { DATE_SETTINGS_KEY } from '@constants/configurations-key';
import { Container } from 'react-bootstrap';

function KpiLeaderboard() {
  const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  const resourseAndView = [
    {
      resource: resourceNameMapWithCamelCase.kpi,
      viewOwn: true,
      viewOthers: false,
    }
  ];

  if (isLoading) {
    return (
      <Container
        fluid
        className="my-4 w-100 px-0 d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </Container>
    );
  }

  return (
    <>
      <h2 className='mb-5'>Leaderboard</h2>
      <MaterialToggleLeaderboard
        resourseAndView={resourseAndView}
        dateSettingsEnabled={dateSettingsEnabled}
      />
    </>
  )
}

export default KpiLeaderboard
