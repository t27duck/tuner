require "test_helper"

class ArtistsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @song1 = Song.create!(file_path: "/tmp/artist_test_1.mp3", title: "Song One", artist: "Cool Artist", album: "Album A", track_number: 1)
    @song2 = Song.create!(file_path: "/tmp/artist_test_2.mp3", title: "Song Two", artist: "Cool Artist", album: "Album B", track_number: 1)
    @song3 = Song.create!(file_path: "/tmp/artist_test_3.mp3", title: "Song Three", artist: "Other Artist", album: "Album C")
    @song_no_artist = Song.create!(file_path: "/tmp/artist_test_4.mp3", title: "No Artist Song", artist: nil, album: "Some Album")
  end

  test "index renders successfully" do
    get artists_url
    assert_response :success
    assert_select "h1", "Artists"
  end

  test "index shows artist cards" do
    get artists_url
    assert_response :success
    assert_match "Cool Artist", response.body
    assert_match "Other Artist", response.body
  end

  test "index search filters artists" do
    get artists_url, params: { q: "Cool" }
    assert_response :success
    assert_match "Cool Artist", response.body
    refute_match "Other Artist", response.body
  end

  test "index includes unknown artist for songs without artist" do
    get artists_url
    assert_response :success
    assert_match "Unknown Artist", response.body
  end

  test "show displays artist songs grouped by album" do
    get artist_url("Cool Artist")
    assert_response :success
    assert_select "h1", "Cool Artist"
    assert_match "Album A", response.body
    assert_match "Album B", response.body
    assert_match "Song One", response.body
    assert_match "Song Two", response.body
    refute_match "Song Three", response.body
  end

  test "show unknown artist displays songs without artist" do
    get artist_url("_unknown")
    assert_response :success
    assert_select "h1", "Unknown Artist"
    assert_match "No Artist Song", response.body
  end

  test "show displays Play All button" do
    get artist_url("Cool Artist")
    assert_response :success
    assert_select "button[data-action='click->audio-player#playAll']"
  end

  test "show displays Add to Queue button" do
    get artist_url("Cool Artist")
    assert_response :success
    assert_select "button[data-action='click->audio-player#addPlaylistToQueue']"
  end

  test "show handles artist name with slash" do
    Song.create!(file_path: "/tmp/artist_test_slash.mp3", title: "Highway", artist: "AC/DC", album: "Back in Black")
    get artist_url("AC/DC")
    assert_response :success
    assert_select "h1", "AC/DC"
    assert_match "Highway", response.body
  end

  test "index renders with artist name containing slash" do
    Song.create!(file_path: "/tmp/artist_test_slash2.mp3", title: "TNT", artist: "AC/DC")
    get artists_url
    assert_response :success
    assert_match "AC/DC", response.body
  end

  test "show displays album count and song count" do
    get artist_url("Cool Artist")
    assert_response :success
    assert_match "2 albums", response.body
    assert_match "2 songs", response.body
  end
end
