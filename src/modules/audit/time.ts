import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export function fromNow(iso?: string | null): string {
  if (!iso) return '';
  return dayjs(iso).fromNow();
}

export function fullDateTime(iso?: string | null): string {
  if (!iso) return '';
  return dayjs(iso).format('DD MMM YYYY, HH:mm');
}
