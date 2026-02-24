import React, { useState } from 'react';
import CalenderToggle from './component/CalenderToggle';

const Calendar = () => {
 

  return (
    <div className="p-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div style={{ fontFamily: "Barlow", fontWeight: "600", fontSize: "24px", }}>
            Contacts Calendar
        </div>
      </div>
      <CalenderToggle />
    </div>
  );
};

export default Calendar;