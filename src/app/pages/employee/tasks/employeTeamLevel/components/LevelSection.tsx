import React, { useCallback } from 'react';
import { LevelSectionProps } from '../types';
import EmployeeCard from './EmployeeCard';
import VirtualizedEmployeeGrid from './VirtualizedEmployeeGrid';

const LevelSection: React.FC<LevelSectionProps> = React.memo(({
    level,
    onAddEmployee,
    onAddMultipleEmployees,
    onEditLevel,
    onEditEmployee,
    onDeleteEmployee
}) => {
    console.log("level===============>inssideLvelSection",level)
    const handleAddMultipleEmployees = useCallback(() => {
        onAddMultipleEmployees?.(level.id);
    }, [onAddMultipleEmployees, level.id]);

    const handleEditLevel = useCallback(() => {
        onEditLevel?.(level);
    }, [onEditLevel, level]);

    return (
        <div className="mb-3 bg-white rounded-3 p-3 border border-1 border-secondary-subtle">
            {/* Level Header */}
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-4 gap-3 back">
                <div className="d-flex align-items-center gap-3 flex-grow-1">
                    {/* Dynamic Level Icon */}
                    <div className="position-relative d-inline-block">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="36"
                            height="37"
                            viewBox="0 0 36 37"
                            fill="none"
                        >
                            <g clipPath="url(#clip0_11023_44066)">
                                <path
                                    d="M35.711 17.2485L28.2059 2.06518C27.9754 1.59398 27.6168 1.19725 27.1712 0.920435C26.7257 0.643619 26.2111 0.497917 25.6866 0.500022H13.3432C12.7469 0.501323 12.1753 0.738793 11.7537 1.16047C11.332 1.58214 11.0945 2.15368 11.0932 2.75002V4.5444H2.17266C1.88693 4.5444 1.604 4.60076 1.34008 4.71025C1.07616 4.81974 0.836433 4.98022 0.634619 5.18249C0.432805 5.38476 0.272871 5.62486 0.163974 5.88902C0.055078 6.15319 -0.000641714 6.43624 5.57545e-06 6.72198L0.0309431 18.6364L0.0604743 30.2879C0.0625179 30.8629 0.292138 31.4138 0.699137 31.82C1.10614 32.2262 1.6574 32.4547 2.23243 32.4556H11.0918V34.25C11.0931 34.8464 11.3306 35.4179 11.7522 35.8396C12.1739 36.2612 12.7455 36.4987 13.3418 36.5H25.6866C26.2102 36.4981 26.7229 36.3507 27.1677 36.0743C27.6124 35.798 27.9716 35.4035 28.2052 34.9349L35.711 19.7375C35.9011 19.3502 36 18.9245 36 18.493C36 18.0615 35.9011 17.6358 35.711 17.2485ZM34.9882 19.3803L27.4823 34.5777C27.3171 34.9129 27.0613 35.1951 26.7439 35.3924C26.4266 35.5898 26.0603 35.6943 25.6866 35.6942H13.3432C12.96 35.6942 12.5924 35.5421 12.3212 35.2714C12.0501 35.0006 11.8974 34.6332 11.8969 34.25V31.7188H23.0625C23.3629 31.7044 23.6543 31.6117 23.9078 31.4498C24.1612 31.288 24.368 31.0627 24.5074 30.7963L30.2484 19.1729C30.352 18.9616 30.4058 18.7294 30.4058 18.494C30.4058 18.2587 30.352 18.0265 30.2484 17.8152L24.5102 6.20377C24.4235 6.02922 24.3042 5.87289 24.1587 5.74323C24.0161 5.59694 23.8456 5.4807 23.6573 5.40136C23.4691 5.32202 23.2668 5.28119 23.0625 5.28127H11.8969V2.75002C11.8969 2.36643 12.0493 1.99855 12.3205 1.72731C12.5917 1.45607 12.9596 1.30369 13.3432 1.30369H25.6866C26.0604 1.30385 26.4268 1.40848 26.7443 1.60577C27.0619 1.80306 27.318 2.08517 27.4838 2.42026L34.9882 17.6056C35.1249 17.8815 35.1959 18.1852 35.1959 18.493C35.1959 18.8008 35.1249 19.1045 34.9882 19.3803Z"
                                    fill="#9D4141"
                                />
                            </g>
                            <defs>
                                <clipPath id="clip0_11023_44066">
                                    <rect
                                        width="36"
                                        height="36"
                                        fill="white"
                                        transform="translate(0 0.5)"
                                    />
                                </clipPath>
                            </defs>
                        </svg>
                        <div
                            className="position-absolute d-flex align-items-center justify-content-center"
                            style={{
                                top: "45%",
                                left: "40%",
                                transform: "translate(-50%, -50%)",
                                color: "white",
                                fontWeight: "bold",
                                fontSize: "14px",
                                fontFamily: "Inter"
                            }}
                        >
                            {level.levelNumber}
                        </div>
                    </div>

                    <div>
                        <div className="mb-1" style={{
                            fontFamily: 'Inter',
                            fontWeight: 500,
                            fontSize: '14px',
                            color: '#9d4141'
                        }}>
                            Level {level.levelNumber}
                        </div>
                        <div className="fw-semibold" style={{
                            fontFamily: 'Barlow',
                            fontSize: '18px',
                            letterSpacing: '0.18px'
                        }}>
                            {level.title}
                        </div>
                    </div>
                </div>

                <div className="d-flex gap-3 flex-wrap">
                    <button
                        type="button"
                        className="btn btn-outline text-nowrap"
                        style={{
                            color: '#9d4141',
                            borderColor: '#9d4141',
                            fontFamily: 'Inter',
                            fontSize: '14px',
                            fontWeight: 500,
                            borderRadius: '6px',
                            padding: '8px 20px',
                            height: '40px',
                            backgroundColor: 'transparent'
                        }}
                        onClick={handleAddMultipleEmployees}
                    >
                        Add Employee
                    </button>
                    <button
                        type="button"
                        className="btn btn-outline text-nowrap"
                        style={{
                            color: '#9d4141',
                            borderColor: '#9d4141',
                            fontFamily: 'Inter',
                            fontSize: '14px',
                            fontWeight: 500,
                            borderRadius: '6px',
                            padding: '8px 20px',
                            height: '40px',
                            backgroundColor: 'transparent'
                        }}
                        onClick={handleEditLevel}
                    >
                        Edit Level
                    </button>
                </div>
            </div>

            {/* Employees Grid */}
            {level.employees.length > 20 ? (
                <div className="position-relative">
                    <VirtualizedEmployeeGrid
                        employees={level.employees}
                        onEditEmployee={onEditEmployee}
                        onDeleteEmployee={onDeleteEmployee}
                        containerHeight={300}
                        itemsPerPage={20}
                    />
                </div>
            ) : (
                <div className="d-flex gap-3 overflow-auto pb-2">
                    {level.employees.map((employee) => (
                        <EmployeeCard
                            key={employee.id}
                            employee={employee}
                            onEdit={onEditEmployee}
                            onDelete={onDeleteEmployee}
                        />
                    ))}
                    {/* Add Employee Placeholder */}
                    <div
                        className="d-flex align-items-center justify-content-center bg-white rounded-2 border border-2 border-dashed text-secondary"
                        style={{
                            width: '240px',
                            height: '295px',
                            minWidth: '240px',
                            borderColor: '#dee3eb !important',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onClick={handleAddMultipleEmployees}
                    >
                        <span>+ Add Employee</span>
                    </div>
                </div>
            )}
        </div>
    );
});

LevelSection.displayName = 'LevelSection';

export default LevelSection;
