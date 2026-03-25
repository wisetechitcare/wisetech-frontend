import React from 'react'

function CommonCard({children, styles}: {children?: React.ReactNode, styles?: React.CSSProperties}) {
  return (
    <div className='d-flex flex-column mb-10 p-5 p-md-10 mb-5' style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', fontFamily: 'Inter', ...styles }}>
      {children}
    </div>
  )
}

export default CommonCard