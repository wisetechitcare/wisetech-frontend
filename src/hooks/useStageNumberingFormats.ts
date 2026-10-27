import { useCallback, useEffect, useState } from "react";
import { getAllStageNumberingFormats } from "@services/stageNumberingFormat";
import type { StageNumberingFormat } from "@utils/stageNumbering";

/**
 * The configured stage numbering formats. Backed by the cached request, so several
 * components on one screen share a single fetch. A failed load leaves the list empty, and
 * `formatStageNo` then prints bare positions — numbering never blocks a plan.
 */
export const useStageNumberingFormats = () => {
  const [formats, setFormats] = useState<StageNumberingFormat[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await getAllStageNumberingFormats();
      setFormats(res?.formats ?? []);
    } catch {
      /* non-blocking — see above */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  return { formats, loading, reload, setFormats };
};
