require "test_helper"

class PlaylistTest < ActiveSupport::TestCase
  test "valid playlist with name" do
    playlist = Playlist.new(name: "My Playlist")
    assert playlist.valid?
  end

  test "invalid without name" do
    playlist = Playlist.new
    assert_not playlist.valid?
    assert_includes playlist.errors[:name], "can't be blank"
  end

  test "add_song assigns incrementing positions" do
    playlist = Playlist.create!(name: "Test")
    song1 = Song.create!(file_path: "/tmp/ps1.mp3", title: "Song 1")
    song2 = Song.create!(file_path: "/tmp/ps2.mp3", title: "Song 2")

    ps1 = playlist.add_song(song1)
    ps2 = playlist.add_song(song2)

    assert_equal 1, ps1.position
    assert_equal 2, ps2.position
  end

  test "add_song prevents duplicate songs in same playlist" do
    playlist = Playlist.create!(name: "Test")
    song = Song.create!(file_path: "/tmp/dup.mp3", title: "Dup")

    playlist.add_song(song)
    duplicate = playlist.add_song(song)

    assert_not duplicate.persisted?
    assert_equal 1, playlist.playlist_songs.count
  end

  test "destroying playlist preserves songs" do
    playlist = Playlist.create!(name: "Test")
    song = Song.create!(file_path: "/tmp/keep.mp3", title: "Keep")
    playlist.add_song(song)

    playlist.destroy

    assert Song.exists?(song.id)
    assert_equal 0, PlaylistSong.count
  end

  test "destroying song removes playlist_songs" do
    playlist = Playlist.create!(name: "Test")
    song = Song.create!(file_path: "/tmp/remove.mp3", title: "Remove")
    playlist.add_song(song)

    song.destroy

    assert_equal 0, playlist.playlist_songs.count
  end

  test "playlist_songs ordered by position" do
    playlist = Playlist.create!(name: "Ordered")
    song1 = Song.create!(file_path: "/tmp/o1.mp3", title: "First")
    song2 = Song.create!(file_path: "/tmp/o2.mp3", title: "Second")
    song3 = Song.create!(file_path: "/tmp/o3.mp3", title: "Third")

    playlist.add_song(song1)
    playlist.add_song(song2)
    playlist.add_song(song3)

    assert_equal ["First", "Second", "Third"], playlist.playlist_songs.map { |ps| ps.song.title }
  end
end
