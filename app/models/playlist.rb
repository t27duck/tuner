class Playlist < ApplicationRecord
  has_many :playlist_songs, -> { order(:position) }, dependent: :destroy
  has_many :songs, through: :playlist_songs

  validates :name, presence: true

  def add_song(song)
    next_position = (playlist_songs.maximum(:position) || 0) + 1
    playlist_songs.create(song: song, position: next_position)
  end
end
