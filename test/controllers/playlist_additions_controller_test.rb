require "test_helper"

class PlaylistAdditionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @playlist = Playlist.create!(name: "Test Playlist")
    @song = Song.create!(file_path: "/tmp/pa_test.mp3", title: "Test Song")
  end

  test "add song to existing playlist" do
    assert_difference("PlaylistSong.count") do
      post playlist_additions_url, params: { playlist_id: @playlist.id, song_ids: [@song.id] }
    end
    assert_redirected_to playlists_path
  end

  test "create new playlist and add song" do
    assert_difference("Playlist.count") do
      assert_difference("PlaylistSong.count") do
        post playlist_additions_url, params: { new_playlist_name: "Brand New", song_ids: [@song.id] }
      end
    end
    assert_equal "Brand New", Playlist.last.name
  end

  test "skips duplicate songs with appropriate message" do
    @playlist.add_song(@song)

    assert_no_difference("PlaylistSong.count") do
      post playlist_additions_url, params: { playlist_id: @playlist.id, song_ids: [@song.id] }
    end
    assert_equal "Song already in Test Playlist.", flash[:notice]
  end

  test "json response includes added count" do
    post playlist_additions_url(format: :json), params: { playlist_id: @playlist.id, song_ids: [@song.id] }
    assert_response :success
    data = JSON.parse(response.body)
    assert_equal 1, data["added"]
    assert_equal 0, data["skipped"]
    assert_equal @playlist.name, data["playlist_name"]
  end

  test "json response for duplicate shows skipped count" do
    @playlist.add_song(@song)

    post playlist_additions_url(format: :json), params: { playlist_id: @playlist.id, song_ids: [@song.id] }
    data = JSON.parse(response.body)
    assert_equal 0, data["added"]
    assert_equal 1, data["skipped"]
    assert_includes data["message"], "already in"
  end
end
