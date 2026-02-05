require "test_helper"

class PlaylistsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @playlist = Playlist.create!(name: "Test Playlist", description: "A test")
    @song = Song.create!(file_path: "/tmp/pc_test.mp3", title: "Test Song", artist: "Artist")
  end

  test "index" do
    get playlists_url
    assert_response :success
  end

  test "index json returns playlist list" do
    get playlists_url(format: :json)
    assert_response :success
    data = JSON.parse(response.body)
    assert_kind_of Array, data
    assert_equal @playlist.name, data.first["name"]
  end

  test "show" do
    get playlist_url(@playlist)
    assert_response :success
  end

  test "new" do
    get new_playlist_url
    assert_response :success
  end

  test "create with valid params" do
    assert_difference("Playlist.count") do
      post playlists_url, params: { playlist: { name: "New Playlist" } }
    end
    assert_redirected_to playlist_path(Playlist.last)
  end

  test "create with invalid params" do
    assert_no_difference("Playlist.count") do
      post playlists_url, params: { playlist: { name: "" } }
    end
    assert_response :unprocessable_entity
  end

  test "edit" do
    get edit_playlist_url(@playlist)
    assert_response :success
  end

  test "update" do
    patch playlist_url(@playlist), params: { playlist: { name: "Updated" } }
    assert_redirected_to playlist_path(@playlist)
    assert_equal "Updated", @playlist.reload.name
  end

  test "destroy" do
    assert_difference("Playlist.count", -1) do
      delete playlist_url(@playlist)
    end
    assert_redirected_to playlists_path
  end

  test "reorder updates positions" do
    ps1 = @playlist.add_song(@song)
    song2 = Song.create!(file_path: "/tmp/pc_test2.mp3", title: "Song 2")
    ps2 = @playlist.add_song(song2)

    patch reorder_playlist_url(@playlist), params: { ordered_ids: [ps2.id, ps1.id] }, as: :json
    assert_response :success

    assert_equal 2, ps1.reload.position
    assert_equal 1, ps2.reload.position
  end

  test "remove_song removes song from playlist" do
    ps = @playlist.add_song(@song)

    assert_difference("PlaylistSong.count", -1) do
      delete remove_song_playlist_url(@playlist, playlist_song_id: ps.id)
    end
    assert_redirected_to playlist_path(@playlist)
  end
end
