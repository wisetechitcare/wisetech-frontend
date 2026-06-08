import React, {useState, useEffect } from 'react'
import ProjectOverViewToggle from './components/ProjectOverViewToggle'
import { DATE_SETTINGS_KEY } from '@constants/configurations-key';
import { fetchConfiguration } from '@services/company';
import Loader from '@app/modules/common/utils/Loader';

const ProjectsOverviewMain = () => {
    const [dateSettingsEnabled, setDateSettingsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

     useEffect(() => {
            async function fetchDateSettings() {
                try {
                    const { data: { configuration } } = await fetchConfiguration(DATE_SETTINGS_KEY);
                    const parsed = typeof configuration.configuration === "string"
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

    if(isLoading){
        return <Loader/>
    }

    return (
        <div>
            <ProjectOverViewToggle 
            fromAdmin={true}
            // resourseAndView={[]}
            dateSettingsEnabled={dateSettingsEnabled}
            // checkOwnWithOthers={true}
            />
        </div>
    )
}

export default ProjectsOverviewMain

