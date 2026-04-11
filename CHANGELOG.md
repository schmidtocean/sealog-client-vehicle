# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.3] - 2026-04-11

### Fixed
- **Event exports scoped to current lowering** — `ExportDropdown` in the review replay view was passing `cruiseID` instead of `loweringID`, causing exports to return all events across the cruise rather than just the current lowering
- **Event comment not saved without file attachments** — submitting a comment in the event comment modal returned early before calling `handleUpdateEvent` when no file attachments were present, silently discarding the comment

### UI
- **Clickable elements styled as interactive** — elements with `onClick` handlers now show a pointer cursor; icons acting as buttons carry `role="button"`; event list rows extend the click target to the full row width including the comment icon; event image cards show reduced opacity on hover

### Security
- Removed underline-on-hover from clickable elements to match design intent

### Internal
- Updated `babel-loader` to v10, `eslint-config-prettier` to v10, `sass-loader` to v16, and `webpack-cli` to v7
- Switched `sass-loader` to modern Sass API (`api: 'modern'`)
- Renamed `--node-env` to `--config-node-env` in npm scripts to match webpack-cli v7

## [2.4.2] - 2026-04-10

### Added
- **Event file attachments** — events can now have files attached via the event template options modal; attached files are stored as `eventFileAttachments` aux data records
- **Attachment previews in comment modal** — file attachments are displayed as thumbnail image previews with filename and delete controls in the event comment modal
- **Login via email** — users can now log in using either their username or email address
- **POWER_LOGGER user role** — new role added for users who need elevated event logging permissions
- **WebSocket live updates in Event Management** — the event list now updates in real time as events are created, modified, or deleted

### Fixed
- **Newest event not displaying** — race condition in event history caused the most recent event to not appear on load
- **Event history card stability** — the newest event card no longer changes when navigating to older pages; it always reflects the most recent event
- **Review replay stale state** — playback controls (play, fast-forward, reverse, start, end) were advancing to the wrong event due to stale state reads after `setState`; all fixed
- **Review replay timer leak** — slider debounce timer was stored in component state, preventing proper cleanup on unmount
- **Gallery tab timer** — pagination debounce timer moved from component state to instance variable, eliminating stale state reads
- **Event management pagination** — page number now adjusts correctly after an event is deleted
- **WebSocket disconnect** — execute modal now properly disconnects its WebSocket client on unmount

### Security
- Resolved all npm audit vulnerabilities
- Upgraded `@hapi/nes` to v14

### Internal
- Extracted shared utilities (`resolveStartTS`, `connectWSClient`, `buildEventQuery`) into `src/utils.js`; adopted across event history, event management, event template list, and footer
- Removed unused `lowering_dropdown.js` component
- Removed pointless `connect(null, null)` Redux wrappers from `CustomPagination` and `ExportDropdown`
- Eliminated state-mirroring-props pattern in `ExportDropdown`; extracted triplicated query building into `buildQuery()`
- Extracted repeated `findCurrentCruise()` helper in `CruiseMenu`
- Removed empty constructor and unused import in `EventLogging`
- Removed unused `replayEventIndex` state and dead code branch in `ReviewGallery`
- Updated `prettier`, `concurrently`, and `sass` to latest
