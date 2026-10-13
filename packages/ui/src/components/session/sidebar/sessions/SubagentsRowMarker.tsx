import React from 'react';
import { Icon } from '@/components/icon/Icon';
import { cn } from '@/lib/utils';
import { RowMarkTooltip } from './RowMarkTooltip';
import { useSubagentsSummaryLabel } from './useSubagentsSummaryLabel';

/**
 * Marks a sidebar row whose session has subagents: a fork glyph and their
 * count in the meta cluster, tinted while one of them runs. A mark only, no
 * tree: the composer's chip is where the children open from.
 */
export const SubagentsRowMarker: React.FC<{ count: number; running: number }> = ({ count, running }) => {
  const label = useSubagentsSummaryLabel(count, running);
  if (count === 0) return null;
  return (
    <RowMarkTooltip label={label}>
      <span
        data-subagents-marker=""
        data-running={running > 0 ? '' : undefined}
        className={cn(
          'inline-flex flex-shrink-0 items-center gap-0.5 typography-micro leading-none tabular-nums',
          running > 0 ? 'text-[var(--status-info)]' : 'text-muted-foreground/60',
        )}
        aria-label={label}
      >
        <Icon name="git-fork" className="h-3 w-3" />
        <span>{count}</span>
      </span>
    </RowMarkTooltip>
  );
};
