require "test_helper"

class OrganizeFilesJobTest < ActiveSupport::TestCase
  setup do
    @temp_dir = Dir.mktmpdir("organize_test_#{Process.pid}_#{Thread.current.object_id}")
    @original_music_root = Configuration.music_root
    Configuration.instance_variable_set(:@music_root, @temp_dir)
  end

  teardown do
    Configuration.instance_variable_set(:@music_root, @original_music_root)
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  test "organizes files according to template" do
    song = create_test_song("song 1.mp3", "song1.mp3", title: "MySong", artist: "MyArtist", album: "MyAlbum", track_number: 3)

    OrganizeFilesJob.perform_now("<Artist>/<Album>/<Track:2> - <Title>")

    song.reload
    expected = File.join(@temp_dir, "MyArtist", "MyAlbum", "03 - MySong.mp3")
    assert_equal expected, song.file_path
    assert File.exist?(expected)
  end

  test "cleans up empty directories after move" do
    old_dir = File.join(@temp_dir, "old_dir")
    create_test_song("song 1.mp3", "old_dir/song1.mp3", title: "Song", artist: "Artist", album: "Album")

    OrganizeFilesJob.perform_now("<Artist>/<Title>")

    assert_not Dir.exist?(old_dir)
  end

  test "sanitizes filenames" do
    song = create_test_song("song 1.mp3", "song1.mp3", title: "Bad:Name?", artist: "Art*ist")

    OrganizeFilesJob.perform_now("<Artist>/<Title>")

    song.reload
    assert_not_includes song.file_path, ":"
    assert_not_includes song.file_path, "?"
    assert_not_includes song.file_path, "*"
  end

  test "preview shows changes without moving files" do
    song = create_test_song("song 1.mp3", "song1.mp3", title: "Song", artist: "Artist", album: "Album")
    old_path = song.file_path

    changes = OrganizeFilesJob.preview("<Artist>/<Title>")

    assert_equal 1, changes.size
    assert_equal old_path, changes.first[:old_path]
    assert File.exist?(old_path)
  end

  private

  def create_test_song(fixture_name, dest_subpath, attrs = {})
    source = Rails.root.join("test/fixtures/files/#{fixture_name}")
    dest = File.join(@temp_dir, dest_subpath)
    FileUtils.mkdir_p(File.dirname(dest))
    FileUtils.cp(source, dest)

    Song.create!(
      title: attrs[:title] || "Test Song",
      artist: attrs[:artist] || "Test Artist",
      file_path: dest,
      file_size: File.size(dest),
      duration: 180,
      **attrs.slice(:album, :genre, :year, :track_number, :disc_number)
    )
  end
end
