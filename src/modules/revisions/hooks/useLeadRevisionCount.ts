import { useState, useEffect } from 'react';
import { prisma } from '@db/prisma';
import RevisionsService from '../services/revisions.service';

/**
 * Hook to fetch the actual revision count for a lead from the revisions table
 */
export const useLeadRevisionCount = (leadId: string) => {
  const [revisionCount, setRevisionCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;

    const fetchRevisionCount = async () => {
      try {
        setLoading(true);
        const data = await RevisionsService.getRevisionHistory('LEAD', leadId, 1, 1);
        setRevisionCount(data.pagination.total);
      } catch (error) {
        console.error('Failed to fetch revision count:', error);
        setRevisionCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchRevisionCount();
  }, [leadId]);

  return { revisionCount, loading };
};

export default useLeadRevisionCount;
