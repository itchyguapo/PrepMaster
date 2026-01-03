import { getSyncQueue, queueSync, removeFromSyncQueue, isOnline } from "./offlineStorage";

// Simple background sync manager. It queues payloads while offline and
// attempts to POST them when connectivity returns. Backend endpoints can be
// wired later; for now, it safely no-ops on failures to avoid data loss.

const SYNC_ENDPOINT = "/api/sync"; // placeholder; adjust when backend is ready

let isSyncing = false;

export async function enqueueForSync(type: "questionData" | "attempt", payload: any) {
  await queueSync({ type, payload });
  triggerBackgroundSync();
}

export async function triggerBackgroundSync() {
  if (isSyncing || !isOnline()) return;
  isSyncing = true;

  try {
    const queue = await getSyncQueue();
    for (const item of queue) {
      try {
        // Attempt to sync to backend; if backend isn't ready, this will fail gracefully
        const res = await fetch(SYNC_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: item.type, payload: item.payload }),
        });

        if (res.ok) {
          await removeFromSyncQueue(item.id);
        } else {
          // stop processing to avoid hammering the server
          break;
        }
      } catch (_err) {
        // stay in queue; will retry later
        break;
      }
    }
  } finally {
    isSyncing = false;
  }
}

// Register online listener once
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    triggerBackgroundSync().catch(() => {});
  });
}

