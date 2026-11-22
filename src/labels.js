export const COURSES = [
  ['hapje', 'Hapje'],
  ['voorgerecht', 'Voorgerecht'],
  ['hoofdgerecht', 'Hoofdgerecht'],
  ['bijgerecht', 'Bijgerecht'],
  ['dessert', 'Dessert'],
];
export const OCCASIONS = [
  ['etentje', 'Etentje'],
  ['doordeweeks', 'Doordeweeks'],
  ['beide', 'Allebei'],
];
export const MAKE_AHEAD = [
  ['volledig', 'Volledig vooraf'],
  ['deels', 'Deels vooraf'],
  ['nee', 'Last minute'],
];
export const TIMES = [
  ['30', 'Max. 30 min'],
  ['60', 'Max. 1 uur'],
  ['lang', 'Langer dan 1 uur'],
];
export const STATUSES = [
  ['wil_ik', 'Wil ik nog maken'],
  ['gemaakt', 'Gemaakt'],
];
export const SOURCES = {
  link: 'Website', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', foto: 'Kookboek', zelf: 'Zelf ingevoerd',
};

export const label = (list, value) => list.find(([v]) => v === value)?.[1] || '';

export function formatMinutes(min) {
  if (!min) return '';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} u ${m} min` : `${h} u`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });
}
