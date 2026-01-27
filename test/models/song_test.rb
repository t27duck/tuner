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
end
