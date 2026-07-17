let settings = { intervalHours: 6, enabled: true };
export function getCollectorSettings() { return settings; }
export function updateCollectorSettings(input: { intervalHours?: number; enabled?: boolean }) { settings = { ...settings, ...input }; return settings; }
