require "test_helper"

class SongsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @song = Song.create!(file_path: "/tmp/test.mp3", title: "Test Song", artist: "Artist", album: "Album")
  end

  test "index" do
    get songs_url
    assert_response :success
    assert_select "table"
  end

  test "show" do
    get song_url(@song)
    assert_response :success
  end

  test "edit" do
    get edit_song_url(@song)
    assert_response :success
  end

  test "update" do
    patch song_url(@song), params: { song: { title: "New Title" } }
    assert_redirected_to songs_path
    assert_equal "New Title", @song.reload.title
  end

  test "destroy" do
    assert_difference("Song.count", -1) do
      delete song_url(@song)
    end
    assert_redirected_to songs_path
  end

  test "root routes to songs index" do
    get root_url
    assert_response :success
  end
end
