import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { toast } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SessionActivityDuration } from '@/components/session/SessionActivityDuration';
import { formatSessionCompactDateLabel } from '@/components/session/sidebar/utils';
import { useChatColumnActions } from '@/components/chat/chatColumnSession';
import { isVSCodeRuntime } from '@/lib/desktop';
import { useI18n } from '@/lib/i18n';
import { getProviderModelDisplayName } from '@/lib/modelDisplay';
import { opencodeClient } from '@/lib/opencode/client';
import type { Session } from '@/lib/opencode/model';
import { cn } from '@/lib/utils';
import { useConfigStore } from '@/stores/useConfigStore';
import { useUIStore } from '@/stores/useUIStore';
import { useGlobalSessionStatusStore } from '@/sync/global-session-status';
import { orderSubagentRows, useRunningSessionCount, useSessionChildren } from '@/sync/session-children';
import { useSessionUIStore } from '@/sync/session-ui-store';

interface SubagentsStripProps {
  sessionId: string | null;
  directory?: string;
}

/** The menu lists this many children at most; the rest are counted in a footer. */
export const SUBAGENTS_MENU_LIMIT = 20;

const stopPointer = (event: React.SyntheticEvent) => { event.stopPropagation(); };

const STOP_BUTTON_CLASS = 'inline-flex size-6 shrink-0 items-center justify-center rounded-md text-status-error/80 transition-colors hover:bg-interactive-hover hover:text-status-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50';

/**
 * Interrupts a child's turn: the same call the chat's Stop button makes for
 * that session, with the child's own directory (OpenCode routes the request to
 * the per-directory instance; the wrong one cancels nothing and still answers
 * 200). The caller handles the failure, so the strip can report it.
 */
const abortChild = (child: Session, fallbackDirectory: string | undefined): Promise<boolean> => (
  opencodeClient.abortSession(child.id, child.directory ?? fallbackDirectory)
);

