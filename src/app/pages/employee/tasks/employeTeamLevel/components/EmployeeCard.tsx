import React from 'react';
import { EmployeeCardProps } from '../types';
import LazyImage from './LazyImage';

const EmployeeCard: React.FC<EmployeeCardProps> = React.memo(({ employee, onEdit, onDelete }) => {
    // console.log("employee=====================>in the employeeCard",employee?.employee?.users?.firstName,employee?.employee?.users?.lastName)
    return(
    <div className="d-flex flex-column  rounded-2 p-3" style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#F7F9FC',
    }}>
        <div
            className="mb-3 position-relative overflow-hidden rounded-3"
            style={{
                width: '100%',
                height: '216px'
            }}
        >
            
            
            <LazyImage
                src={employee.avatar}
                alt={`${employee.name} avatar`}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '12px',
                    position: 'absolute',
                    top: 0,
                    left: 0
                }}
            />
        </div>
        <div className="d-flex justify-content-between align-items-end">
            <div className="flex-grow-1">
                <div className="mb-2 fw-medium" style={{
                    fontFamily: 'Inter',
                    fontSize: '14px'
                }}>
                    {employee.name || `${employee?.employee?.users?.firstName || ''} ${employee?.employee?.users?.lastName || ''}`.trim() || 'Unknown Employee'}
                </div>
                <div className="text-truncate" style={{
                    fontFamily: 'Inter',
                    fontSize: '12px',
                    height: '20px',
                    width: '150px'
                }}>
                    {employee.position}
                </div>
            </div>
            <div className="d-flex gap-2">
                {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    onClick={() => onEdit?.(employee)}
                    style={{cursor:"pointer"}}
                >
                    <path
                        d="M13.0517 2.73937L14.4575 1.33271C14.7506 1.03964 15.148 0.875 15.5625 0.875C15.977 0.875 16.3744 1.03964 16.6675 1.33271C16.9606 1.62577 17.1252 2.02325 17.1252 2.43771C17.1252 2.85216 16.9606 3.24964 16.6675 3.54271L4.69333 15.5169C4.25277 15.9572 3.70947 16.2808 3.1125 16.4585L0.875 17.1252L1.54167 14.8877C1.7194 14.2907 2.04303 13.7474 2.48333 13.3069L13.0525 2.73937H13.0517ZM13.0517 2.73937L15.25 4.93771"
                        stroke="#9D4141"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg> */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="18"
                    viewBox="0 0 16 18"
                    fill="none"
                    onClick={() => onDelete?.(employee.id)}
                     style={{cursor:"pointer"}}
                >
                    <path
                        d="M10.2833 6.50043L9.995 14.0004M6.005 14.0004L5.71667 6.50043M14.0233 3.82543C14.3083 3.86877 14.5917 3.9146 14.875 3.96377M14.0233 3.82543L13.1333 15.3946C13.097 15.8656 12.8842 16.3056 12.5375 16.6265C12.1908 16.9474 11.7358 17.1256 11.2633 17.1254H4.73667C4.26425 17.1256 3.80919 16.9474 3.46248 16.6265C3.11578 16.3056 2.90299 15.8656 2.86667 15.3946L1.97667 3.82543M14.0233 3.82543C13.0616 3.68003 12.0948 3.56968 11.125 3.4946M1.97667 3.82543C1.69167 3.86793 1.40833 3.91377 1.125 3.96293M1.97667 3.82543C2.93844 3.68003 3.9052 3.56968 4.875 3.4946M11.125 3.4946V2.73127C11.125 1.74793 10.3667 0.927934 9.38333 0.897101C8.46135 0.867633 7.53865 0.867633 6.61667 0.897101C5.63333 0.927934 4.875 1.74877 4.875 2.73127V3.4946M11.125 3.4946C9.04477 3.33383 6.95523 3.33383 4.875 3.4946"
                        stroke="#9D4141"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                {/* <LazyImage
                    src="http://localhost:3845/assets/80a95882519387d68bee5719de3fd7f61a4c17ef.svg"
                    alt="edit employee"
                    className="cursor-pointer"
                    style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer'
                    }}
                    onClick={() => onEdit?.(employee)}
                />
                <LazyImage
                    src="http://localhost:3845/assets/f898a77d3083117b9eb37a8e5ee3bb89e4639ee2.svg"
                    alt="delete employee"
                    className="cursor-pointer"
                    style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer'
                    }}
                    onClick={() => onDelete?.(employee.id)}
                /> */}
            </div>
        </div>
    </div>
    )
});

EmployeeCard.displayName = 'EmployeeCard';

export default EmployeeCard;
