require "application_system_test_case"

class KeyboardShortcutsTest < ApplicationSystemTestCase
  setup do
    @song = create_test_song("song 1.mp3", "artist1/song1.mp3",
      title: "Test Song", artist: "Test Artist", album: "Test Album")
  end

  test "open with ? key and close with Escape" do
    visit songs_path

    # Modal should be hidden initially
    assert_selector "#keyboard-shortcuts-modal [role='dialog'].hidden", visible: false

    # Press ? to open
    page.send_keys("?")

    assert_text "Keyboard Shortcuts"
    assert_text "Play / Pause"
    assert_text "Seek forward"

    # Press Escape to close
    page.send_keys(:escape)

    assert_no_text "Play / Pause"
  end

  test "open via nav button click" do
    visit songs_path

    find("button[aria-label='Keyboard shortcuts']").click

    assert_text "Keyboard Shortcuts"
    assert_text "Play / Pause"
    assert_text "Seek forward"
    assert_text "Open context menu"
    assert_text "Start inline edit"
  end

  test "close by clicking backdrop" do
    visit songs_path

    find("button[aria-label='Keyboard shortcuts']").click

    assert_text "Keyboard Shortcuts"

    # Click the backdrop area (top of the dialog overlay, above the centered panel)
    # Offsets are from center of element, so use large negative y to reach top edge
    dialog = find("#keyboard-shortcuts-modal [role='dialog']")
    dialog.click(x: 0, y: -dialog.native.size.height / 2 + 10)

    assert_no_text "Play / Pause"
  end
end
