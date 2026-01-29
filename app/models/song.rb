class Song < ApplicationRecord
  validates :file_path, presence: true, uniqueness: true

  def album_art
    return nil unless file_path && File.exist?(file_path)

    Mp3Info.open(file_path) do |mp3|
      pics = mp3.tag2.pictures
      if pics.any?
        _desc, data = pics.first
        mime = data&.start_with?("\x89PNG".b) ? "image/png" : "image/jpeg"
        return { data: data, mime_type: mime }
      end
    end
    nil
  rescue
    nil
  end

  scope :missing_artist, -> { where(artist: [ nil, "" ]) }
  scope :missing_album, -> { where(album: [ nil, "" ]) }
  scope :missing_genre, -> { where(genre: [ nil, "" ]) }
  scope :missing_year, -> { where(year: nil) }

  def self.ransackable_attributes(auth_object = nil)
    %w[title artist album genre year track_number disc_number file_path]
  end

  def self.ransackable_scopes(auth_object = nil)
    %i[missing_artist missing_album missing_genre missing_year]
  end

  def self.ransackable_associations(auth_object = nil)
    []
  end
end
