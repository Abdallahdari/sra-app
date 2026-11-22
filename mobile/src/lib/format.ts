const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtDate(iso?: string, long = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const m = long
    ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()]
    : MONTHS[d.getUTCMonth()];
  return `${d.getUTCDate()} ${m} ${d.getUTCFullYear()}`;
}

export const isUpcoming = (iso?: string) => !!iso && new Date(iso).getTime() > Date.now();

export const youtubeId = (url?: string) => (url?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1];

export const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
