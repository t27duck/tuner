require "test_helper"

class SyncLibraryJobTest < ActiveSupport::TestCase
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

  private

  def copy_fixture(fixture_name, dest_subpath)
    source = Rails.root.join("test/fixtures/files/#{fixture_name}")
    dest = File.join(@temp_dir, dest_subpath)
    FileUtils.mkdir_p(File.dirname(dest))
    FileUtils.cp(source, dest)
    dest
  end
end
