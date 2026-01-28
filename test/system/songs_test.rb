require "application_system_test_case"

class SongsSystemTest < ApplicationSystemTestCase
  setup do
    @song1 = create_test_song("song 1.mp3", "artist1/song1.mp3",
      title: "Alpha Song", artist: "First Artist", album: "Album A", genre: "Rock")
    @song2 = create_test_song("song 2.mp3", "artist2/song2.mp3",
      title: "Beta Song", artist: "Second Artist", album: "Album B", genre: "Jazz")
    @song3 = create_test_song("song 3.mp3", "artist3/song3.mp3",
      title: "Gamma Song", artist: "Third Artist", album: "Album C", genre: "Pop")
  end

  test "browsing and searching songs" do
    visit songs_path

    assert_text "Alpha Song"
    assert_text "Beta Song"
    assert_text "Gamma Song"

    fill_in "Search songs...", with: "Beta"
    sleep 0.5 # debounce

    assert_text "Beta Song"
    assert_no_text "Alpha Song"
    assert_no_text "Gamma Song"

    click_on "Clear"

    assert_text "Alpha Song"
    assert_text "Beta Song"
    assert_text "Gamma Song"
  end

  test "editing a song via the edit form" do
    visit edit_song_path(@song1)

    fill_in "Title", with: "Updated Title"
    fill_in "Artist", with: "Updated Artist"
    click_on "Save"

    assert_current_path songs_path
    assert_text "Song updated."
    assert_text "Updated Title"
    assert_text "Updated Artist"
  end

  test "deleting a song via context menu" do
    file_path = @song1.file_path
    assert File.exist?(file_path)

    visit songs_path
    song_row = find("tr", text: "Alpha Song")
    song_row.right_click

    assert_selector "#context-menu"

    accept_confirm do
      within "#context-menu" do
        click_on "Delete"
      end
    end

    assert_no_text "Alpha Song"
    assert_not File.exist?(file_path)
  end
end
