class OrganizeFilesJob < ApplicationJob
  queue_as :default

  SANITIZE_REGEX = /[<>:"\/\\|?*\x00-\x1f]/

  def perform(template, song_ids: nil)
    songs = song_ids ? Song.where(id: song_ids) : Song.all
    music_root = Configuration.music_root

    songs.find_each do |song|
      new_relative = build_path(template, song)
      new_path = File.join(music_root, new_relative)

      next if new_path == song.file_path

      FileUtils.mkdir_p(File.dirname(new_path))
      FileUtils.mv(song.file_path, new_path)
      old_dir = File.dirname(song.file_path)
      song.update!(file_path: new_path)

      cleanup_empty_dirs(old_dir, music_root)
    end
  end

  def self.preview(template, song_ids: nil)
    songs = song_ids ? Song.where(id: song_ids) : Song.all
    music_root = Configuration.music_root

    songs.map do |song|
      new_relative = new.build_path(template, song)
      new_path = File.join(music_root, new_relative)
      { id: song.id, old_path: song.file_path, new_path: new_path } unless new_path == song.file_path
    end.compact
  end

  def build_path(template, song)
    result = template.dup
    result.gsub!("<Artist>", sanitize(song.artist || "Unknown Artist"))
    result.gsub!("<Album>", sanitize(song.album || "Unknown Album"))
    result.gsub!("<Title>", sanitize(song.title || "Unknown Title"))
    result.gsub!("<Genre>", sanitize(song.genre || "Unknown Genre"))
    result.gsub!("<Year>", sanitize((song.year || "0000").to_s))
    result.gsub!("<Disc>", (song.disc_number || 1).to_s)
    result.gsub!(/<Track:(\d+)>/) { (song.track_number || 0).to_s.rjust($1.to_i, "0") }
    result.gsub!("<Track>", (song.track_number || 0).to_s)
    result.gsub!("<Filename>", File.basename(song.file_path, ".mp3"))
    result + ".mp3"
  end

  private

  def sanitize(value)
    value.gsub(SANITIZE_REGEX, "_").strip
  end

  def cleanup_empty_dirs(dir, root)
    while dir != root && dir.start_with?(root)
      break unless Dir.empty?(dir)
      Dir.rmdir(dir)
      dir = File.dirname(dir)
    end
  end
end
