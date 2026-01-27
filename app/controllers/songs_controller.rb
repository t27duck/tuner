class SongsController < ApplicationController
  before_action :set_song, only: %i[show edit update destroy]

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
      redirect_to songs_path, notice: "Song updated."
    else
      render :edit, status: :unprocessable_entity
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
end
