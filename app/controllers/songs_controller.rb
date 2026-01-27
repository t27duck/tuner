class SongsController < ApplicationController
  before_action :set_song, only: %i[show edit update destroy album_art]

  def index
    @q = Song.ransack(params[:q])
    @q.sorts = "title asc" if @q.sorts.empty?
    @songs = @q.result.page(params[:page]).per(50)
  end

  def show
  end

  def edit
  end

  def update
    if @song.update(song_params)
      write_tags_to_file(@song)
      write_album_art(@song, params[:song][:album_art]) if params[:song][:album_art].present?
      redirect_to songs_path, notice: "Song updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def album_art
    art = @song.album_art
    if art
      send_data art[:data], type: art[:mime_type], disposition: "inline"
    else
      head :not_found
    end
  end

  def destroy
    @song.destroy
    redirect_to songs_path, notice: "Song deleted."
  end

  private

  def set_song
    @song = Song.find(params[:id])
  end

  def song_params
    params.require(:song).permit(:title, :artist, :album, :genre, :year, :track_number, :disc_number)
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

    Mp3Info.open(song.file_path) do |mp3|
      mp3.tag2.remove_pictures
      mp3.tag2.add_picture(image_data, pic_type: 3, mime: mime_type)
    end
  rescue => e
    Rails.logger.error("Failed to write album art to #{song.file_path}: #{e.message}")
  end
end
