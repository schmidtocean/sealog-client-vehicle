export const standardUserRoleOptions = [
  { value: 'cruise_manager', label: 'Cruise Manager', description: 'Ability to edit cruises and lowerings.' },
  { value: 'template_manager', label: 'Template Manager', description: 'Ability to edit event templates.' },
  { value: 'event_manager', label: 'Event Manager', description: 'Ability to review events independent of lowerings.' },
  { value: 'power_logger', label: 'Power Logger', description: 'Ability to access power_logger event template ie milestones.' },
  { value: 'event_logger', label: 'Event Logger', description: 'Ability to submit new events.' },
  { value: 'event_watcher', label: 'Event Watcher', description: 'Ability to view events.' }
];

export const CRUISE_MANAGER = 'cruise_manager';
export const TEMPLATE_MANAGER = 'template_manager';
export const EVENT_MANAGER = 'event_manager';
export const POWER_LOGGER = 'power_logger';
export const EVENT_LOGGER = 'event_logger';
export const EVENT_WATCHER = 'event_watcher';
