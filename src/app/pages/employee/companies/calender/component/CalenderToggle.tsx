import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { formatBirthday, isYearless } from "@utils/birthday";
import { toAbsoluteUrl } from '@metronic/helpers';
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import dayjs, { Dayjs } from 'dayjs';
import { getUpcomingContactsBirthdays } from '@services/companies';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { Link } from 'react-router-dom';
import { Button } from '@/ds/ui/button';
import { googleCalenderIcons } from '@metronic/assets/sidepanelicons';

const CalenderToggle = () => {
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

                // A birthday saved without its year shows day + month only.
                return isYearless(actualDate) ? formatBirthday(actualDate) : dayjs(actualDate).format('DD MMM YYYY');
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
                <Link to={`/contacts/${contact.id}`} style={{ color: '#1E3A8A' }}>
                  {contact.name}
                </Link>
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
              <Link to={`/companies/${contact.companyId}`} style={{ color: '#1E3A8A' }}>
                {contact.company}
              </Link>
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
                <Button
                  variant="tinted"
                  size="icon-sm"
                  onClick={handleGoogleCalendarSave}
                  title="Add to Google Calendar"
                  aria-label="Add to Google Calendar"
                >
                  <img
                    src={googleCalenderIcons.googleCalenderIcon.default}
                    alt="Google Calendar"
                    style={{ width: '24px', height: '24px' }}
                  />
                </Button>
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



    
    return (
        <div>
            <div className="d-flex flex-row justify-content-between align-items-center mb-4">
                <div className="d-flex flex-row justify-content-start align-items-center gap-3">
                    <PeriodTabs
                        value={activeTab}
                        options={[
                            { label: 'All', value: 'all' },
                            { label: 'Birthdays', value: 'birthdays' },
                            { label: 'Anniversaries', value: 'anniversaries' },
                        ]}
                        onChange={(v) => setActiveTab(v as string)}
                        ariaLabel="calendar filter"
                    />
                </div>
                
                <div className="d-flex flex-row align-items-center gap-4">
                    <PeriodNavigator
                        onPrevious={() => navigateMonth("prev")}
                        onNext={() => navigateMonth("next")}
                        label={monthStart.format("MMM YYYY")}
                        pickGranularity="month"
                        pickValue={monthStart.format("YYYY-MM-DD")}
                        onPickDate={(v) => {
                            const newMonthStart = dayjs(v).startOf("month");
                            setMonthStart(newMonthStart);
                            setMonthEnd(newMonthStart.endOf("month"));
                        }}
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