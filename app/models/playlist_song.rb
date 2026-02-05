class PlaylistSong < ApplicationRecord
  belongs_to :playlist
  belongs_to :song

  validates :position, presence: true
  validates :song_id, uniqueness: { scope: :playlist_id }
end
