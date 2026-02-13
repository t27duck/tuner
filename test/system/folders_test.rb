require "application_system_test_case"

class FoldersSystemTest < ApplicationSystemTestCase
  test "browse folder structure" do
    create_test_song("song 1.mp3", "Rock/song1.mp3", title: "Rock Song", artist: "Rocker")
    create_test_song("song 2.mp3", "Jazz/song2.mp3", title: "Jazz Song", artist: "Jazzer")

    visit folders_path

    assert_text "Rock"
    assert_text "Jazz"
  end

  test "navigate into subdirectory and see breadcrumbs" do
    create_test_song("song 1.mp3", "Rock/Classic/song1.mp3", title: "Classic Rock", artist: "Rocker")

    visit folders_path

    click_on "Rock"
    assert_text "Classic"

    within "nav[aria-label='Folder breadcrumb']" do
      assert_text "Music"
      assert_text "Rock"
    end
  end

  test "view synced and unsynced files" do
    create_test_song("song 1.mp3", "Mixed/synced.mp3", title: "Synced Song", artist: "Artist")

    # Copy an unsynced MP3 into the same folder (no DB record)
    unsynced_dest = File.join(@temp_dir, "Mixed", "unsynced.mp3")
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 2.mp3"), unsynced_dest)

    visit folder_path("Mixed")

    assert_text "Synced Song"
    assert_text "Not synced"
  end
end
