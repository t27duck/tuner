require "test_helper"

class UploadsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @temp_dir = Dir.mktmpdir("uploads_test_#{Process.pid}_#{Thread.current.object_id}")
    @original_music_root = Configuration.music_root
    Configuration.instance_variable_set(:@music_root, @temp_dir)
    @fixture_mp3 = Rails.root.join("test/fixtures/files/song 1.mp3")
  end

  teardown do
    Configuration.instance_variable_set(:@music_root, @original_music_root)
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  test "GET new renders upload page" do
    get new_upload_path
    assert_response :success
    assert_select "[data-controller='upload']"
  end

  test "POST create saves MP3 file to _NEW directory" do
    file = fixture_file_upload("song 1.mp3", "audio/mpeg")

    assert_difference "Song.count", 1 do
      post upload_path, params: { file: file, relative_path: "song 1.mp3" }
    end

    assert_response :success
    json = JSON.parse(response.body)
    assert_match(/Uploaded/, json["message"])

    dest = File.join(@temp_dir, "_NEW", "song 1.mp3")
    assert File.exist?(dest), "File should be saved to _NEW directory"
  end

  test "POST create preserves folder structure from relative_path" do
    file = fixture_file_upload("song 1.mp3", "audio/mpeg")

    post upload_path, params: { file: file, relative_path: "Artist/Album/track.mp3" }

    assert_response :success
    dest = File.join(@temp_dir, "_NEW", "Artist", "Album", "track.mp3")
    assert File.exist?(dest), "File should preserve folder structure"
  end

  test "POST create creates Song record with metadata" do
    file = fixture_file_upload("song 1.mp3", "audio/mpeg")

    post upload_path, params: { file: file, relative_path: "song 1.mp3" }

    assert_response :success
    json = JSON.parse(response.body)
    song = Song.find(json["song_id"])
    assert song.file_size.positive?
    assert song.title.present?
  end

  test "POST create rejects non-MP3 files" do
    file = fixture_file_upload("cover.jpg", "image/jpeg")

    assert_no_difference "Song.count" do
      post upload_path, params: { file: file, relative_path: "cover.jpg" }
    end

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert_equal "Only MP3 files are accepted", json["error"]
  end

  test "POST create rejects path traversal attempts" do
    file = fixture_file_upload("song 1.mp3", "audio/mpeg")

    post upload_path, params: { file: file, relative_path: "../../etc/evil.mp3" }

    assert_response :success
    # The ".." segments are stripped, so file lands safely in _NEW
    dest = File.join(@temp_dir, "_NEW", "etc", "evil.mp3")
    assert File.exist?(dest)
  end

  test "POST create returns error when no file provided" do
    post upload_path, params: { relative_path: "test.mp3" }

    assert_response :unprocessable_entity
    json = JSON.parse(response.body)
    assert_equal "No file provided", json["error"]
  end

  test "POST create avoids duplicate Song records for same path" do
    file = fixture_file_upload("song 1.mp3", "audio/mpeg")

    post upload_path, params: { file: file, relative_path: "dup.mp3" }
    assert_response :success

    assert_no_difference "Song.count" do
      file2 = fixture_file_upload("song 1.mp3", "audio/mpeg")
      post upload_path, params: { file: file2, relative_path: "dup.mp3" }
    end

    assert_response :success
  end

  test "POST create broadcasts upload status" do
    file = fixture_file_upload("song 1.mp3", "audio/mpeg")

    assert_broadcasts("upload_status", 1) do
      post upload_path, params: { file: file, relative_path: "song 1.mp3" }
    end
  end
end
