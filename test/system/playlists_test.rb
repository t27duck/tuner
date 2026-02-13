require "application_system_test_case"

class PlaylistsSystemTest < ApplicationSystemTestCase
  test "create a playlist" do
    visit playlists_path

    click_on "New Playlist"
    fill_in "Name", with: "My Favorites"
    fill_in "Description", with: "Best songs ever"
    click_on "Create Playlist"

    assert_text "Playlist created."
    assert_text "My Favorites"
  end

  test "view playlist with songs" do
    playlist = Playlist.create!(name: "Rock Hits")
    song1 = create_test_song("song 1.mp3", "rock/song1.mp3", title: "Thunder", artist: "AC/DC", album: "Rock Album")
    song2 = create_test_song("song 2.mp3", "rock/song2.mp3", title: "Bohemian Rhapsody", artist: "Queen", album: "Rock Album")
    playlist.add_song(song1)
    playlist.add_song(song2)

    visit playlist_path(playlist)

    assert_text "Rock Hits"
    assert_text "Thunder"
    assert_text "Bohemian Rhapsody"
  end

  test "delete a playlist" do
    Playlist.create!(name: "To Delete")

    visit playlists_path
    assert_text "To Delete"

    click_on "To Delete"
    accept_confirm do
      click_on "Delete"
    end

    assert_text "Playlist deleted."
    assert_no_text "To Delete"
  end
end
