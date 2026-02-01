class SyncLibraryJob < ApplicationJob
  include Mp3MetadataExtractor

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

    failed = 0
    mp3_files.each_with_index do |file_path, index|
      broadcast("running", "Processing #{File.basename(file_path)}", index + 1, total)
      begin
        import_file(file_path)
      rescue => e
        failed += 1
        Rails.logger.error("Failed to import #{file_path}: #{e.message}")
      end
    end

    summary = "Sync complete. #{total} files processed."
    summary += " #{failed} failed." if failed > 0
    broadcast("completed", summary, total, total)
  rescue => e
    broadcast("failed", "Sync failed: #{e.message}")
    raise
  end

  private

  def import_file(file_path)
    tags = extract_tags(file_path)
    attrs = {
      file_size: File.size(file_path),
      title: tags[:title].presence || File.basename(file_path, ".mp3"),
      artist: tags[:artist],
      album: tags[:album],
      genre: tags[:genre],
      year: tags[:year],
      track_number: tags[:track_number],
      disc_number: tags[:disc_number],
      duration: tags[:duration]
    }

    song = Song.find_by(file_path: file_path)
    if song
      song.update!(attrs)
    else
      Song.create!(attrs.merge(file_path: file_path))
    end
  end

  def broadcast(status, message, current = nil, total = nil)
    ActionCable.server.broadcast("sync_status", { status: status, message: message, current: current, total: total })
  end
end
