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

  test "album_art returns image when art exists" do
    get album_art_song_url(@song)
    assert_response :success
    assert_includes %w[image/jpeg image/png], response.content_type
  end

  test "stream returns audio file" do
    get stream_song_url(@song)
    assert_response :success
    assert_equal "audio/mpeg", response.content_type
  end

  test "stream returns 404 for missing file" do
    @song.update_column(:file_path, "/nonexistent/file.mp3")
    get stream_song_url(@song)
    assert_response :not_found
  end

  test "album_art returns 404 when no art" do
    Mp3Info.open(@song.file_path) { |mp3| mp3.tag2.remove_pictures }

    get album_art_song_url(@song)
    assert_response :not_found
  end

  # --- Stream range request tests ---

  test "stream sets Accept-Ranges header" do
    get stream_song_url(@song)
    assert_response :success
    assert_equal "bytes", response.headers["Accept-Ranges"]
  end

  test "stream with Range header returns 206 with Content-Range" do
    get stream_song_url(@song), headers: { "Range" => "bytes=0-99" }
    assert_response 206
    assert_match %r{bytes 0-99/\d+}, response.headers["Content-Range"]
    assert_equal "100", response.headers["Content-Length"]
    assert_equal 100, response.body.bytesize
  end

  test "stream with open-ended Range returns data from offset to end" do
    file_size = File.size(@song.file_path)
    offset = 100
    get stream_song_url(@song), headers: { "Range" => "bytes=#{offset}-" }

    assert_response 206
    expected_length = file_size - offset
    assert_equal expected_length.to_s, response.headers["Content-Length"]
    assert_match %r{bytes #{offset}-#{file_size - 1}/#{file_size}}, response.headers["Content-Range"]
  end

  # --- Update with album art tests ---

  test "update with album art writes art to MP3 file" do
    cover = fixture_file_upload("cover.jpg", "image/jpeg")
    patch song_url(@song), params: { song: { title: @song.title, album_art: cover } }
    assert_redirected_to songs_path

    Mp3Info.open(@song.file_path) do |mp3|
      assert mp3.tag2.pictures.any?, "Expected album art to be written to the MP3 file"
    end
  end

  test "update with album art and missing file does not raise" do
    @song.update_column(:file_path, "/nonexistent/path/song.mp3")
    cover = fixture_file_upload("cover.jpg", "image/jpeg")
    patch song_url(@song), params: { song: { title: "Still Works", album_art: cover } }
    assert_redirected_to songs_path
  end

  # --- Index filtering tests ---

  test "index with search query filters songs by title" do
    temp_path = File.join(@temp_dir, "unique.mp3")
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), temp_path)
    Song.create!(file_path: temp_path, title: "Unique Zebra Song")

    get songs_url, params: { q: { title_cont: "Zebra" } }
    assert_response :success
    assert_select "td", text: /Unique Zebra Song/
  end

  test "index with missing_artist filter shows songs without artist" do
    temp_path = File.join(@temp_dir, "no_artist.mp3")
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), temp_path)
    no_artist = Song.create!(file_path: temp_path, title: "No Artist Song", artist: nil)

    get songs_url, params: { q: { missing_artist: "1" } }
    assert_response :success
    assert_select "td", text: /No Artist Song/
  end

  test "index with file_path_cont escapes underscores for literal matching" do
    temp_path = File.join(@temp_dir, "my_file_name.mp3")
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), temp_path)
    Song.create!(file_path: temp_path, title: "Underscore Song")

    get songs_url, params: { q: { file_path_cont: "my_file" } }
    assert_response :success
  end

  test "index sorts by title by default" do
    Song.delete_all

    paths = %w[alpha.mp3 beta.mp3 gamma.mp3].map do |name|
      path = File.join(@temp_dir, name)
      FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), path)
      path
    end

    Song.create!(file_path: paths[2], title: "Gamma")
    Song.create!(file_path: paths[0], title: "Alpha")
    Song.create!(file_path: paths[1], title: "Beta")

    get songs_url
    assert_response :success
    body = response.body
    assert body.index("Alpha") < body.index("Beta"), "Alpha should appear before Beta"
    assert body.index("Beta") < body.index("Gamma"), "Beta should appear before Gamma"
  end
end
