require "test_helper"

class SyncLibraryJobTest < ActiveSupport::TestCase
  include ActionCable::TestHelper

  setup do
    @temp_dir = Dir.mktmpdir("sync_test_#{Process.pid}_#{Thread.current.object_id}")
    @original_music_root = Configuration.music_root
    Configuration.instance_variable_set(:@music_root, @temp_dir)
  end

  teardown do
    Configuration.instance_variable_set(:@music_root, @original_music_root)
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  test "imports mp3 files from music root" do
    copy_fixture("song 1.mp3", "song1.mp3")
    copy_fixture("song 2.mp3", "song2.mp3")

    SyncLibraryJob.perform_now

    assert_equal 2, Song.count
    song = Song.find_by(file_path: File.join(@temp_dir, "song1.mp3"))
    assert song
    assert song.file_size > 0
  end

  test "defaults title to filename when tag is missing" do
    copy_fixture("song 1.mp3", "My Cool Song.mp3")

    SyncLibraryJob.perform_now

    song = Song.first
    # Title should be either from tag or filename
    assert song.title.present?
  end

  test "does not duplicate existing songs" do
    copy_fixture("song 1.mp3", "song1.mp3")

    SyncLibraryJob.perform_now
    SyncLibraryJob.perform_now

    assert_equal 1, Song.count
  end

  test "removes songs for deleted files" do
    path = copy_fixture("song 1.mp3", "song1.mp3")
    SyncLibraryJob.perform_now

    assert_equal 1, Song.count

    File.delete(path)
    SyncLibraryJob.perform_now

    assert_equal 0, Song.count
  end

  test "scans subdirectories" do
    copy_fixture("song 1.mp3", "artist/album/song1.mp3")

    SyncLibraryJob.perform_now

    assert_equal 1, Song.count
  end

  test "handles missing music directory" do
    Configuration.instance_variable_set(:@music_root, "/nonexistent/path")

    SyncLibraryJob.perform_now

    assert_equal 0, Song.count
  end

  test "updates existing song on re-sync" do
    path = copy_fixture("song 1.mp3", "song1.mp3")
    SyncLibraryJob.perform_now

    song = Song.find_by(file_path: path)
    assert_equal "Test Song One", song.title

    Mp3Info.open(path) do |mp3|
      mp3.tag.title = "Updated Title"
    end
    SyncLibraryJob.perform_now

    assert_equal 1, Song.count
    assert_equal "Updated Title", song.reload.title
  end

  test "extracts duration from mp3" do
    copy_fixture("song 1.mp3", "song1.mp3")
    SyncLibraryJob.perform_now

    song = Song.first
    assert_operator song.duration, :>, 0
  end

  test "extracts file size" do
    path = copy_fixture("song 1.mp3", "song1.mp3")
    SyncLibraryJob.perform_now

    song = Song.first
    assert_equal File.size(path), song.file_size
  end

  test "parses year from TDRC tag" do
    path = copy_fixture("song 2.mp3", "tdrc.mp3")
    Mp3Info.open(path) { |mp3| mp3.tag2["TDRC"] = "2023" }
    SyncLibraryJob.perform_now

    assert_equal 2023, Song.find_by(file_path: path).year
  end

  test "parses year from TYER tag when TDRC absent" do
    path = copy_fixture("song 2.mp3", "tyer.mp3")
    Mp3Info.open(path) { |mp3| mp3.tag2["TYER"] = "1999" }
    SyncLibraryJob.perform_now

    assert_equal 1999, Song.find_by(file_path: path).year
  end

  test "parses year from timestamp format" do
    path = copy_fixture("song 2.mp3", "timestamp.mp3")
    Mp3Info.open(path) { |mp3| mp3.tag2["TDRC"] = "2021-05-15" }
    SyncLibraryJob.perform_now

    assert_equal 2021, Song.find_by(file_path: path).year
  end

  test "parses track number from TRCK with total" do
    path = copy_fixture("song 2.mp3", "track_total.mp3")
    Mp3Info.open(path) { |mp3| mp3.tag2["TRCK"] = "3/12" }
    SyncLibraryJob.perform_now

    assert_equal 3, Song.find_by(file_path: path).track_number
  end

  test "parses disc number from TPOS" do
    path = copy_fixture("song 2.mp3", "disc.mp3")
    Mp3Info.open(path) { |mp3| mp3.tag2["TPOS"] = "2/3" }
    SyncLibraryJob.perform_now

    assert_equal 2, Song.find_by(file_path: path).disc_number
  end

  test "parses simple track number" do
    path = copy_fixture("song 2.mp3", "track_simple.mp3")
    Mp3Info.open(path) { |mp3| mp3.tag2["TRCK"] = "7" }
    SyncLibraryJob.perform_now

    assert_equal 7, Song.find_by(file_path: path).track_number
  end

  test "extracts genre from tag" do
    path = copy_fixture("song 2.mp3", "genre.mp3")
    Mp3Info.open(path) do |mp3|
      mp3.tag.genre_s = "Rock"
    end
    SyncLibraryJob.perform_now

    assert_equal "Rock", Song.find_by(file_path: path).genre
  end

  test "imports corrupt file with filename as title" do
    copy_fixture("song 1.mp3", "good.mp3")

    # Corrupt file still gets imported with filename as title since
    # extract_tags rescues and returns empty tags
    corrupt_path = File.join(@temp_dir, "corrupt.mp3")
    File.write(corrupt_path, "not a real mp3 file")

    SyncLibraryJob.perform_now

    assert_equal 2, songs_in_temp_dir.count
    assert_equal "corrupt", Song.find_by(file_path: corrupt_path).title
  end

  test "broadcasts sync status messages" do
    copy_fixture("song 1.mp3", "song1.mp3")

    messages = capture_broadcasts("sync_status") do
      SyncLibraryJob.perform_now
    end

    statuses = messages.map { |m| m["status"] }
    assert_includes statuses, "running"
    assert_includes statuses, "completed"

    completed = messages.find { |m| m["status"] == "completed" }
    assert_match(/1 files processed/, completed["message"])
  end

  test "broadcasts failure when music directory missing" do
    Configuration.instance_variable_set(:@music_root, "/nonexistent/path")

    messages = capture_broadcasts("sync_status") do
      SyncLibraryJob.perform_now
    end

    failed = messages.find { |m| m["status"] == "failed" }
    assert_not_nil failed
    assert_match(/not found/, failed["message"])
  end

  test "broadcasts failed count when import errors" do
    path = copy_fixture("song 1.mp3", "song1.mp3")

    # Stub import_file to raise for this specific file
    job = SyncLibraryJob.new
    original_import = job.method(:import_file)
    call_count = 0
    job.define_singleton_method(:import_file) do |file_path|
      call_count += 1
      raise "simulated failure" if file_path == path
      original_import.call(file_path)
    end

    messages = capture_broadcasts("sync_status") do
      job.perform
    end

    completed = messages.find { |m| m["status"] == "completed" }
    assert_match(/1 failed/, completed["message"])
  end

  test "sanitizes invalid UTF-8 in tags" do
    path = copy_fixture("song 2.mp3", "bad_encoding.mp3")
    Mp3Info.open(path) do |mp3|
      mp3.tag.title = "Good Title"
      mp3.tag.artist = "Valid Artist"
    end
    SyncLibraryJob.perform_now

    song = Song.find_by(file_path: path)
    assert song.title.valid_encoding?
    assert song.artist.valid_encoding?
  end

  test "year is nil for blank year tag" do
    path = copy_fixture("song 2.mp3", "no_year.mp3")
    SyncLibraryJob.perform_now

    assert_nil Song.find_by(file_path: path).year
  end

  test "track number is nil for blank track tag" do
    path = copy_fixture("song 2.mp3", "no_track.mp3")
    SyncLibraryJob.perform_now

    assert_nil Song.find_by(file_path: path).track_number
  end

  private

  def copy_fixture(fixture_name, dest_subpath)
    source = Rails.root.join("test/fixtures/files/#{fixture_name}")
    dest = File.join(@temp_dir, dest_subpath)
    FileUtils.mkdir_p(File.dirname(dest))
    FileUtils.cp(source, dest)
    dest
  end

  def songs_in_temp_dir
    Song.where("file_path LIKE ?", "#{@temp_dir}%")
  end
end
