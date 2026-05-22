import dayjs from 'dayjs';
import { Suggestion } from './suggestionEngine';
import { computeLeaveUsage } from './calculations';

export interface LeaveInsight {
  type: 'opportunity' | 'warning' | 'summary' | 'tip';
  title: string;
  message: string;
  score?: string;
}

export function generateUserInsights(
  history: any[], // Leave requests array
  suggestions: Suggestion[],
  holidays: Set<string>
): LeaveInsight[] {
  const insights: LeaveInsight[] = [];
  
  // Future Optimization: Top Suggestion
  if (suggestions.length > 0) {
    const top = suggestions[0];
    insights.push({
      type: 'opportunity',
      title: '💡 Best Upcoming Window',
      message: `Take ${top.leaveDays} ${top.leaveDays === 1 ? 'leave' : 'leaves'} from ${dayjs(top.start).format('MMM DD')} to ${dayjs(top.end).format('MMM DD')} for a ${top.daysOff}-day break!`,
      score: `${top.efficiency.toFixed(1)}x`,
    });
  }

  // Analyze Past Efficiency
  if (history && history.length > 0) {
    let totalPastLeaves = 0;
    let totalPastDaysOff = 0;
    
    // Only analyze approved/taken leaves
    const validHistory = history.filter((h: any) => h.status !== 2); // Assuming 2 is rejected
    
    validHistory.forEach((h: any) => {
      const start = new Date(h.dateFrom);
      const end = new Date(h.dateTo);
      const usage = computeLeaveUsage(start, end, holidays);
      totalPastLeaves += usage.leaveDays;
      totalPastDaysOff += usage.daysOff;
    });

    const overallEfficiency = totalPastLeaves === 0 ? 0 : totalPastDaysOff / totalPastLeaves;

    if (totalPastLeaves > 0) {
      insights.push({
        type: 'summary',
        title: '📊 Year-to-Date Impact',
        message: `You turned ${totalPastLeaves} leaves into ${totalPastDaysOff} days off this year.`,
        score: `${overallEfficiency.toFixed(1)}x`,
      });

      if (overallEfficiency < 1.5) {
        insights.push({
          type: 'tip',
          title: '📈 Optimization Tip',
          message: `Your efficiency is slightly low. Try attaching leaves to weekends or public holidays to maximize your rest!`,
        });
      } else if (overallEfficiency >= 2.5) {
        insights.push({
          type: 'tip',
          title: '🔥 Master Planner',
          message: `Incredible! You are highly efficient at maximizing your time off using holidays and weekends.`,
        });
      }
    }
  }

  return insights;
}
