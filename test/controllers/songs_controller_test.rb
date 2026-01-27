require "test_helper"

class SongsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @temp_dir = Dir.mktmpdir("songs_ctrl_#{Process.pid}_#{Thread.current.object_id}")
    mp3_path = File.join(@temp_dir, "test.mp3")
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), mp3_path)
    @song = Song.create!(file_path: mp3_path, title: "Test Song", artist: "Artist", album: "Album")
  end

  teardown do
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
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

  test "destroy removes song and file from disk" do
    assert File.exist?(@song.file_path)
    assert_difference("Song.count", -1) do
      delete song_url(@song)
    end
    assert_redirected_to songs_path
    assert_not File.exist?(@song.file_path)
  end

  test "root routes to songs index" do
    get root_url
    assert_response :success
  end

  test "update writes ID3 tags to file" do
    patch song_url(@song), params: { song: { title: "New Title", artist: "New Artist" } }
    assert_redirected_to songs_path

    Mp3Info.open(@song.file_path) do |mp3|
      assert_equal "New Title", mp3.tag.title
      assert_equal "New Artist", mp3.tag.artist
    end
  end

  test "album_art returns 404 when no art" do
    get album_art_song_url(@song)
    assert_response :not_found
  end
end
