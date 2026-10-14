/** Shared-surface panel strings — merged into each locale's main dictionary. */
export const surfacePanelEn = {
  'contextPanel.surface.unavailable': 'This extension\'s surface is unavailable. Check that it is enabled and approved in Settings → Extensions.',
  'contextPanel.surface.status.connecting': 'Connecting…',
  'contextPanel.surface.status.reconnecting': 'Connection lost. Reconnecting…',
  'contextPanel.surface.status.ready': 'Click or type to take control',
  'contextPanel.surface.status.readyFocused': 'Type to control the surface; click outside to leave',
  'contextPanel.surface.status.agentWorking': 'Agent is working',
  'contextPanel.surface.status.youControl': 'You have control',
  'contextPanel.surface.status.otherControls': 'Another device has control',
  'contextPanel.surface.handBack': 'Hand back to agent',
  'contextPanel.surface.retry': 'Try again',
  'contextPanel.surface.canvasAria': 'Live surface of {name}',
  'contextPanel.surface.ended.service-stopped': 'The extension\'s service stopped.',
  'contextPanel.surface.ended.extension-unavailable': 'The extension is unavailable. Check Settings → Extensions.',
  'contextPanel.surface.ended.host-shutdown': 'OpenChamber is shutting down.',
} as const;
