import { PAGE_SIZE_OPTIONS, PageSizeOption } from '@metronic/helpers'

interface RowsPerPageProps {
  value: number
  onChange: (size: PageSizeOption) => void
  disabled?: boolean
  label?: string
}

function RowsPerPage({ value, onChange, disabled = false, label = 'Rows per page:' }: RowsPerPageProps) {
  return (
    <div className='d-flex align-items-center gap-2'>
      <span style={{ fontSize: '13px', fontWeight: 400, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) as PageSizeOption)}
        style={{
          padding: '5px 10px',
          fontSize: '13px',
          border: '1px solid #E1E8F0',
          borderRadius: '6px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: '#fff',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  )
}

export default RowsPerPage
