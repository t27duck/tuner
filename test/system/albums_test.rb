require "application_system_test_case"

class AlbumsSystemTest < ApplicationSystemTestCase
  setup do
    @song1 = create_test_song("song 1.mp3", "artist1/song1.mp3",
      title: "Track One", artist: "Band A", album: "Great Album")
    @song2 = create_test_song("song 2.mp3", "artist1/song2.mp3",
      title: "Track Two", artist: "Band A", album: "Great Album")
    @song3 = create_test_song("song 3.mp3", "artist2/song3.mp3",
      title: "Other Track", artist: "Band B", album: "Another Album")
  end

  test "browse albums index" do
    visit albums_path

    assert_text "Great Album"
    assert_text "Another Album"
  end

  test "view album detail shows songs" do
    visit albums_path

    click_on "Great Album"

    assert_text "Great Album"
    assert_text "Track One"
    assert_text "Track Two"
    assert_text "Band A"
  end

  test "search albums filters results" do
    visit albums_path

    fill_in "Search albums...", with: "Great"
    click_on "Search"

    assert_text "Great Album"
    assert_no_text "Another Album"
  end
end
