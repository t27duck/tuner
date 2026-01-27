class Song < ApplicationRecord
  validates :file_path, presence: true, uniqueness: true

  def album_art
    return nil unless file_path && File.exist?(file_path)

    Mp3Info.open(file_path) do |mp3|
      pics = mp3.tag2.pictures
      if pics.any?
        desc, data = pics.first
        mime = data&.start_with?("\x89PNG") ? "image/png" : "image/jpeg"
        return { data: data, mime_type: mime }
      end
    end
    nil
  rescue
    nil
  end

  def self.ransackable_attributes(auth_object = nil)
    %w[title artist album genre year track_number disc_number file_path]
  end

  def self.ransackable_associations(auth_object = nil)
    []
  end
end
