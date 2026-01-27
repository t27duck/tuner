# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tuner is a local MP3 library management and player web application built with Rails 8.1 and Ruby 4.0. It scans directories for MP3 files, caches metadata in SQLite, and allows editing ID3 tags and album art.

## Development Commands

```bash
bin/setup              # Install deps, prepare DB, start dev server
bin/setup --reset      # Full reset with DB drop/recreate
bin/dev                # Start development server (port 3000)
bin/rails console      # Rails console
```

## Testing

```bash
bin/rails test                              # Run unit/integration tests
bin/rails test test/models/song_test.rb     # Run single test file
bin/rails test test/models/song_test.rb:15  # Run specific test at line
bin/rails test:system                       # Run system tests (Capybara/Selenium)
```

### Test Patterns for File Operations

Tests that manipulate files (sync, organize, bulk operations) use temp directory isolation for parallel safety:
Test environment uses `test/music/` as the music root.
Cover image file and mp3 file fixtures at `test/fixtures/files/`.

```ruby
setup do
  @temp_dir = Dir.mktmpdir("test_name_#{Process.pid}_#{Thread.current.object_id}")
  @original_music_root = Configuration.music_root
  Configuration.instance_variable_set(:@music_root, @temp_dir)
end

teardown do
  Configuration.instance_variable_set(:@music_root, @original_music_root)
  FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
end
```

Helper to create test songs with actual MP3 files:

```ruby
def create_test_song(fixture_name, dest_subpath, attrs = {})
  source = Rails.root.join("test/fixtures/files/#{fixture_name}")
  dest = File.join(@temp_dir, dest_subpath)
  FileUtils.mkdir_p(File.dirname(dest))
  FileUtils.cp(source, dest)

  Song.create!(
    title: attrs[:title] || "Test Song",
    artist: attrs[:artist] || "Test Artist",
    file_path: dest,
    file_size: File.size(dest),
    duration: 180,
    **attrs.slice(:album, :genre, :year, :track_number)
  )
end
```

Key points:
- Each test gets a unique temp directory (includes PID + thread ID for parallel safety)
- Stub `Configuration.music_root` to isolate tests from real music directory
- Copy fixture MP3s into temp directory for file operation tests
- Always clean up temp directories in teardown
- Use `songs_in_temp_dir` helper to scope queries when testing jobs that affect all songs

## Linting & CI

```bash
bin/rubocop            # Ruby style (Rails Omakase)
bin/ci                 # Full CI pipeline: setup, lint, security, tests
```

CI pipeline runs: rubocop → bundler-audit → importmap audit → brakeman → rails test → db:seed:replant

## Tech Stack

- **Frontend**: Hotwire (Turbo + Stimulus), Importmap for JS, TailwindCSS for styles
- **Background Jobs**: SolidQueue with ActiveJob
- **Database**: SQLite (storage/ directory)
- **MP3 Tags**: ruby-mp3info (custom fork at github.com/t27duck/ruby-mp3info)
- **Filtering/Pagination**: Ransack, Kaminari

## Key Configuration

- `Configuration.music_root` class method defined in `config/initializers/configuration.rb` - defaults to `storage/music/`, overridable via `MUSIC_ROOT` ENV variable
- Database files stored in `storage/` directory
- Dark mode UI required per REQUIREMENTS.md

## Architecture Guidelines

- Prefer RESTful routes and nested controllers over custom actions
- Use Hotwire/ActionCable for live updates (e.g., sync status)
- Prefer controller and model tests over system tests
- Any system tests should be limited critical code/user paths
- When importing files without title, default to filename without extension
- When features are added or modified, update REQUIREMENTS.md with the new information.
- Ask to commit often - specifically after each feature is implemented.

## Accessibility Guidelines

Maintain WCAG compliance when adding or modifying UI components:

- **Icon buttons**: Always include `aria-label` attribute; add `aria-hidden="true"` to SVG icons
- **Modals/dialogs**: Use `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` pointing to the title element
- **Dynamic updates**: Announce important state changes (song changes, toggle states) via the `#aria-live-region` element
- **Form controls**: Ensure all inputs have labels; use `aria-label` for unlabeled controls like checkboxes
- **Images**: Provide descriptive alt text (e.g., album covers should mention song/artist)
- **Keyboard support**: Ensure all interactive elements are keyboard accessible; sliders should respond to arrow keys

See REQUIREMENTS.md for full accessibility requirements.
