export const DAY_USE_SLUG = 'day-use';
export const ELITE_CAMP_SLUG = 'elite-camp';
export const PRIVATE_CAMP_SLUG = 'private-camp';

export const PRIVATE_CAMP_TYPES = [
  { id: 'royal', ar: 'المخيم الملكي', en: 'Royal Camp' },
  { id: 'marzoum', ar: 'مخيم المرزوم', en: 'Al Marzoum Camp' },
  { id: 'shaheen', ar: 'مخيم شاهين', en: 'Shaheen Camp' },
  { id: 'expo', ar: 'مخيم إكسبو', en: 'Expo Camp' },
  { id: 'barqa', ar: 'مخيم البرقا', en: 'Al Barqa Camp' },
] as const;

export type PrivateCampTypeId = (typeof PRIVATE_CAMP_TYPES)[number]['id'];
export type VisitPeriod = 'MORNING' | 'EVENING';

export function isDayUse(slug?: string | null): boolean {
  return slug === DAY_USE_SLUG;
}

export function hasTentsField(slug?: string | null): boolean {
  return slug === ELITE_CAMP_SLUG;
}

export function hasCampTypeField(slug?: string | null): boolean {
  return slug === PRIVATE_CAMP_SLUG;
}

export function hasVisitPeriodField(slug?: string | null): boolean {
  return slug === DAY_USE_SLUG;
}

export function campTypeLabel(id: string | null | undefined, lang: 'ar' | 'en' = 'ar'): string {
  const match = PRIVATE_CAMP_TYPES.find((item) => item.id === id);
  if (!match) return id || '';
  return lang === 'en' ? match.en : match.ar;
}

export function isPrivateCampTypeId(value: string): value is PrivateCampTypeId {
  return PRIVATE_CAMP_TYPES.some((item) => item.id === value);
}
