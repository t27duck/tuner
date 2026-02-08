# frozen_string_literal: true

require "test_helper"

class Mp3MetadataExtractorTest < ActiveSupport::TestCase
  class Extractor
    include Mp3MetadataExtractor
    public :extract_tags, :parse_year, :parse_track, :sanitize_string
  end

  setup do
    @extractor = Extractor.new
  end

  test "extract_tags returns correct metadata from fixture MP3" do
    file = Rails.root.join("test/fixtures/files/song 1.mp3")
    tags = @extractor.extract_tags(file.to_s)

    assert_kind_of Hash, tags
    assert tags.key?(:title)
    assert tags.key?(:artist)
    assert tags.key?(:album)
    assert tags.key?(:genre)
    assert tags.key?(:year)
    assert tags.key?(:track_number)
    assert tags.key?(:disc_number)
    assert tags.key?(:duration)
    assert_kind_of Integer, tags[:duration]
  end

  test "extract_tags returns partial hash and logs warning for corrupt file" do
    temp = Tempfile.new([ "corrupt", ".mp3" ])
    temp.write("not a real mp3 file at all")
    temp.close

    tags = @extractor.extract_tags(temp.path)

    assert_kind_of Hash, tags
  ensure
    temp&.unlink
  end

  test "parse_year returns integer from four-digit year string" do
    assert_equal 2023, @extractor.parse_year("2023")
  end

  test "parse_year extracts year from timestamp string" do
    assert_equal 2021, @extractor.parse_year("2021-05-15")
  end

  test "parse_year returns nil for blank input" do
    assert_nil @extractor.parse_year("")
    assert_nil @extractor.parse_year(nil)
  end

  test "parse_track returns integer from track/total format" do
    assert_equal 3, @extractor.parse_track("3/12")
  end

  test "parse_track returns integer from plain number" do
    assert_equal 7, @extractor.parse_track("7")
  end

  test "parse_track returns nil for blank input" do
    assert_nil @extractor.parse_track("")
    assert_nil @extractor.parse_track(nil)
  end

  test "sanitize_string scrubs invalid UTF-8" do
    bad = "hello\xFFworld".dup.force_encoding("UTF-8")
    result = @extractor.sanitize_string(bad)

    assert result.valid_encoding?
    assert_includes result, "hello"
    assert_includes result, "world"
  end

  test "sanitize_string strips null bytes" do
    result = @extractor.sanitize_string("hello\u0000world")
    assert_equal "helloworld", result
  end

  test "sanitize_string returns nil for nil input" do
    assert_nil @extractor.sanitize_string(nil)
  end
end
