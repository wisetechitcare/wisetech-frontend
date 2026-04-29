import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toAbsoluteUrl } from "@metronic/helpers";
import dayjs, { Dayjs } from 'dayjs';
import { getUpcomingContactsBirthdays } from '@services/companies';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { useNavigate } from 'react-router-dom';
import { googleCalenderIcons } from '@metronic/assets/sidepanelicons';

const CalenderToggle = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [data, setData] = useState([]);
    
    // Monthly navigation state
    const today = useMemo(() => dayjs(), []);
    const [monthStart, setMonthStart] = useState(today.startOf("month"));
    const [monthEnd, setMonthEnd] = useState(today.endOf("month"));



    useEffect(() => {
        const fetchData = async () => {
            try {
                const startDate = monthStart.format('YYYY-MM-DD');
                const endDate = monthEnd.format('YYYY-MM-DD');
                const response = await getUpcomingContactsBirthdays(startDate, endDate);
                setData(response?.allContacts);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, [monthStart, monthEnd])

    // Filter data based on active tab
    const filteredData = useMemo(() => {
        if (!data) return [];

        if (activeTab === 'birthdays') {
            return data.filter((contact:any) => contact.daysToNextBirthday <= contact.daysToNextAnniversary);
        } else if (activeTab === 'anniversaries') {
            return data.filter((contact:any) => contact.daysToNextAnniversary < contact.daysToNextBirthday);
        }

        return data; // 'all' tab shows everything
    }, [data, activeTab]);

    const columns = [
        
        {
            accessorKey: 'nextEventDate',
            header: 'Date',
            size: 150,
            Cell: ({ row }: { row: any }) => {
                const contact = row.original;
                let actualDate;

                if (activeTab === 'anniversaries') {
                    actualDate = contact.anniversary;
                } else if (activeTab === 'birthdays') {
                    actualDate = contact.dateOfBirth;
                } else {
                    // For 'all' tab, show actual date based on which event comes next
                    if (contact.daysToNextBirthday <= contact.daysToNextAnniversary) {
                        actualDate = contact.dateOfBirth;
                    } else {
                        actualDate = contact.anniversary;
                    }
                }

                return dayjs(actualDate).format('DD MMM YYYY');
            },
          },
        {
            accessorKey: 'type',
            header: 'Type',
            size: 150,
            Cell: ({ row }: { row: any }) => {
                const contact = row.original;
                if (activeTab === 'anniversaries') {
                    return <span>Anniversary</span>;
                } else if (activeTab === 'birthdays') {
                    return <span>Birthday</span>;
                } else {
                    // For 'all' tab, determine which event is next
                    const nextEvent = contact.daysToNextBirthday <= contact.daysToNextAnniversary ? 'Birthday' : 'Anniversary';
                    return <span>{nextEvent}</span>;
                }
            },
          },
          {
            accessorKey: 'name',
            header: 'Contact',
            size: 200,
            Cell: ({ row }: { row: any }) => {
              const contact = row.original;
              return (
                <span
                  style={{
                    color: '#9D4141',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/contacts/${contact.id}`)}
                >
                  {contact.name}
                </span>
              );
            },
          },
        
        {
          accessorKey: 'company',
          header: 'Company',
          size: 200,
          Cell: ({ row }: { row: any }) => {
            const contact = row.original;
            return (
              <span
                style={{
                  color: '#9D4141',
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/companies/${contact.companyId}`)}
              >
                {contact.company}
              </span>
            );
          },
        },
          {
            accessorKey: 'daysRemaining',
            header: 'Days Remaining',
            size: 200,
            Cell: ({ row }: { row: any }) => {
              const contact = row.original;
              let daysRemaining;

              if (activeTab === 'anniversaries') {
                daysRemaining = contact.daysToNextAnniversary;
              } else if (activeTab === 'birthdays') {
                daysRemaining = contact.daysToNextBirthday;
              } else {
                // For 'all' tab, show days to the next event (whichever comes first)
                daysRemaining = Math.min(contact.daysToNextBirthday, contact.daysToNextAnniversary);
              }

              return daysRemaining === 0 ? 'Today!' : `${daysRemaining} days`;
            },
          },
          {
            accessorKey: 'actions',
            header: 'Actions',
            size: 120,
            Cell: ({ row }: { row: any }) => {
              const contact = row.original;

              const handleGoogleCalendarSave = () => {
                let originalDate, eventTitle, eventType;

                if (activeTab === 'anniversaries') {
                  originalDate = contact.anniversary;
                  eventTitle = `${contact.name} - Anniversary`;
                  eventType = 'Anniversary';
                } else if (activeTab === 'birthdays') {
                  originalDate = contact.dateOfBirth;
                  eventTitle = `${contact.name} - Birthday`;
                  eventType = 'Birthday';
                } else {
                  // For 'all' tab, determine which event is next
                  if (contact.daysToNextBirthday <= contact.daysToNextAnniversary) {
                    originalDate = contact.dateOfBirth;
                    eventTitle = `${contact.name} - Birthday`;
                    eventType = 'Birthday';
                  } else {
                    originalDate = contact.anniversary;
                    eventTitle = `${contact.name} - Anniversary`;
                    eventType = 'Anniversary';
                  }
                }

                // Calculate the next occurrence of this date (this year or next year)
                const currentYear = dayjs().year();
                const originalDateObj = dayjs(originalDate);
                let nextOccurrence = originalDateObj.year(currentYear);

                // If the date has already passed this year, schedule for next year
                if (nextOccurrence.isBefore(dayjs(), 'day')) {
                  nextOccurrence = nextOccurrence.add(1, 'year');
                }

                // Format date for Google Calendar (YYYYMMDD)
                const formattedDate = nextOccurrence.format('YYYYMMDD');

                // Create Google Calendar URL
                const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${formattedDate}/${formattedDate}&details=${encodeURIComponent(`${eventType} for ${contact.name} from ${contact.company}`)}&location=${encodeURIComponent(contact.company || '')}`;

                // Open in new tab
                window.open(googleCalendarUrl, '_blank');
              };

              return (
                <div
                  onClick={handleGoogleCalendarSave}
                  className="btn-sm btn btn-secondary"
                  title="Add to Google Calendar"
                  style={{ cursor: 'pointer', backgroundColor: '#E8F0FE', border: 'none' }}
                >
                  <img
                    src={googleCalenderIcons.googleCalenderIcon.default}
                    alt="Google Calendar"
                    style={{ width: '24px', height: '24px' }}
                  />
                </div>
              );
            },
          },
      ];

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'birthdays', label: 'Birthdays' },
        { id: 'anniversaries', label: 'Anniversaries' },
    ];

    // Monthly navigation functions
    const navigateMonth = useCallback((direction: "prev" | "next") => {
        const offset = direction === "prev" ? -1 : 1;
        const newMonthStart = monthStart.add(offset, "month");
        const newMonthEnd = newMonthStart.endOf("month");

        setMonthStart(newMonthStart);
        setMonthEnd(newMonthEnd);
    }, [monthStart]);


    // Navigation buttons component
    const NavigationButtons = useMemo(() => ({
        onPrev,
        onNext,
        displayText,
    }: {
        onPrev: () => void;
        onNext: () => void;
        displayText: string;
    }) => (
        <div className="d-flex align-items-center">
            <button className="btn btn-sm p-0" onClick={onPrev} type="button">
                <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" />
            </button>
            <span className="mx-2 mt-0 fw-bold lh-base font-barlow">{displayText}</span>
            <button className="btn btn-sm p-0" onClick={onNext} type="button">
                <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" />
            </button>
        </div>
    ), []);

    
    return (
        <div>
            <div className="d-flex flex-row justify-content-between align-items-center mb-4">
                <div className="d-flex flex-row justify-content-start align-items-center gap-3">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-2 fw-semibold rounded-pill`}
                            style={{
                                border: activeTab === tab.id ? "2px solid #9D4141" : "2px solid #A0B4D2",
                                color: activeTab === tab.id ? "#9D4141" : "#000000",
                                backgroundColor: "transparent",
                                transition: "all 0.3s ease-in-out",
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 400,
                                fontSize: "14px",
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                <div className="d-flex flex-row align-items-center gap-4">
                    <NavigationButtons
                        onPrev={() => navigateMonth("prev")}
                        onNext={() => navigateMonth("next")}
                        displayText={monthStart.format("MMM YYYY")}
                    />
                </div>
            </div>

            <div className="tab-content mt-3">
                <MaterialTable
                data={filteredData}
                columns={columns}
                tableName="Calender Toggle"
                />
            </div>
        </div>
    );
};

export default CalenderToggle;