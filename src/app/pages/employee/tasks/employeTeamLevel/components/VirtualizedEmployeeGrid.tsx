import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import EmployeeCard from './EmployeeCard';
import { Employee } from '../types';

interface VirtualizedEmployeeGridProps {
  employees: Employee[];
  onEditEmployee?: (employee: Employee) => void;
  onDeleteEmployee?: (employeeId: string) => void;
  containerHeight?: number;
  itemsPerPage?: number;
}

const VirtualizedEmployeeGrid: React.FC<VirtualizedEmployeeGridProps> = ({
  employees,
  onEditEmployee,
  onDeleteEmployee,
  containerHeight = 400,
  itemsPerPage = 20
}) => {
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleEndIndex, setVisibleEndIndex] = useState(itemsPerPage);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible employees based on scroll position
  const visibleEmployees = useMemo(() => {
    return employees.slice(visibleStartIndex, visibleEndIndex);
  }, [employees, visibleStartIndex, visibleEndIndex]);

  // Handle scroll for pagination
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

    // Load more items when user scrolls past 80%
    if (scrollPercentage > 0.8 && visibleEndIndex < employees.length) {
      setVisibleEndIndex(prev => Math.min(prev + itemsPerPage, employees.length));
    }
  }, [employees.length, itemsPerPage, visibleEndIndex]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');

            // Load previous items if scrolling up
            if (index <= visibleStartIndex + 5 && visibleStartIndex > 0) {
              setVisibleStartIndex(prev => Math.max(0, prev - itemsPerPage));
            }

            // Load next items if scrolling down
            if (index >= visibleEndIndex - 5 && visibleEndIndex < employees.length) {
              setVisibleEndIndex(prev => Math.min(prev + itemsPerPage, employees.length));
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    // Observe all visible employee cards
    const cards = containerRef.current?.querySelectorAll('[data-index]');
    cards?.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, [visibleEmployees, visibleStartIndex, visibleEndIndex, employees.length, itemsPerPage]);

  if (employees.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ height: containerHeight }}>
        <span style={{ color: '#8998ab' }}>No employees found</span>
      </div>
    );
  }

  // For small datasets, render all without virtualization
  if (employees.length <= 50) {
    return (
      <div className="d-flex gap-3 flex-wrap overflow-auto" style={{ maxHeight: containerHeight }}>
        {employees.map((employee, index) => (
          <div
            key={employee.id}
            style={{ minWidth: '200px', flexShrink: 0 }}
            data-index={index}
          >
            <EmployeeCard
              employee={employee}
              onEdit={onEditEmployee}
              onDelete={onDeleteEmployee}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto"
      style={{
        height: containerHeight,
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      {/* Spacer for virtual scroll positioning */}
      {visibleStartIndex > 0 && (
        <div style={{ height: `${visibleStartIndex * 160}px` }} />
      )}

      <div className="d-flex gap-3 flex-wrap p-2">
        {visibleEmployees.map((employee, localIndex) => {
          const actualIndex = visibleStartIndex + localIndex;
          return (
            <div
              key={employee.id}
              style={{ minWidth: '200px', flexShrink: 0 }}
              data-index={actualIndex}
            >
              <EmployeeCard
                employee={employee}
                onEdit={onEditEmployee}
                onDelete={onDeleteEmployee}
              />
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {visibleEndIndex < employees.length && (
        <div className="d-flex justify-content-center p-3">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {/* Spacer for remaining items */}
      {visibleEndIndex < employees.length && (
        <div style={{ height: `${(employees.length - visibleEndIndex) * 160}px` }} />
      )}
    </div>
  );
};

VirtualizedEmployeeGrid.displayName = 'VirtualizedEmployeeGrid';

export default VirtualizedEmployeeGrid;