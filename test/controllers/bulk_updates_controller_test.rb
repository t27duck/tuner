require "test_helper"

class BulkUpdatesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @temp_dir = Dir.mktmpdir("bulk_test_#{Process.pid}_#{Thread.current.object_id}")
    @songs = 3.times.map do |i|
      path = File.join(@temp_dir, "song#{i}.mp3")
      FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), path)
      Song.create!(file_path: path, title: "Song #{i}", artist: "Old Artist")
    end
  end

  teardown do
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  test "bulk update changes metadata for selected songs" do
    patch bulk_update_path, params: {
      song_ids: @songs.map(&:id),
      bulk: { artist: "New Artist" }
    }
    assert_redirected_to songs_path

    @songs.each do |song|
      assert_equal "New Artist", song.reload.artist
    end
  end

  test "bulk update with no songs selected shows alert" do
    patch bulk_update_path, params: {
      song_ids: [],
      bulk: { artist: "New Artist" }
    }
    assert_redirected_to songs_path
    assert_equal "No songs selected.", flash[:alert]
  end

  test "bulk update shows success notice with count" do
    patch bulk_update_path, params: {
      song_ids: @songs.map(&:id),
      bulk: { artist: "New Artist" }
    }
    assert_equal "3 songs updated.", flash[:notice]
  end

  test "bulk update writes to ID3 tags" do
    patch bulk_update_path, params: {
      song_ids: [ @songs.first.id ],
      bulk: { artist: "Tagged Artist" }
    }

    Mp3Info.open(@songs.first.file_path) do |mp3|
      assert_equal "Tagged Artist", mp3.tag.artist
    end
  end

  test "bulk update with album art writes art to files" do
    cover = fixture_file_upload("cover.jpg", "image/jpeg")

    patch bulk_update_path, params: {
      song_ids: [ @songs.first.id ],
      bulk: { album_art: cover }
    }
    assert_redirected_to songs_path

    art = @songs.first.album_art
    assert_not_nil art
    assert_includes %w[image/jpeg image/png], art[:mime_type]
  end

  test "bulk update with album art writes to multiple songs" do
    cover = fixture_file_upload("cover.jpg", "image/jpeg")

    patch bulk_update_path, params: {
      song_ids: @songs.map(&:id),
      bulk: { album_art: cover }
    }
    assert_redirected_to songs_path

    @songs.each do |song|
      art = song.album_art
      assert_not_nil art, "Expected album art on song #{song.id}"
    end
  end

  test "bulk update skips tag writing for missing files" do
    @songs.first.update!(file_path: "/tmp/nonexistent_#{SecureRandom.hex}.mp3")

    assert_nothing_raised do
      patch bulk_update_path, params: {
        song_ids: @songs.map(&:id),
        bulk: { artist: "New Artist" }
      }
    end
    assert_redirected_to songs_path
  end
end
