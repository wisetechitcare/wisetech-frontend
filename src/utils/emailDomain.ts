import axios from "axios";
import { USERS } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Address format: RFC 5322 dot-atom local part (so `o'brien@` and `a+tag@` pass, `a..b@` and
 * `.a@` don't) and a domain of real labels ending in a 2+ letter TLD (so `a@b` and `a@-x.com`
 * don't).
 */
export const EMAIL_FORMAT =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

const domainOf = (email?: string | null) => String(email || "").trim().split("@").pop()!.toLowerCase();

/**
 * Format can't catch `x@gmall.com` or `x@gmaail.com` — both are well-formed. The server checks
 * for a typo of a big provider (gmaail.com is registered and even receives mail — just not
 * yours) and for a missing mail server. This caches its verdict per domain so a SYNCHRONOUS
 * Yup rule can read it (the onboarding wizard runs its schema with validateSync).
 */
type Verdict = { deliverable: boolean; suggestion: string | null };
const verdicts = new Map<string, Verdict>();

export const isUndeliverableEmail = (email?: string | null) =>
  !!email && verdicts.get(domainOf(email))?.deliverable === false;

export const undeliverableEmailMessage = ({ value }: { value?: string }) => {
  const domain = domainOf(value);
  const suggestion = verdicts.get(domain)?.suggestion;
  if (!suggestion) return `"${domain}" can't receive email. Check the spelling of the address.`;
  const local = String(value || "").trim().slice(0, String(value || "").trim().lastIndexOf("@"));
  return `"${domain}" looks like a typo of ${suggestion}. Did you mean ${local}@${suggestion}?`;
};

/** Asks the server once per domain. A failed request leaves it unknown, and the save is checked again server-side. */
export const checkEmailDomain = async (email?: string | null) => {
  const value = String(email || "").trim();
  if (!EMAIL_FORMAT.test(value) || verdicts.has(domainOf(value))) return;
  try {
    const { data } = await axios.get(`${API_BASE_URL}/${USERS.EMAIL_CHECK}`, { params: { email: value } });
    verdicts.set(domainOf(value), { deliverable: data?.deliverable !== false, suggestion: data?.suggestion ?? null });
  } catch {
    /* unknown — the server re-checks on save */
  }
};
