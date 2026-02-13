require "test_helper"

class PlaylistAdditionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @playlist = Playlist.create!(name: "Test Playlist")
    @song = Song.create!(file_path: "/tmp/pa_test.mp3", title: "Test Song")
  end

  test "add song to existing playlist" do
    assert_difference("PlaylistSong.count") do
      post playlist_additions_url, params: { playlist_id: @playlist.id, song_ids: [ @song.id ] }
    end
    assert_redirected_to playlists_path
  end

  test "create new playlist and add song" do
    assert_difference("Playlist.count") do
      assert_difference("PlaylistSong.count") do
        post playlist_additions_url, params: { new_playlist_name: "Brand New", song_ids: [ @song.id ] }
      end
    end
    assert_equal "Brand New", Playlist.last.name
  end

  test "skips duplicate songs with appropriate message" do
    @playlist.add_song(@song)

    assert_no_difference("PlaylistSong.count") do
      post playlist_additions_url, params: { playlist_id: @playlist.id, song_ids: [ @song.id ] }
    end
    assert_equal "Song already in Test Playlist.", flash[:notice]
  end

  test "json response includes added count" do
    post playlist_additions_url(format: :json), params: { playlist_id: @playlist.id, song_ids: [ @song.id ] }
    assert_response :success
    data = JSON.parse(response.body)
    assert_equal 1, data["added"]
    assert_equal 0, data["skipped"]
    assert_equal @playlist.name, data["playlist_name"]
  end

  test "json response for duplicate shows skipped count" do
    @playlist.add_song(@song)

    post playlist_additions_url(format: :json), params: { playlist_id: @playlist.id, song_ids: [ @song.id ] }
    data = JSON.parse(response.body)
    assert_equal 0, data["added"]
    assert_equal 1, data["skipped"]
    assert_includes data["message"], "already in"
  end

  test "adding multiple songs at once" do
    song2 = Song.create!(file_path: "/tmp/pa_test2.mp3", title: "Song 2")

    assert_difference("PlaylistSong.count", 2) do
      post playlist_additions_url, params: { playlist_id: @playlist.id, song_ids: [ @song.id, song2.id ] }
    end
    assert_includes flash[:notice], "2 songs added"
  end

  test "mixed added and skipped songs" do
    @playlist.add_song(@song)
    song2 = Song.create!(file_path: "/tmp/pa_test3.mp3", title: "Song 2")

    assert_difference("PlaylistSong.count", 1) do
      post playlist_additions_url, params: { playlist_id: @playlist.id, song_ids: [ @song.id, song2.id ] }
    end
    assert_includes flash[:notice], "1 song added"
    assert_includes flash[:notice], "1 already in playlist"
  end

  test "non-existent song_id is silently skipped" do
    assert_difference("PlaylistSong.count", 1) do
      post playlist_additions_url, params: { playlist_id: @playlist.id, song_ids: [ @song.id, -999 ] }
    end
    assert_includes flash[:notice], "1 song added"
  end

  test "non-existent playlist_id returns not found" do
    post playlist_additions_url, params: { playlist_id: -999, song_ids: [ @song.id ] }
    assert_response :not_found
  end
end
