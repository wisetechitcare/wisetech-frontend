import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RevisionTimeline from '../RevisionTimeline';
import * as RevisionsHooks from '../../hooks/useRevisions';

// Mock the hook
vi.mock('../../hooks/useRevisions', () => ({
  useRevisions: vi.fn()
}));

describe('RevisionTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    (RevisionsHooks.useRevisions as any).mockReturnValue({
      revisions: [],
      loading: true,
      error: null,
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      fetchRevisions: vi.fn()
    });

    render(
      <RevisionTimeline entityType="LEAD" entityId="lead-123" />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render error state', () => {
    const errorMessage = 'Failed to fetch revisions';
    (RevisionsHooks.useRevisions as any).mockReturnValue({
      revisions: [],
      loading: false,
      error: errorMessage,
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      fetchRevisions: vi.fn()
    });

    render(
      <RevisionTimeline entityType="LEAD" entityId="lead-123" />
    );

    expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
  });

  it('should render empty state', () => {
    (RevisionsHooks.useRevisions as any).mockReturnValue({
      revisions: [],
      loading: false,
      error: null,
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      fetchRevisions: vi.fn()
    });

    render(
      <RevisionTimeline entityType="LEAD" entityId="lead-123" />
    );

    expect(screen.getByText(/no revision history/i)).toBeInTheDocument();
  });

  it('should render revisions timeline', () => {
    const mockRevisions = [
      {
        id: 'rev-1',
        revisionNumber: 1,
        entityType: 'LEAD',
        entityId: 'lead-123',
        summary: 'Contract Value Updated',
        category: 'FINANCIAL',
        changedByEmployeeId: 'emp-001',
        changedByFirstName: 'John',
        changedByLastName: 'Doe',
        changedAt: new Date().toISOString(),
        approvalRequired: false,
        changes: [
          {
            fieldName: 'rate',
            fieldType: 'number',
            oldValue: 500000,
            newValue: 600000,
            changeType: 'MODIFIED'
          }
        ]
      }
    ];

    (RevisionsHooks.useRevisions as any).mockReturnValue({
      revisions: mockRevisions,
      loading: false,
      error: null,
      pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
      fetchRevisions: vi.fn()
    });

    render(
      <RevisionTimeline entityType="LEAD" entityId="lead-123" />
    );

    expect(screen.getByText('Contract Value Updated')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should support pagination', () => {
    const mockRevisions = Array.from({ length: 40 }, (_, i) => ({
      id: `rev-${i}`,
      revisionNumber: i + 1,
      entityType: 'LEAD',
      entityId: 'lead-123',
      summary: `Change ${i + 1}`,
      category: 'BASIC_INFO',
      changedByEmployeeId: 'emp-001',
      changedByFirstName: 'John',
      changedByLastName: 'Doe',
      changedAt: new Date().toISOString(),
      approvalRequired: false,
      changes: []
    }));

    const fetchRevisions = vi.fn();
    (RevisionsHooks.useRevisions as any).mockReturnValue({
      revisions: mockRevisions.slice(0, 20),
      loading: false,
      error: null,
      pagination: { total: 40, page: 1, pageSize: 20, totalPages: 2 },
      fetchRevisions
    });

    render(
      <RevisionTimeline entityType="LEAD" entityId="lead-123" />
    );

    const page2Button = screen.getByRole('button', { name: '2' });
    fireEvent.click(page2Button);

    expect(fetchRevisions).toHaveBeenCalledWith(2);
  });

  it('should show compact mode', () => {
    const mockRevisions = Array.from({ length: 10 }, (_, i) => ({
      id: `rev-${i}`,
      revisionNumber: i + 1,
      entityType: 'LEAD',
      entityId: 'lead-123',
      summary: `Change ${i + 1}`,
      category: 'BASIC_INFO',
      changedByEmployeeId: 'emp-001',
      changedByFirstName: 'John',
      changedByLastName: 'Doe',
      changedAt: new Date().toISOString(),
      approvalRequired: false,
      changes: []
    }));

    (RevisionsHooks.useRevisions as any).mockReturnValue({
      revisions: mockRevisions,
      loading: false,
      error: null,
      pagination: { total: 10, page: 1, pageSize: 20, totalPages: 1 },
      fetchRevisions: vi.fn()
    });

    render(
      <RevisionTimeline entityType="LEAD" entityId="lead-123" compact={true} />
    );

    expect(screen.getByText(/showing 5 of 10/i)).toBeInTheDocument();
  });
});
