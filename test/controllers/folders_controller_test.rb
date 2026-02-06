require "test_helper"

class FoldersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @temp_dir = Dir.mktmpdir("folders_test_#{Process.pid}_#{Thread.current.object_id}")
    @original_music_root = Configuration.music_root
    Configuration.instance_variable_set(:@music_root, @temp_dir)

    # Create directory structure
    FileUtils.mkdir_p(File.join(@temp_dir, "Rock"))
    FileUtils.mkdir_p(File.join(@temp_dir, "Jazz", "Bebop"))
    FileUtils.mkdir_p(File.join(@temp_dir, ".hidden"))
    FileUtils.mkdir_p(File.join(@temp_dir, "Empty"))

    # Copy fixture MP3s into directories
    fixture = Rails.root.join("test/fixtures/files/song 1.mp3")

    # Root level MP3
    FileUtils.cp(fixture, File.join(@temp_dir, "root_song.mp3"))

    # Rock directory MP3s
    FileUtils.cp(fixture, File.join(@temp_dir, "Rock", "rock_song.mp3"))
    FileUtils.cp(fixture, File.join(@temp_dir, "Rock", "unsynced_song.mp3"))

    # Jazz directory MP3
    FileUtils.cp(fixture, File.join(@temp_dir, "Jazz", "jazz_song.mp3"))

    # Create Song records for synced files
    @root_song = Song.create!(
      title: "Root Song", artist: "Root Artist", album: "Root Album",
      file_path: File.join(@temp_dir, "root_song.mp3"),
      file_size: File.size(File.join(@temp_dir, "root_song.mp3")),
      duration: 180
    )
    @rock_song = Song.create!(
      title: "Rock Song", artist: "Rock Artist", album: "Rock Album",
      file_path: File.join(@temp_dir, "Rock", "rock_song.mp3"),
      file_size: File.size(File.join(@temp_dir, "Rock", "rock_song.mp3")),
      duration: 200
    )
    @jazz_song = Song.create!(
      title: "Jazz Song", artist: "Jazz Artist", album: "Jazz Album",
      file_path: File.join(@temp_dir, "Jazz", "jazz_song.mp3"),
      file_size: File.size(File.join(@temp_dir, "Jazz", "jazz_song.mp3")),
      duration: 240
    )
    # Note: unsynced_song.mp3 has no Song record
  end

  teardown do
    Configuration.instance_variable_set(:@music_root, @original_music_root)
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  test "index renders successfully with subdirectories and root files" do
    get folders_url
    assert_response :success
    assert_match "Rock", response.body
    assert_match "Jazz", response.body
    assert_match "Empty", response.body
    assert_match "root_song.mp3", response.body
  end

  test "show renders subdirectory contents" do
    get folder_url("Rock")
    assert_response :success
    assert_match "rock_song.mp3", response.body
    assert_match "unsynced_song.mp3", response.body
  end

  test "show renders nested subdirectory" do
    get folder_url("Jazz/Bebop")
    assert_response :success
    assert_select "h1", "Bebop"
  end

  test "synced songs display metadata" do
    get folder_url("Rock")
    assert_response :success
    assert_match "Rock Song", response.body
    assert_match "Rock Artist", response.body
  end

  test "unsynced files display not synced" do
    get folder_url("Rock")
    assert_response :success
    assert_match "Not synced", response.body
  end

  test "play all button present when synced songs exist" do
    get folder_url("Rock")
    assert_response :success
    assert_select "button[data-action='click->audio-player#playAll']"
  end

  test "play all button absent when no synced songs" do
    get folder_url("Empty")
    assert_response :success
    assert_select "button[data-action='click->audio-player#playAll']", count: 0
  end

  test "breadcrumb navigation shows path segments" do
    get folder_url("Jazz/Bebop")
    assert_response :success
    assert_select "nav[aria-label='Folder breadcrumb']" do
      assert_select "a", text: "Music"
      assert_select "a", text: "Jazz"
      assert_select "span[aria-current='page']", text: "Bebop"
    end
  end

  test "path traversal with .. returns 404" do
    get folder_url("../../../etc")
    assert_response :not_found
  end

  test "nonexistent directory returns 404" do
    get folder_url("nonexistent")
    assert_response :not_found
  end

  test "hidden directories excluded from listing" do
    get folders_url
    assert_response :success
    refute_match ".hidden", response.body
  end

  test "empty directory shows empty message" do
    get folder_url("Empty")
    assert_response :success
    assert_match "This folder is empty.", response.body
  end

  test "add to queue button present when synced songs exist" do
    get folder_url("Rock")
    assert_response :success
    assert_select "button[data-action='click->audio-player#addPlaylistToQueue']"
  end

  test "index breadcrumb shows Music as current page" do
    get folders_url
    assert_response :success
    assert_select "nav[aria-label='Folder breadcrumb']" do
      assert_select "span[aria-current='page']", text: "Music"
    end
  end
end
