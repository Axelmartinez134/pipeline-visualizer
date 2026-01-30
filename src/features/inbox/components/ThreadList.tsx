import type { Thread } from '../types';
import { ThreadListItem } from './ThreadListItem';

export function ThreadList({
  threads,
  selectedId,
  onSelect,
}: {
  threads: Thread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (threads.length === 0) {
    return <div className="px-4 py-6 text-slate-500">No accepted leads yet.</div>;
  }

  return (
    <div className="overflow-y-auto">
      {threads.map((t) => (
        <ThreadListItem
          key={t.id}
          thread={t}
          active={selectedId === t.id}
          onClick={() => onSelect(t.id)}
        />
      ))}
    </div>
  );
}

