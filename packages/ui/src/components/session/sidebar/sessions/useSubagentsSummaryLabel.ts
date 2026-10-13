import { useI18n } from '@/lib/i18n';

/** "N subagents · M running", the words the row's marker and its tooltip share. */
export const useSubagentsSummaryLabel = (count: number, running: number): string => {
  const { t } = useI18n();
  return t(count === 1 ? 'sessions.sidebar.session.subagents.summary' : 'sessions.sidebar.session.subagents.summaryPlural', { count, running });
};
