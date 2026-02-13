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

  test "song_ids parameter organizes only specific songs" do
    song1 = create_test_song("song 1.mp3", "song1.mp3", title: "Song1", artist: "Artist1")
    song2 = create_test_song("song 2.mp3", "song2.mp3", title: "Song2", artist: "Artist2")
    song2_original_path = song2.file_path

    OrganizeFilesJob.perform_now("<Artist>/<Title>", song_ids: [ song1.id ])

    song1.reload
    song2.reload
    assert_equal File.join(@temp_dir, "Artist1", "Song1.mp3"), song1.file_path
    assert_equal song2_original_path, song2.file_path
  end

  test "disc template token uses disc_number" do
    song = create_test_song("song 1.mp3", "song1.mp3", title: "Song", artist: "Artist", disc_number: 2)

    OrganizeFilesJob.perform_now("<Artist>/Disc <Disc>/<Title>")

    song.reload
    assert_equal File.join(@temp_dir, "Artist", "Disc 2", "Song.mp3"), song.file_path
  end

  test "year template token uses year" do
    song = create_test_song("song 1.mp3", "song1.mp3", title: "Song", artist: "Artist", year: 1999)

    OrganizeFilesJob.perform_now("<Artist>/<Year>/<Title>")

    song.reload
    assert_equal File.join(@temp_dir, "Artist", "1999", "Song.mp3"), song.file_path
  end

  test "genre template token uses genre" do
    song = create_test_song("song 1.mp3", "song1.mp3", title: "Song", artist: "Artist", genre: "Rock")

    OrganizeFilesJob.perform_now("<Genre>/<Artist>/<Title>")

    song.reload
    assert_equal File.join(@temp_dir, "Rock", "Artist", "Song.mp3"), song.file_path
  end

  test "filename template token preserves original filename" do
    song = create_test_song("song 1.mp3", "original_name.mp3", title: "Song", artist: "Artist")

    OrganizeFilesJob.perform_now("<Artist>/<Filename>")

    song.reload
    assert_equal File.join(@temp_dir, "Artist", "original_name.mp3"), song.file_path
  end

  test "nil fields use fallback values in template" do
    song = Song.create!(
      title: "Song",
      artist: nil,
      album: nil,
      genre: nil,
      year: nil,
      file_path: File.join(@temp_dir, "song1.mp3"),
      file_size: 1000,
      duration: 180
    )
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), song.file_path)

    OrganizeFilesJob.perform_now("<Artist>/<Album>/<Genre>/<Year>/<Title>")

    song.reload
    expected = File.join(@temp_dir, "Unknown Artist", "Unknown Album", "Unknown Genre", "0000", "Song.mp3")
    assert_equal expected, song.file_path
  end

  test "preview with song_ids only previews specific songs" do
    song1 = create_test_song("song 1.mp3", "song1.mp3", title: "Song1", artist: "Artist1")
    song2 = create_test_song("song 2.mp3", "song2.mp3", title: "Song2", artist: "Artist2")

    changes = OrganizeFilesJob.preview("<Artist>/<Title>", song_ids: [ song1.id ])

    assert_equal 1, changes.size
    assert_equal song1.id, changes.first[:id]
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
