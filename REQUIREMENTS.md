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

### Upload
- Drag-and-drop upload page for MP3 files and folders
- Files saved to `_NEW/` directory inside the music root
- Folder structure from dragged directories is preserved
- Metadata extracted automatically and Song records created
- Click-to-browse fallback via hidden file input
- Client-side progress tracking: progress bar, counter (completed/total), scrollable message log
- Summary shown on completion with success/failure counts
- Path traversal prevention on server side
- Duplicate file handling via `find_or_initialize_by` on file path
- Real-time server broadcast via `UploadChannel` (ActionCable)
- Non-MP3 files rejected with error response
- Upload link in navigation bar

### Audio Playback
- Persistent audio player bar fixed to bottom of screen
- Play button on each song row to start playback
- Queue built from current visible song list when play is triggered
- Play/pause, next, previous track controls
- Previous restarts current song if more than 3 seconds in, otherwise goes to previous track
- Clickable progress bar with keyboard seeking (arrow keys, 5-second steps)
- Volume slider and mute toggle (hidden on mobile)
- Current time / duration display (hidden on mobile)
- Now-playing indicator highlights the active song row
- Player persists across Turbo navigations via `data-turbo-permanent`
- Space key toggles play/pause globally (except in form inputs)
- Album art thumbnail displayed in player bar
- Song changes announced to screen readers via ARIA live region
- Player bar has `role="region"` with `aria-label="Audio player"`
- All player controls have appropriate `aria-label` attributes
- Volume preference saved to localStorage
- Shuffle mode: toggle randomizes playback order via Fisher-Yates shuffle; current song stays; reshuffles on repeat-all wrap
- Repeat modes cycle: off → repeat-all → repeat-one; repeat-one loops the current song; repeat-all wraps queue (sequential or shuffled)
- Shuffle button uses `aria-pressed` (true/false); repeat button `aria-label` reflects current mode
- Shuffle and repeat preferences persist to localStorage across navigations and full reloads
- Mode changes announced to screen readers via ARIA live region
- Active shuffle/repeat buttons highlighted in blue; inactive in gray

### Queue Management
- "Play Next" inserts song(s) after the currently playing track; starts playback if queue is empty
- "Add to Queue" appends song(s) to the end of the queue; starts playback if queue is empty
- Queue drawer panel slides in from the right side, showing all queued songs
- Currently playing song highlighted in the queue with "Playing" indicator
- Drag-and-drop reorder of queued songs via SortableJS
- Remove individual songs from queue (except the currently playing song)
- "Clear" button empties the queue and hides the player
- Queue toggle button in player bar with badge showing queue count
- Queue drawer uses `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`
- Escape key closes the queue drawer
- Toast notifications confirm queue actions
- Queue drawer persists across Turbo navigations via `data-turbo-permanent`

#### Context Menu Queue Actions
- "Play Next" and "Add to Queue" options in the right-click context menu for every song

#### Bulk Queue Actions
- "Play Next" and "Add to Queue" buttons in the multi-select bulk actions panel on the songs page

#### Playlist Queue Actions
- "Add to Queue" button on playlist show page appends all playlist songs to the queue

### Song Removal
- Delete song from library and file permanently from disk

### Context Menu
- Right-click on any song for quick actions
- Edit
- Play Next
- Add to Queue
- Add to Playlist...
- Delete

## Playlists

### Playlist Management
- Create, edit, and delete playlists with name (required) and optional description
- Playlist index displays a responsive card grid (1/2/3/4 columns by breakpoint)
- Each card shows name, song count, description snippet, and play button
- Empty state with prompt to create first playlist

### Adding Songs to Playlists
- Context menu "Add to Playlist..." option on every song row
- Submenu lists existing playlists and "+ New Playlist..." option
- Bulk "Add to Playlist..." dropdown in multi-select bulk actions panel
- Duplicate songs are silently skipped
- Toast notification confirms additions with count

### Playlist Playback
- Songs on playlist show page use standard `data-song-*` attributes
- Play button on each song triggers the audio player queue from visible playlist songs
- Play button on playlist index cards links to playlist

### Drag-and-Drop Reorder
- SortableJS-powered drag-and-drop on playlist show page
- Drag handles on each song row (desktop table and mobile cards)
- Reorder persisted via PATCH to server
- ARIA live region announces reorder completion

### Playlist Show Page
- Desktop: table with drag handle, title (with play button), artist, album, remove button
- Mobile: card layout with drag handle, song info, play and remove buttons
- Remove button deletes song from playlist (not from library)

### Accessibility
- Drag handles have `aria-label="Drag to reorder"`
- Play buttons have `aria-label="Play [name]"`
- Remove buttons have `aria-label="Remove [song title] from playlist"`
- Context menu submenu uses `role="menu"` and `role="menuitem"`
- Bulk picker dropdown uses `role="listbox"` and `role="option"`
- Form errors displayed with `role="alert"`
- Reorder changes announced via ARIA live region

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

## Responsive & Mobile Layout

The application is fully responsive using Tailwind CSS breakpoints:

### Songs List (Index)
- **Desktop (md+):** Standard table with all columns visible (title, artist, album, genre, year, track, disc, actions)
- **Mobile (<md):** Each song displays as a card with title, artist, album (with inline year). Genre, year, track, and disc columns are hidden. Checkbox is positioned top-left, edit icon top-right. Select-all appears as a separate row above the cards.
- Table header is hidden on mobile; table body uses CSS `block`/`table-row-group` switching

### Song Form (Edit/New)
- Year/Track/Disc fields stack vertically on mobile (`grid-cols-1`), 3-column on `sm:` screens
- File path uses `break-all` instead of `truncate` for narrow screens

