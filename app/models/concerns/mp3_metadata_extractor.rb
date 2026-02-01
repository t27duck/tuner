# frozen_string_literal: true

module Mp3MetadataExtractor
  extend ActiveSupport::Concern

  private

  def extract_tags(file_path)
    tags = {}
    Mp3Info.open(file_path) do |mp3|
      tag = mp3.tag
      tag2 = mp3.tag2

      tags[:title] = sanitize_string(tag.title)
      tags[:artist] = sanitize_string(tag.artist)
      tags[:album] = sanitize_string(tag.album)
      tags[:genre] = sanitize_string(tag.genre_s)
      tags[:year] = parse_year(tag2["TDRC"] || tag2["TYER"] || tag.year)
      tags[:track_number] = parse_track(tag2["TRCK"] || tag.tracknum)
      tags[:disc_number] = parse_track(tag2["TPOS"])
      tags[:duration] = mp3.length.to_i
    end
    tags
  rescue => e
    Rails.logger.warn("Failed to read tags from #{file_path}: #{e.message}")
    tags
  end

  def parse_year(value)
    return nil if value.blank?
    value.to_s[/\d{4}/]&.to_i
  end

  def parse_track(value)
    return nil if value.blank?
    value.to_s.split("/").first&.to_i
  end

  def sanitize_string(value)
    return nil if value.nil?
    value.to_s.encode("UTF-8", invalid: :replace, undef: :replace, replace: "").scrub("").delete("\u0000")
  end
end
