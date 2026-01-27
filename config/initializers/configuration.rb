# frozen_string_literal: true

class Configuration
  def self.music_root
    @music_root ||= ENV.fetch("MUSIC_ROOT") { Rails.root.join("storage", "music").to_s }
  end
end
