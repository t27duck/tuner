# Project: Local MP3 Library Management/Player Web App

## High-Level Goal

Build a MP3 management web app to manage my local library of MP3s.

# Features

## Library Management

### Scanning & Import
- Scan music directory for MP3 files (background job with real-time progress)
- Automatic metadata extraction from ID3 tags (title, artist, album, genre, year, track number, disc number)
- Default to filename if no title tag found
- Automatic sync: removes database entries when files are deleted from disk
- Real-time sync progress via WebSocket (ActionCable)
- Sync progress bar below navigation with stable counter (current/total) and current filename
- Color-coded status text: blue (running), green (completed), red (failed)
- Completed status auto-hides after 5 seconds
- Sync button disabled while sync is running
- Re-syncing updates existing song metadata instead of skipping
- Per-file error handling: individual import failures are logged without aborting the sync
- MP3 tag string sanitization (invalid UTF-8, null characters)

### Metadata Editing
- Edit song metadata: title, artist, album, genre, year, disc number, track number
- Changes to database records should always be reflected on the file metadata
- Album art upload and management
- Inline editing on song list (double-click to edit cells)
- ID3v1 and ID3v2 tag writing with APIC frame support for album art

### Bulk Operations
- Multi-select songs with checkboxes
- Bulk update metadata fields across multiple songs
- Bulk album art assignment
- Select all / deselect all functionality
- Selection count indicator

### File Organization
- Reorganize files using customizable path templates
- Template tokens: `<Artist>`, `<Album>`, `<Title>`, `<Genre>`, `<Year>`, `<Disc>`, `<Track>`, `<Track:N>` (zero-padded), `<Filename>`
- Preview changes before applying
- Automatic directory creation and empty directory cleanup
- Filename sanitization (removes illegal characters)

### Song Removal
- Delete song from library and file permanently from disk

### Context Menu
- Right-click on any song for quick actions
- Edit
- Delete

## Search & Filtering

### Global Search
- Single search field searches across title, artist, album, and genre
- Real-time search as-you-type with debounce
- Clear button to reset search

### Advanced Filters
- Individual filter fields for title, artist, album, genre, year, file path
- File path filter properly escapes underscores (_) in the query while searching
- Combine multiple filters simultaneously
- Sort by any column
- Filter by missing metadata (songs without artist, album, genre, or year)

### Pagination
- Paginated results with count display

## User Interface

- Dark mode professional theme
- Toast notifications for user actions
- Responsive layout and mobile-friendly
- Prefer blues for accent theme colors.

## Accessibility

The application must maintain WCAG compliance and screen reader compatibility:

### Screen Reader Support
- All icon-only buttons must have `aria-label` attributes
- SVG icons must have `aria-hidden="true"` to prevent duplicate announcements
- Modals must have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal title
- Dynamic content changes must be announced via ARIA live regions
- Images must have descriptive alt text (e.g., album covers should include song title and artist)

### Keyboard Navigation
- Skip link ("Skip to main content") for bypassing navigation
- All interactive elements must be keyboard accessible
- Focus must be visible on all interactive elements
- Current page indicated with `aria-current="page"` in navigation

### Form Accessibility
- All form inputs must have associated labels
- Checkboxes must have `aria-label` describing what they select
- Sortable table headers must indicate sort state with `aria-sort`

### Landmarks and Structure
- Main navigation must have `aria-label="Main navigation"`
- Main content area must have `id="main-content"` for skip link target
- Panels must be marked as dialogs when open
