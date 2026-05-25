import { computeLeaveUsage } from './calculations';

import dayjs from 'dayjs';

export interface Suggestion {
  start: Date;
  end: Date;
  leaveDays: number;
  daysOff: number;
  efficiency: number;
  description: string;
}

export function generateMonthlySuggestions(
  month: Date,
  holidays: Set<string>,
  maxLeave: number,
  maxSuggestions = 3
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let startM = dayjs(month).startOf('month');
  const endM = dayjs(month).endOf('month');

  // Prevent suggesting past dates. If the search month is the current month or earlier,
  // start suggesting from tomorrow to ensure "Upcoming Windows" are genuinely in the future.
  const tomorrow = dayjs().startOf('day').add(1, 'day');
  if (startM.isBefore(tomorrow)) {
    startM = tomorrow;
  }

  // Ensure maxLeave is reasonable for calculating (if someone has 30 leaves, don't generate 30 days range as default suggestion)
  const maxSearchLeave = Math.min(maxLeave, 5); // search up to 5 leave days max to give realistic short suggestions

  for (let s = startM; s.isBefore(endM) || s.isSame(endM, 'day'); s = s.add(1, 'day')) {
    for (let len = 3; len <= 10; len++) {
      const e = s.add(len - 1, 'day');
      if (e.isAfter(endM, 'day')) break;

      const { leaveDays, daysOff, efficiencyScore } = computeLeaveUsage(s.toDate(), e.toDate(), holidays);
      
      // We want ranges that actually consume leaves but not more than user has
      if (leaveDays === 0 || leaveDays > maxSearchLeave) continue;
      
      // Only suggest highly efficient leaves (more days off than leaves taken)
      if (efficiencyScore <= 1.2) continue;

      suggestions.push({
        start: s.toDate(),
        end: e.toDate(),
        leaveDays,
        daysOff,
        efficiency: efficiencyScore,
        description: `Take ${leaveDays} ${leaveDays === 1 ? 'leave' : 'leaves'} for ${daysOff} days off`,
      });
    }
  }

  // Deduplicate overlapping highly similar suggestions, preferring highest efficiency, then lowest leave days
  suggestions.sort((a, b) => b.efficiency - a.efficiency || a.leaveDays - b.leaveDays || dayjs(a.start).valueOf() - dayjs(b.start).valueOf());
  
  const uniqueSuggestions: Suggestion[] = [];
  
  for (const suggestion of suggestions) {
    if (uniqueSuggestions.length >= maxSuggestions) break;
    
    // Check overlap with existing selected top suggestions
    const overlap = uniqueSuggestions.some(us => {
      const s1 = dayjs(us.start);
      const e1 = dayjs(us.end);
      const s2 = dayjs(suggestion.start);
      const e2 = dayjs(suggestion.end);
      
      return s1.isBefore(e2) && s2.isBefore(e1); // ranges overlap
    });
    
    if (!overlap) {
      uniqueSuggestions.push(suggestion);
    }
  }

  return uniqueSuggestions;
}
