import { useState, useCallback, useEffect } from "react";
import { fetchAllPrefixSettings } from "@services/options";
import { convertFiscalYearToYearFormat } from "@app/modules/common/components/PrefixSettingsForm";
import { PrefixState } from "../types/formEngine.types";

/**
 * usePrefixGeneration
 *
 * Global reusable hook for auto-generating document numbers.
 * Fetches prefix settings by identifier (e.g. "PROJECT", "LEAD") and
 * combines them with a count to produce the running serial number.
 *
 * In edit mode, the saved prefix is used as-is and never overwritten.
 *
 * @param identifier     Settings key, e.g. "PROJECT" | "LEAD"
 * @param countFetcher   Async function that returns the current record count
 * @param existingPrefix Saved prefix from the record being edited (blocks auto-gen)
 */
export function usePrefixGeneration(
  identifier: string,
  countFetcher: () => Promise<number>,
  existingPrefix?: string
): PrefixState {
  const [prefixSettings, setPrefixSettings] = useState<any>(null);
  const [count, setCount] = useState<number | null>(null);
  const [editablePrefix, setEditablePrefix] = useState<string>("");

  const fetchSettings = useCallback(async () => {
    if (prefixSettings) return;
    try {
      const res = await fetchAllPrefixSettings();
      const settings: any[] = res?.data?.prefixSettings || [];
      const match = settings.find((p) => p.identifier === identifier);
      if (match) setPrefixSettings(match);
    } catch {
      // non-critical — prefix will remain empty
    }
  }, [identifier, prefixSettings]);

  const fetchCount = useCallback(async () => {
    if (count !== null) return;
    try {
      const c = await countFetcher();
      setCount(c);
    } catch {
      setCount(0);
    }
  }, [count, countFetcher]);

  useEffect(() => {
    fetchSettings();
    fetchCount();
  }, [fetchSettings, fetchCount]);

  // Generate or restore prefix whenever dependencies change
  useEffect(() => {
    if (existingPrefix) {
      // Edit mode: always show the saved number, never regenerate
      setEditablePrefix(existingPrefix);
      return;
    }
    if (prefixSettings?.prefix && count !== null) {
      const year = convertFiscalYearToYearFormat(prefixSettings.year);
      setEditablePrefix(`${prefixSettings.prefix}/${year}/${count + 1}`);
    }
  }, [prefixSettings, count, existingPrefix]);

  return { editablePrefix, setEditablePrefix };
}
