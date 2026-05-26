const parseFlag = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

export const NEW_MY_TEAM_IA = parseFlag(import.meta.env.VITE_NEW_MY_TEAM_IA, import.meta.env.DEV);
