# frozen_string_literal: true

require "test_helper"

class PlaylistSongTest < ActiveSupport::TestCase
  setup do
    @temp_dir = Dir.mktmpdir("playlist_song_#{Process.pid}_#{Thread.current.object_id}")
    mp3_path = File.join(@temp_dir, "test.mp3")
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), mp3_path)
    @song = Song.create!(file_path: mp3_path, title: "Test Song")
    @playlist = Playlist.create!(name: "Test Playlist")
  end

  teardown do
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  test "valid with playlist, song, and position" do
    ps = PlaylistSong.new(playlist: @playlist, song: @song, position: 1)
    assert ps.valid?
  end

  test "invalid without position" do
    ps = PlaylistSong.new(playlist: @playlist, song: @song, position: nil)
    assert_not ps.valid?
    assert_includes ps.errors[:position], "can't be blank"
  end

  test "rejects duplicate song within same playlist" do
    PlaylistSong.create!(playlist: @playlist, song: @song, position: 1)
    duplicate = PlaylistSong.new(playlist: @playlist, song: @song, position: 2)
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:song_id], "has already been taken"
  end

  test "allows same song in different playlists" do
    other_playlist = Playlist.create!(name: "Other Playlist")
    PlaylistSong.create!(playlist: @playlist, song: @song, position: 1)
    ps = PlaylistSong.new(playlist: other_playlist, song: @song, position: 1)
    assert ps.valid?
  end
end