const SubagentMenuItem: React.FC<{
  session: Session;
  fallbackDirectory: string | undefined;
  onOpen: (session: Session) => void;
}> = ({ session, fallbackDirectory, onOpen }) => {
  const { t } = useI18n();
  const providers = useConfigStore((state) => state.providers);
  // Live, not the open-time snapshot the row order uses: the dot, the timer and
  // the stop button follow the child as it finishes or is stopped.
  const running = useGlobalSessionStatusStore(React.useCallback((state) => state.activeSessionIds.has(session.id), [session.id]));
  const [stopping, setStopping] = React.useState(false);
  const title = session.title?.trim() || t('chat.workStatus.subagent.untitled');
  const modelName = getProviderModelDisplayName(
    providers.find((provider) => provider.id === session.model?.providerID),
    session.model?.id,
  );
  const statusLabel = t(running ? 'chat.subagents.status.running' : 'chat.subagents.status.finished');
  const stop = React.useCallback((event: React.MouseEvent) => {
    // The button sits inside the row; its click must stop the child, not open it.
    event.stopPropagation();
    event.preventDefault();
    if (stopping) return;
    setStopping(true);
    abortChild(session, fallbackDirectory)
      .catch(() => { toast.error(t('chat.subagents.stopFailed', { title })); })
      .finally(() => setStopping(false));
  }, [fallbackDirectory, session, stopping, t, title]);
  return (
    <DropdownMenuItem
      onSelect={() => onOpen(session)}
      aria-label={`${t('chat.subagents.open', { title })}. ${statusLabel}`}
      className="gap-2"
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', running ? 'bg-[var(--status-info)]' : 'bg-muted-foreground/40')}
        role="img"
        aria-label={statusLabel}
      />
      <span dir="auto" className="oc-ui-start-align min-w-0 flex-1 truncate text-foreground">{title}</span>
      {modelName ? (
        <span className="max-w-[9rem] shrink-0 truncate typography-meta text-muted-foreground">{modelName}</span>
      ) : null}
      {/* A running child shows its live turn timer; a finished one, how long ago it started. */}
      {running
        ? <SessionActivityDuration sessionId={session.id} running className="typography-meta" />
        : <span className="shrink-0 typography-meta tabular-nums text-muted-foreground/70">{formatSessionCompactDateLabel(session.time?.created ?? 0)}</span>}
      {running ? (
        <button
          type="button"
          data-subagent-stop=""
          disabled={stopping}
          onClick={stop}
          onPointerDown={stopPointer}
          onMouseDown={stopPointer}
          onPointerUp={stopPointer}
          onKeyDown={stopPointer}
          aria-label={t('chat.subagents.stop', { title })}
          title={t('chat.subagents.stop', { title })}
          className={STOP_BUTTON_CLASS}
        >
          <Icon name="stop" className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </DropdownMenuItem>
  );
};

/**
 * The session's subagents, as a top row of the composer: a chip with their
 * count that opens a menu of the child sessions, running ones first. A click
 * opens the child next to the chat, in the side panel; a running row's stop
 * button interrupts that child, the header's "Stop all" every running one.
 * This is the quick way into a subagent's transcript; the sidebar only marks
 * that a session has them.
 */
export const SubagentsStrip: React.FC<SubagentsStripProps> = React.memo(({ sessionId, directory }) => {
  const { t } = useI18n();
  const children = useSessionChildren(sessionId);
  const childIds = React.useMemo(() => children.map((child) => child.id), [children]);
  const runningCount = useRunningSessionCount(childIds);
  const isMobile = useUIStore((state) => state.isMobile);
  const openContextPanelTab = useUIStore((state) => state.openContextPanelTab);
  const setCurrentSession = useSessionUIStore((state) => state.setCurrentSession);
  const column = useChatColumnActions();
  const [open, setOpen] = React.useState(false);
  const [stoppingAll, setStoppingAll] = React.useState(false);
  // Read when the menu opens, not subscribed: the order must not reshuffle
  // under the pointer while a child finishes mid-selection.
  const rows = React.useMemo(() => (
    open ? orderSubagentRows(children, useGlobalSessionStatusStore.getState().activeSessionIds, SUBAGENTS_MENU_LIMIT) : []
  ), [children, open]);

  // Same branches as the transcript's Task tool: a chat already in the side
  // panel opens the child in place; single-surface layouts navigate to it;
  // the main chat opens a side-panel tab next to itself.
  const openChild = React.useCallback((child: Session) => {
    if (!directory) return;
    const label = child.title?.trim() || t('chat.workStatus.subagent.untitled');
    if (column.pinned) {
      column.openSession(child.id, directory);
      return;
    }
    if (isMobile || isVSCodeRuntime()) {
      setCurrentSession(child.id, directory);
      return;
    }
    openContextPanelTab(directory, {
      mode: 'chat',
      dedupeKey: `session:${child.id}`,
      label,
      sessionTitleFallback: label,
      targetDirectory: child.directory ?? directory,
      readOnly: true,
    });
  }, [column, directory, isMobile, openContextPanelTab, setCurrentSession, t]);

  // Every child running at click time, listed or not: the aborts go out
  // together and the menu stays open so the rows can be watched flipping.
  const stopAll = React.useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    if (stoppingAll) return;
    const active = useGlobalSessionStatusStore.getState().activeSessionIds;
    const running = children.filter((child) => active.has(child.id));
    if (running.length === 0) return;
    setStoppingAll(true);
    void Promise.allSettled(running.map((child) => abortChild(child, directory))).then((results) => {
      const failed = results.filter((result) => result.status === 'rejected').length;
      if (failed > 0) toast.error(t('chat.subagents.stopAllFailed', { count: failed }));
    }).finally(() => setStoppingAll(false));
  }, [children, directory, stoppingAll, t]);

  if (!sessionId || children.length === 0) return null;

  const count = children.length;
  const countLabel = t(count === 1 ? 'chat.subagents.count' : 'chat.subagents.countPlural', { count });
  const hidden = count - rows.length;

  return (
    <div role="group" className="flex h-10 items-center gap-2 border-b border-border/60 ps-3 pe-1.5" aria-label={t('chat.subagents.aria')}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-subagents-chip=""
            onMouseDown={(event) => event.preventDefault()}
            className={cn(
              'inline-flex h-6 min-w-0 max-w-full cursor-pointer select-none items-center gap-1.5 rounded-md border border-border/60 px-2 typography-meta transition-colors',
              'hover:bg-interactive-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              runningCount > 0 ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon name="git-fork" className={cn('size-3.5 shrink-0', runningCount > 0 && 'text-[var(--status-info)]')} aria-hidden="true" />
            <span className="min-w-0 truncate">{countLabel}</span>
            {runningCount > 0 ? (
              <span className="shrink-0 tabular-nums text-[var(--status-info)]">
                {t('chat.subagents.running', { count: runningCount })}
              </span>
            ) : null}
            <Icon name={open ? 'arrow-up-s' : 'arrow-down-s'} className="size-3.5 shrink-0" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-[min(26rem,calc(100vw-2rem))]">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="min-w-0 flex-1 typography-ui-header font-semibold text-foreground">{t('chat.workStatus.section.subagents')}</DropdownMenuLabel>
            {runningCount > 0 ? (
              <button
                type="button"
                data-subagents-stop-all=""
                disabled={stoppingAll}
                onClick={stopAll}
                onPointerDown={stopPointer}
                onMouseDown={stopPointer}
                onPointerUp={stopPointer}
                onKeyDown={stopPointer}
                aria-label={t('chat.subagents.stopAllAria', { count: runningCount })}
                className="me-1 inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 typography-meta text-status-error/80 transition-colors hover:bg-interactive-hover hover:text-status-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50"
              >
                <Icon name="stop" className="size-3.5" aria-hidden="true" />
                <span>{t('chat.subagents.stopAll')}</span>
              </button>
            ) : null}
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {rows.map(({ session }) => (
              <SubagentMenuItem key={session.id} session={session} fallbackDirectory={directory} onOpen={openChild} />
            ))}
          </div>
          {hidden > 0 ? (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 typography-meta text-muted-foreground">{t('chat.subagents.more', { count: hidden })}</div>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

SubagentsStrip.displayName = 'SubagentsStrip';
