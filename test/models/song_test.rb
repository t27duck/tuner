require "test_helper"

class SongTest < ActiveSupport::TestCase
  test "valid song with file_path" do
    song = Song.new(file_path: "/tmp/test.mp3", title: "Test")
    assert song.valid?
  end

  test "invalid without file_path" do
    song = Song.new(title: "Test")
    assert_not song.valid?
    assert_includes song.errors[:file_path], "can't be blank"
  end

  test "file_path must be unique" do
    Song.create!(file_path: "/tmp/test.mp3", title: "Test")
    song = Song.new(file_path: "/tmp/test.mp3", title: "Test 2")
    assert_not song.valid?
    assert_includes song.errors[:file_path], "has already been taken"
  end

  test "ransackable_attributes includes expected fields" do
    attrs = Song.ransackable_attributes
    assert_includes attrs, "title"
    assert_includes attrs, "artist"
    assert_includes attrs, "album"
    assert_includes attrs, "file_path"
  end

  test "ransackable_scopes includes missing filter scopes" do
    scopes = Song.ransackable_scopes
    assert_includes scopes, :missing_artist
    assert_includes scopes, :missing_album
    assert_includes scopes, :missing_genre
    assert_includes scopes, :missing_year
  end

  test "ransackable_associations returns empty array" do
    assert_equal [], Song.ransackable_associations
  end

  test "missing_artist scope returns songs with nil or empty artist" do
    with_artist = Song.create!(file_path: "/tmp/a.mp3", title: "A", artist: "Someone")
    nil_artist = Song.create!(file_path: "/tmp/b.mp3", title: "B", artist: nil)
    empty_artist = Song.create!(file_path: "/tmp/c.mp3", title: "C", artist: "")

    results = Song.missing_artist
    assert_includes results, nil_artist
    assert_includes results, empty_artist
    assert_not_includes results, with_artist
  end

  test "missing_album scope returns songs with nil or empty album" do
    with_album = Song.create!(file_path: "/tmp/a.mp3", title: "A", album: "Album")
    nil_album = Song.create!(file_path: "/tmp/b.mp3", title: "B", album: nil)
    empty_album = Song.create!(file_path: "/tmp/c.mp3", title: "C", album: "")

    results = Song.missing_album
    assert_includes results, nil_album
    assert_includes results, empty_album
    assert_not_includes results, with_album
  end

  test "missing_genre scope returns songs with nil or empty genre" do
    with_genre = Song.create!(file_path: "/tmp/a.mp3", title: "A", genre: "Rock")
    nil_genre = Song.create!(file_path: "/tmp/b.mp3", title: "B", genre: nil)
    empty_genre = Song.create!(file_path: "/tmp/c.mp3", title: "C", genre: "")

    results = Song.missing_genre
    assert_includes results, nil_genre
    assert_includes results, empty_genre
    assert_not_includes results, with_genre
  end

  test "missing_year scope returns songs with nil year" do
    with_year = Song.create!(file_path: "/tmp/a.mp3", title: "A", year: 2020)
    nil_year = Song.create!(file_path: "/tmp/b.mp3", title: "B", year: nil)

    results = Song.missing_year
    assert_includes results, nil_year
    assert_not_includes results, with_year
  end

  test "album_art returns data and mime type from mp3 with embedded art" do
    fixture = Rails.root.join("test/fixtures/files/song 1.mp3")
    song = Song.create!(file_path: fixture.to_s, title: "Art Test")

    result = song.album_art
    assert_not_nil result
    assert result[:data].present?
    assert_includes %w[image/jpeg image/png], result[:mime_type]
  end

  test "album_art returns nil when file has no art" do
    temp = Tempfile.new([ "noart", ".mp3" ])
    FileUtils.cp(Rails.root.join("test/fixtures/files/song 1.mp3"), temp.path)

    # Strip album art from the copy
    Mp3Info.open(temp.path) do |mp3|
      mp3.tag2.remove_pictures
    end

    song = Song.create!(file_path: temp.path, title: "No Art")
    assert_nil song.album_art
  ensure
    temp&.close!
  end

  test "album_art returns nil when file does not exist" do
    song = Song.create!(file_path: "/tmp/nonexistent_#{SecureRandom.hex}.mp3", title: "Missing")
    assert_nil song.album_art
  end

  test "album_art returns nil when file_path is nil" do
    song = Song.new(file_path: nil, title: "Nil Path")
    assert_nil song.album_art
  end
end
