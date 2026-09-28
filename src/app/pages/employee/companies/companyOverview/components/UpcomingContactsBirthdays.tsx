import { useState, useMemo } from 'react'
import { Card } from 'react-bootstrap';
import dayjs from 'dayjs';
import './upcomingContactsBirthdays.css';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import MaterialTable from '@app/modules/common/components/MaterialTable';

interface ContactBirthday {
  id: string;
  name: string;
  dateOfBirth: string;
  company: string;
  companyLogo: string;
  age: number;
}

function UpcomingContactsBirthdays({ data }: { data: ContactBirthday[] }) {
  const formatBirthday = (dateString: string): string => {
    try {
      const date = dayjs(dateString);
      return date.format('D MMM, ddd');
    } catch (error) {
      return dateString;
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    try {
      const today = dayjs();
      const birthDate = dayjs(dateOfBirth);
      return today.diff(birthDate, 'year');
    } catch (error) {
      return 0;
    }
  };



  const [filterData, setFilterData] = useState("");

const filterDataHandler = (e: SelectChangeEvent<string>) => {
  const value = e.target.value;
  setFilterData(value);
};

  const isAnniversary = filterData === 'aniversary';

  // Flattened to real values (age as a number, the raw date of birth) so the shared
  // table sorts and searches on those rather than on the formatted strings.
  const rows = useMemo(
    () => (data || []).map((contact) => ({
      id: contact.id,
      name: contact.name,
      company: contact.company,
      companyLogo: contact.companyLogo,
      age: isAnniversary ? 0 : calculateAge(contact.dateOfBirth),
      dateOfBirth: isAnniversary ? 0 : contact.dateOfBirth,
    })),
    [data, isAnniversary],
  );

  const columns = useMemo(
    () => [
      { accessorKey: 'name', header: 'Name' },
      {
        accessorKey: 'company',
        header: 'Company',
        Cell: ({ row }: any) => (
          <div className="company-cell">
            {row.original.companyLogo && (
              <img
                src={row.original.companyLogo}
                alt={row.original.company}
                className="company-logo"
              />
            )}
            <span>{row.original.company}</span>
          </div>
        ),
      },
      { accessorKey: 'age', header: isAnniversary ? 'Date Of Join' : 'Age' },
      {
        accessorKey: 'dateOfBirth',
        header: isAnniversary ? 'Anniversary' : 'Birthday',
        Cell: ({ cell }: any) => (isAnniversary ? 0 : formatBirthday(cell.getValue())),
      },
    ],
    [isAnniversary],
  );


  return (
    <Card className="shadow-sm h-100">
      <Card.Body>
        <Card.Title className="mb-4 d-flex justify-content-between">
          <p>{filterData === 'aniversary' ? 'Upcoming Anniversaries' : 'Upcoming Birthdays'}</p>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={filterData || 'birthday'}
              onChange={filterDataHandler}
              displayEmpty
              sx={{
                height: '31px',
                '& .MuiSelect-select': {
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  lineHeight: '1',
                  height: '31px',
                  boxSizing: 'border-box',
                },
                color: '#1E3A8A',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1E3A8A',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1E3A8A',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1E3A8A',
                },
                '& .MuiSelect-icon': {
                  color: '#1E3A8A',
                },
              }}
            >
              <MenuItem value="birthday">Birthday</MenuItem>
              <MenuItem value="aniversary">Anniversary</MenuItem>
            </Select>
          </FormControl>
        </Card.Title>

        {rows.length > 0 ? (
          <MaterialTable
            tableName="UpcomingContactsBirthdays"
            data={rows}
            columns={columns}
            hidePagination
            hideExportCenter
            enableColumnActions={false}
          />
        ) : (
          <div style={{ textAlign: 'center' }}>No upcoming birthdays</div>
        )}
      </Card.Body>
    </Card>
  );
}

export default UpcomingContactsBirthdays