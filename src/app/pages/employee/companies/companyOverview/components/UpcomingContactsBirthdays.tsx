import React, { useState } from 'react'
import { Card } from 'react-bootstrap';
import dayjs from 'dayjs';
import './upcomingContactsBirthdays.css';
import { Button, FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';

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
                color: '#9D4141',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#9D4141',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#9D4141',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#9D4141',
                },
                '& .MuiSelect-icon': {
                  color: '#9D4141',
                },
              }}
            >
              <MenuItem value="birthday">Birthday</MenuItem>
              <MenuItem value="aniversary">Anniversary</MenuItem>
            </Select>
          </FormControl>
        </Card.Title>

        <div className="table-responsive">
          <table className="upcoming-birthdays-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>{filterData === 'aniversary' ? 'Date Of Join' : 'Age'}</th>
                <th>{filterData === 'aniversary' ? 'Anniversary' : 'Birthday'}</th>
              </tr>
            </thead>
            <tbody>
              {data && data.length > 0 ? (
                data.map((contact) => (
                  <tr key={contact.id}>
                    <td>{contact.name}</td>
                    <td>
                      <div className="company-cell">
                        {contact.companyLogo && (
                          <img
                            src={contact.companyLogo}
                            alt={contact.company}
                            className="company-logo"
                          />
                        )}
                        <span>{contact.company}</span>
                      </div>
                    </td>
                    <td>{filterData === 'aniversary' ? 0 : calculateAge(contact.dateOfBirth)}</td>
                    <td>{filterData === 'aniversary' ? 0 : formatBirthday(contact.dateOfBirth)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>
                    No upcoming birthdays
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card.Body>
    </Card>
  );
}

export default UpcomingContactsBirthdays