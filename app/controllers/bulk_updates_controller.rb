class BulkUpdatesController < ApplicationController
  def update
    song_ids = params[:song_ids] || []
    songs = Song.where(id: song_ids)

    if songs.empty?
      redirect_to songs_path, alert: "No songs selected."
      return
    end

    attrs = bulk_params.to_h.compact_blank
    album_art = params[:bulk][:album_art] if params[:bulk]&.key?(:album_art)

    songs.find_each do |song|
      song.update!(attrs) if attrs.any?
      write_tags_to_file(song)
      write_album_art(song, album_art) if album_art.present?
    end

    redirect_to songs_path, notice: "#{songs.count} songs updated."
  end

  private

  def bulk_params
    params.require(:bulk).permit(:title, :artist, :album, :genre, :year, :track_number, :disc_number)
  end

  def write_tags_to_file(song)
    return unless File.exist?(song.file_path)

    Mp3Info.open(song.file_path) do |mp3|
      mp3.tag.title = song.title
      mp3.tag.artist = song.artist
      mp3.tag.album = song.album
      mp3.tag.genre_s = song.genre || ""
      mp3.tag.year = song.year
      mp3.tag.tracknum = song.track_number
      mp3.tag2["TPOS"] = song.disc_number.to_s if song.disc_number
    end
  rescue => e
    Rails.logger.error("Failed to write tags to #{song.file_path}: #{e.message}")
  end

  def write_album_art(song, uploaded_file)
    return unless File.exist?(song.file_path)

    image_data = uploaded_file.read
    mime_type = uploaded_file.content_type
    uploaded_file.rewind

    Mp3Info.open(song.file_path) do |mp3|
      mp3.tag2.remove_pictures
      mp3.tag2.add_picture(image_data, pic_type: 3, mime: mime_type)
    end
  rescue => e
    Rails.logger.error("Failed to write album art to #{song.file_path}: #{e.message}")
  end
end
