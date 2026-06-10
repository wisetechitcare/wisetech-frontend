const parseFlag = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

// "My Team" IA is now GA (on everywhere). The env var is kept only as an optional
// override — set VITE_NEW_MY_TEAM_IA=false to turn it off — so nothing needs to be
// configured in any environment for it to show. (Previously it defaulted to
// import.meta.env.DEV, which silently hid it in production.)
export const NEW_MY_TEAM_IA = parseFlag(import.meta.env.VITE_NEW_MY_TEAM_IA, true);
