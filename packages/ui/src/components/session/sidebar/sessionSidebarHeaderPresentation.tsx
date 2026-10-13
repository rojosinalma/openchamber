import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { SessionSidebarActivityKey } from './sessionSidebarRowModel';
import type { SortableZoneHandleProps } from './projects/sortableItems';

const ACTIVITY_ICON = { attention: 'notification-3', pinned: 'pushpin', work: 'eye', chats: 'chat-4', projects: 'folders' } as const;
// Zone icons carry the zone's tint (theme tokens, so every theme paints
// them): attention asks like an error, pinned sits where the pin marker's
// warning tone does, work is informational, chats read as settled (success),
// projects take the accent.
const ACTIVITY_ICON_TINT = {
  attention: 'text-status-error',
  pinned: 'text-status-warning',
  work: 'text-status-info',
  chats: 'text-status-success',
  projects: 'text-primary',
} as const;
const ACTIVITY_TITLE_KEY = {
  attention: 'sessions.sidebar.attention.title',
  pinned: 'sessions.sidebar.pinned.title',
  work: 'sessions.sidebar.work.title',
  chats: 'sessions.sidebar.activity.chatsTitle',
  projects: 'sessions.sidebar.projects.title',
} as const;

/** The zone's place among the zones on screen, for Move up / Move down. */
export type SessionSidebarZoneReorder = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (direction: 'up' | 'down') => void;
};

const stopPointer = (event: React.SyntheticEvent) => { event.stopPropagation(); };

export const SessionSidebarActivityHeader: React.FC<{
  activityKey: SessionSidebarActivityKey;
  collapsed: boolean;
  forceExpanded: boolean;
  alwaysShowActions: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  /** Drag wiring from `SortableZoneItem`; the whole header is the handle. */
  dragHandle?: SortableZoneHandleProps;
  /** Move up / Move down in the hover menu and the context menu; absent while zones are fixed. */
  reorder?: SessionSidebarZoneReorder;
}> = ({ activityKey, collapsed, forceExpanded, alwaysShowActions, onToggle, onNewChat, dragHandle, reorder }) => {
  const { t } = useI18n();
  const chats = activityKey === 'chats';
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
  // The mouse-up that ends a drag also fires a click on the header; that
  // click must not collapse the zone the user just moved. The flag is set
  // while dragging and cleared a tick after the drag ends: the click, if any,
  // arrives before that tick; a keyboard or cancelled drag leaves no stale flag.
  const draggedRef = React.useRef(false);
  const isDragging = dragHandle?.isDragging === true;
  if (isDragging) draggedRef.current = true;
  React.useEffect(() => {
    if (isDragging || !draggedRef.current) return;
    const timer = window.setTimeout(() => { draggedRef.current = false; }, 0);
    return () => window.clearTimeout(timer);
  }, [isDragging]);
  const handleToggleClick = React.useCallback(() => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }
    onToggle();
  }, [onToggle]);

  const title = t(ACTIVITY_TITLE_KEY[activityKey]);
  const actionVisibility = (open: boolean) => (open || alwaysShowActions
    ? 'opacity-100'
    : 'opacity-0 pointer-events-none group-hover/chats:opacity-100 group-hover/chats:pointer-events-auto group-focus-within/chats:opacity-100 group-focus-within/chats:pointer-events-auto');
  const renderMoveItems = (Item: React.ElementType) => reorder ? (
    <>
      <Item disabled={!reorder.canMoveUp} onClick={() => reorder.onMove('up')}>
        <Icon name="arrow-up-s" className="me-1.5 h-4 w-4" />
        {t('sessions.sidebar.zone.moveUp')}
      </Item>
      <Item disabled={!reorder.canMoveDown} onClick={() => reorder.onMove('down')}>
        <Icon name="arrow-down-s" className="me-1.5 h-4 w-4" />
        {t('sessions.sidebar.zone.moveDown')}
      </Item>
    </>
  ) : null;
  const moreButton = reorder ? (
    <DropdownMenu open={menuOpen} onOpenChange={(open) => { if (open) setContextMenuOpen(false); setMenuOpen(open); }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'absolute top-1/2 z-10 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            chats ? 'inset-e-7' : 'inset-e-0.5',
            actionVisibility(menuOpen),
          )}
          aria-label={t('sessions.sidebar.zone.menuAria', { zone: title })}
          onPointerDown={stopPointer}
          onMouseDown={stopPointer}
          onClick={stopPointer}
        >
          <Icon name="more-2" className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {renderMoveItems(DropdownMenuItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
  const newChatButton = chats ? (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onNewChat(); }}
      onPointerDown={stopPointer}
      onMouseDown={stopPointer}
      className={cn('absolute inset-e-0.5 top-1/2 z-10 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50', actionVisibility(false))}
      aria-label={t('sessions.sidebar.header.actions.newSession')}
    >
      <Icon name="add" className="h-4 w-4" />
    </button>
  ) : null;
  // End padding keeps the title clear of the hover actions: 24px per button
  // plus the band's own edge.
  const actionCount = (chats ? 1 : 0) + (reorder ? 1 : 0);
  const titlePadding = actionCount === 2 ? 'pe-16' : actionCount === 1 ? 'pe-10' : 'pe-3.5';
  const handleProps = dragHandle ? { ...dragHandle.attributes, ...dragHandle.listeners } : undefined;

  // One header in both views, so zones line up with the project headers.
  const button = (
    <button
      type="button"
      {...handleProps}
      onClick={forceExpanded ? undefined : handleToggleClick}
      disabled={forceExpanded}
      className={cn('group flex w-full items-center gap-1.5 py-1 ps-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50', titlePadding, dragHandle && 'cursor-grab active:cursor-grabbing select-none')}
      aria-expanded={!collapsed}
    >
      <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
        <Icon name={ACTIVITY_ICON[activityKey]} className={cn('h-3.5 w-3.5', ACTIVITY_ICON_TINT[activityKey], !forceExpanded && 'group-hover:hidden')} />
        {!forceExpanded ? <span className="hidden h-3.5 w-3.5 items-center justify-center text-muted-foreground group-hover:inline-flex">
          <Icon name={collapsed ? 'arrow-right-s' : 'arrow-down-s'} className="h-3.5 w-3.5" />
        </span> : null}
      </span>
      {/* A muted caps label at the project headers' size, set apart by case,
          weight and colour: zones are the sidebar's chapters, the projects
          inside them the sections. */}
      <span className="typography-ui-label font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
    </button>
  );

  const band = (
    <>
      {button}
      {moreButton}
      {newChatButton}
    </>
  );
  const bandClassName = 'relative group/chats -ms-2.5 -me-2';
  if (!reorder) return <div className={bandClassName}>{band}</div>;
  return (
    <ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <ContextMenuTrigger render={<div className={bandClassName} onContextMenu={(event) => { event.preventDefault(); setMenuOpen(false); setContextMenuOpen(true); }} />}>
        {band}
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[160px]">
        {renderMoveItems(ContextMenuItem)}
      </ContextMenuContent>
    </ContextMenu>
  );
};
