import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Spinner } from '@/ds/ui/spinner';
import { EmptyState } from '@/ds/patterns/empty-state';
import { MasterList, type MasterItem } from '@/ds/patterns/master-list';
import { SettingsSection } from '@/ds/patterns/settings-section';
import { toast } from '@app/modules/common/components/ui';
import { createNewTowns, fetchAllTowns, updateTownById } from '@services/options';
import { canSection } from '@utils/can';

interface ITown {
  id: string;
  name: string;
}

/**
 * Towns — the list a branch's required Town field picks from.
 *
 * A town is one name, so it is a tile, not a table row (Master List `layout="grid"`). One field does both
 * jobs — type to filter, and when nothing matches exactly, Enter (or Add town) creates it; a town already in
 * the list is refused. Renaming happens in place. Without Write, the field is a search box.
 */
function Towns() {
  const canWrite = canSection('settings', 'write');
  const [towns, setTowns] = useState<ITown[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetchAllTowns();
      setTowns(res?.data?.towns || []);
    } catch (e) {
      console.error('Error fetching towns:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const items: MasterItem[] = useMemo(
    () => [...towns].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ id: t.id, name: t.name, tone: 'cyan' })),
    [towns],
  );

  const handleAdd = async (name: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await createNewTowns({ companyId: '', towns: [name] });
      await load();
      toast({ icon: 'success', title: `Added ${name}` });
    } catch (e) {
      console.error('Error creating town:', e);
      toast({ icon: 'error', title: `Couldn't add ${name}. Try again.` });
    } finally {
      setSaving(false);
    }
  };

  /** Duplicates are refused by the list itself; this only saves. */
  const handleRename = async (item: MasterItem, name: string) => {
    setSaving(true);
    try {
      await updateTownById(item.id, { name });
      setTowns((list) => list.map((t) => (t.id === item.id ? { ...t, name } : t)));
    } catch (e) {
      console.error('Error renaming town:', e);
      toast({ icon: 'error', title: `Couldn't rename ${item.name}. Try again.` });
      throw e; // keep the rename field open so nothing typed is lost
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <SettingsSection
        title="Towns"
        description="Branches pick their town from this list."
        icon={<MapPin aria-hidden />}
        tone="cyan"
        count={towns.length}
        divided={false}
      >
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner className="size-5" aria-label="Loading towns" /> Loading towns…
          </p>
        ) : (
          <MasterList
            label="Towns"
            items={items}
            layout="grid"
            filterOnType
            busy={saving}
            maxLength={80}
            addLabel="Add town"
            addPlaceholder={canWrite ? 'Town name, e.g. Andheri' : 'Town name'}
            onAdd={canWrite ? handleAdd : undefined}
            onRename={canWrite ? handleRename : undefined}
            empty={
              <EmptyState
                size="sm"
                icon={<MapPin aria-hidden />}
                title="No towns yet"
                description={canWrite ? 'Add the first one in the box above.' : 'An admin can add towns here.'}
              />
            }
          />
        )}
      </SettingsSection>
    </div>
  );
}

export default Towns;