### Song Show
- Definition list is single-column on mobile, two-column on `sm:` screens

### Organize Preview
- Desktop shows a table; mobile shows stacked cards with "From:" and "To:" labels and `break-all` paths

### Pagination
- Individual page numbers and gap indicators are hidden on mobile (`hidden sm:list-item`), leaving only prev/next navigation

### Context Menu
- Long-press (500ms) on touch devices triggers the context menu
- Menu position is clamped to viewport bounds to prevent off-screen rendering

### Layout
- Reduced vertical padding on mobile (`py-4 sm:py-6`)
- Toast notifications span full width on mobile, right-aligned on larger screens

## Accessibility

The application must maintain WCAG compliance and screen reader compatibility:

### Screen Reader Support
- All icon-only buttons must have `aria-label` attributes
- SVG icons must have `aria-hidden="true"` to prevent duplicate announcements
- Modals must have `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the modal title
- Dynamic content changes must be announced via ARIA live regions
- Images must have descriptive alt text (e.g., album covers should include song title and artist)
- Selection count changes announced to screen readers via `#aria-live-region`
- Sync status bar has `aria-live="polite"` for progress announcements

### Keyboard Navigation
- Skip link ("Skip to main content") for bypassing navigation; main content has `tabindex="-1"` for programmatic focus
- All interactive elements must be keyboard accessible
- Focus must be visible on all interactive elements
- Current page indicated with `aria-current="page"` in navigation and pagination
- Context menu opens with Shift+F10 or context menu key; Escape closes it; arrow keys navigate menu items
- Inline-editable cells are keyboard focusable (`tabindex="0"`, `role="button"`) and activate with Enter or Space

### Form Accessibility
- All form inputs must have associated labels
- Checkboxes must have `aria-label` describing what they select (e.g., "Select all songs on this page")
- Sortable table headers must indicate sort state with `aria-sort` (`ascending`, `descending`, or `none`)
- Form validation errors linked to fields via `aria-invalid="true"` and `aria-describedby` pointing to error messages
- Error summary container has `role="alert"` for immediate screen reader announcement
- File input for album art has `aria-label="Upload album art image"`
- Bulk update fields have `aria-describedby` linking to description "Applies to all selected songs"
- Organize template input linked to token descriptions via `aria-describedby`

### Context Menu Accessibility
- Context menu has `role="menu"` and `aria-label="Song actions"`
- Menu items have `role="menuitem"` with aria-labels including song title (e.g., "Edit Song Title", "Delete Song Title")
- First menu item receives focus when menu opens
- Arrow keys navigate between menu items
- Escape key closes menu and returns focus to the triggering row

### Color Contrast
- Filter label text uses `text-gray-400` (not `text-gray-500`) for sufficient contrast against dark backgrounds
- Mobile year display in song rows uses `text-gray-500` (not `text-gray-600`) for better contrast

### Landmarks and Structure
- Main navigation must have `aria-label="Main navigation"`
- Main content area must have `id="main-content"` for skip link target
- Panels must be marked as dialogs when open

## Browse Views

### Albums
- Album index page with card grid (1/2/3/4 columns by breakpoint) showing all unique albums
- Each card displays album art (lazy-loaded with placeholder fallback), album name, artist(s), and song count
- Search bar with Search button and Clear link to filter albums by name
- Pagination at 24 albums per page
- Songs with no album grouped under "Unknown Album" (sentinel `_unknown` in URL)
- Album show page with hero album art, album name, artist(s), song count
- "Play All" button replaces the queue and starts playback from the first song
- "Add to Queue" button appends all album songs to the existing queue
- Song list ordered by disc number, track number, title
- Desktop table and mobile card layouts with context menu support on each song
- Now-playing highlight on the currently active song row

### Artists
- Artist index page with card grid showing all unique artists
- Each card displays representative album art, artist name, album count, and song count
- Search bar with Search button and Clear link to filter artists by name
- Pagination at 24 artists per page
- Songs with no artist grouped under "Unknown Artist" (sentinel `_unknown` in URL)
- Artist show page with representative art, artist name, album/song counts
- "Play All" button replaces the queue and starts playback from the first song
- "Add to Queue" button appends all artist songs to the existing queue
- Songs grouped by album with section headers showing album art thumbnail and album name (linked to album show page)
- Desktop table and mobile card layouts with context menu support on each song
- Now-playing highlight on the currently active song row

### Folders
- Filesystem-driven folder browser that reads actual directory structure on disk
- Root view (`/folders`) shows top-level contents of the music root directory
- Subdirectory view (`/folders/:path`) shows contents of any nested directory
- Breadcrumb navigation with chevron separators; root crumb labeled "Music"; current folder has `aria-current="page"`
- Header shows folder name with folder and file counts
- Subdirectories displayed as a compact list with folder icon, name, immediate child counts (subfolders, MP3 files), and chevron
- Files section shows MP3 files in desktop table (filename, title, artist, album, actions) and mobile cards
- Synced files (with Song records) display full metadata, play button, edit link, and context menu support
- Unsynced files (no Song record) shown with reduced opacity and "Not synced" text
- "Play All" and "Add to Queue" buttons shown when synced songs exist in the folder
- Path traversal protection: `..` segments stripped, resolved path verified to stay within music root
- Hidden directories (starting with `.`) excluded from listings
- Empty folders show "This folder is empty." message
- Entries sorted alphabetically (case-insensitive), directories listed before files
- Responsive layout with desktop table and mobile card views

### Navigation
- Albums, Artists, and Folders links in main navigation bar (between Tuner logo and Playlists)
- `aria-current="page"` attribute on active navigation links
