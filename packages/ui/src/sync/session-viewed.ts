import type { Session } from "@/lib/opencode/model"
import { compact } from "@/lib/opencode/model"
import { opencodeClient } from "@/lib/opencode/client"
import { getRuntimeKey, subscribeRuntimeEndpointWillChange } from "@/lib/runtime-switch"
import { resolveGlobalSessionDirectory, useGlobalSessionsStore } from "@/stores/useGlobalSessionsStore"
import { getAllSyncSessions, getSyncSessionDirectory } from "./sync-refs"

/**
 * Persistent "viewed" acknowledgement.
 *
 * `markSessionViewed` (notification-store) clears the in-memory unread marker
 * for this tab. This module is the server-side counterpart: it tells OpenCode
 * the user has looked at the session up to its last finished turn, so
 * `time.viewed` advances on the record, the sidebar's persistent unseen signal
 * (`isSessionUnseen`) clears, and every other client sees the same state
 * through the `session.viewed` echo.
 *
 * Callers invoke it from the same places that mark a session viewed locally,
 * some of them on a timer. The write is therefore keyed by the turn it
 * acknowledges: one request per `(session, time.idle)`, nothing while a turn is
 * still running (no `time.idle` newer than `time.viewed`), and a failed request
 * forgets the key so the next call retries.
 *
 * The optimistic patch lands on the global sessions store only, which is what
 * the sidebar renders. Directory stores learn the stamp from the echo.
 */

const acknowledged = new Map<string, { runtimeKey: string; idle: number }>()

subscribeRuntimeEndpointWillChange(() => acknowledged.clear())

const findKnownSession = (sessionId: string): Session | null => (
  useGlobalSessionsStore.getState().entityById.get(sessionId)
  ?? getAllSyncSessions().find((session) => session.id === sessionId)
  ?? null
)

/**
 * Acknowledges the session's last finished turn on the server. A no-op when
 * the session is unknown here, has never finished a turn, or was already
 * viewed at or after its `time.idle`. Fire-and-forget: failures are logged and
 * the acknowledgement is retried on the next call.
 */
export function markSessionViewedRemote(sessionId: string, directoryHint?: string | null): void {
  if (!sessionId) return
  const session = findKnownSession(sessionId)
  if (!session) return
  const idle = session.time.idle
  if (idle === undefined) return
  if (idle <= (session.time.viewed ?? 0)) return

  const runtimeKey = getRuntimeKey()
  const previous = acknowledged.get(sessionId)
  if (previous && previous.runtimeKey === runtimeKey && previous.idle >= idle) return
  acknowledged.set(sessionId, { runtimeKey, idle })

  const directory = directoryHint
    ?? resolveGlobalSessionDirectory(session)
    ?? getSyncSessionDirectory(sessionId)
    ?? session.directory
  // Optimistic: the row stops asking for attention now; the `session.viewed`
  // echo carries the server's own stamp and lands on the same field.
  useGlobalSessionsStore.getState().upsertSession({ ...session, time: compact({ ...session.time, viewed: idle }) })

  void opencodeClient.viewSession(sessionId, idle, directory).catch((error) => {
    if (getRuntimeKey() !== runtimeKey) return
    const current = acknowledged.get(sessionId)
    if (current && current.idle === idle) acknowledged.delete(sessionId)
    console.warn(`[session-viewed] Failed to record view for ${sessionId}:`, error)
  })
}

/** Test seam: forget every acknowledgement. */
export function resetSessionViewedAcknowledgements(): void {
  acknowledged.clear()
}
