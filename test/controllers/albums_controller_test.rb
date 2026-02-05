require "test_helper"

class AlbumsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @song1 = Song.create!(file_path: "/tmp/album_test_1.mp3", title: "Song One", artist: "Artist A", album: "Great Album", track_number: 1)
    @song2 = Song.create!(file_path: "/tmp/album_test_2.mp3", title: "Song Two", artist: "Artist A", album: "Great Album", track_number: 2)
    @song3 = Song.create!(file_path: "/tmp/album_test_3.mp3", title: "Song Three", artist: "Artist B", album: "Other Album")
    @song_no_album = Song.create!(file_path: "/tmp/album_test_4.mp3", title: "No Album Song", artist: "Artist C", album: nil)
  end

  test "index renders successfully" do
    get albums_url
    assert_response :success
    assert_select "h1", "Albums"
  end

  test "index shows album cards" do
    get albums_url
    assert_response :success
    assert_match "Great Album", response.body
    assert_match "Other Album", response.body
  end

  test "index search filters albums" do
    get albums_url, params: { q: "Great" }
    assert_response :success
    assert_match "Great Album", response.body
    refute_match "Other Album", response.body
  end

  test "index includes unknown album for songs without album" do
    get albums_url
    assert_response :success
    assert_match "Unknown Album", response.body
  end

  test "show displays album songs" do
    get album_url("Great Album")
    assert_response :success
    assert_select "h1", "Great Album"
    assert_match "Song One", response.body
    assert_match "Song Two", response.body
    refute_match "Song Three", response.body
  end

  test "show displays songs ordered by track number" do
    get album_url("Great Album")
    assert_response :success
    body = response.body
    assert body.index("Song One") < body.index("Song Two")
  end

  test "show unknown album displays songs without album" do
    get album_url("_unknown")
    assert_response :success
    assert_select "h1", "Unknown Album"
    assert_match "No Album Song", response.body
  end

  test "show handles album name with slash" do
    Song.create!(file_path: "/tmp/album_test_slash.mp3", title: "Slash Song", artist: "Band", album: "Rock/Pop Hits")
    get album_url("Rock/Pop Hits")
    assert_response :success
    assert_select "h1", "Rock/Pop Hits"
  end

  test "show displays Play All button" do
    get album_url("Great Album")
    assert_response :success
    assert_select "button[data-action='click->audio-player#playAll']"
  end

  test "show displays Add to Queue button" do
    get album_url("Great Album")
    assert_response :success
    assert_select "button[data-action='click->audio-player#addPlaylistToQueue']"
  end
end
