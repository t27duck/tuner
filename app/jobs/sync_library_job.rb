class SyncLibraryJob < ApplicationJob
  queue_as :default

  def perform
    broadcast("running", "Starting sync...")

    music_root = Configuration.music_root
    unless Dir.exist?(music_root)
      broadcast("failed", "Music directory not found: #{music_root}")
      return
    end

    mp3_files = Dir.glob(File.join(music_root, "**", "*.mp3"))
    total = mp3_files.size
    existing_paths = Song.pluck(:file_path)

    # Remove songs whose files no longer exist
    deleted_paths = existing_paths - mp3_files
    Song.where(file_path: deleted_paths).delete_all if deleted_paths.any?

    mp3_files.each_with_index do |file_path, index|
      broadcast("running", "Processing #{File.basename(file_path)} (#{index + 1}/#{total})")
      import_file(file_path)
    end

    broadcast("completed", "Sync complete. #{total} files processed.")
  rescue => e
    broadcast("failed", "Sync failed: #{e.message}")
    raise
  end

  private

  def import_file(file_path)
    return if Song.exists?(file_path: file_path)

    tags = extract_tags(file_path)
    Song.create!(
      file_path: file_path,
      file_size: File.size(file_path),
      title: tags[:title].presence || File.basename(file_path, ".mp3"),
      artist: tags[:artist],
      album: tags[:album],
      genre: tags[:genre],
      year: tags[:year],
      track_number: tags[:track_number],
      disc_number: tags[:disc_number],
      duration: tags[:duration]
    )
  end

  def extract_tags(file_path)
    tags = {}
    Mp3Info.open(file_path) do |mp3|
      tag = mp3.tag
      tag2 = mp3.tag2

      tags[:title] = tag.title
      tags[:artist] = tag.artist
      tags[:album] = tag.album
      tags[:genre] = tag.genre_s
      tags[:year] = parse_year(tag2["TDRC"] || tag2["TYER"] || tag.year)
      tags[:track_number] = parse_track(tag2["TRCK"] || tag.tracknum)
      tags[:disc_number] = parse_track(tag2["TPOS"])
      tags[:duration] = mp3.length.to_i
    end
    tags
  rescue => e
    Rails.logger.warn("Failed to read tags from #{file_path}: #{e.message}")
    tags
  end

  def parse_year(value)
    return nil if value.blank?
    value.to_s[/\d{4}/]&.to_i
  end

  def parse_track(value)
    return nil if value.blank?
    value.to_s.split("/").first&.to_i
  end

  def broadcast(status, message)
    ActionCable.server.broadcast("sync_status", { status: status, message: message })
  end
end
