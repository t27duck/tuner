class PlaylistsController < ApplicationController
  before_action :set_playlist, only: %i[show edit update destroy reorder remove_song]

  def index
    @playlists = Playlist.all.order(:name)
    respond_to do |format|
      format.html
      format.json { render json: @playlists.select(:id, :name) }
    end
  end

  def show
  end

  def new
    @playlist = Playlist.new
  end

  def create
    @playlist = Playlist.new(playlist_params)
    if @playlist.save
      redirect_to @playlist, notice: "Playlist created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @playlist.update(playlist_params)
      redirect_to @playlist, notice: "Playlist updated."
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @playlist.destroy
    redirect_to playlists_path, notice: "Playlist deleted."
  end

  def reorder
    ordered_ids = params[:ordered_ids]
    ordered_ids.each_with_index do |id, index|
      @playlist.playlist_songs.where(id: id).update_all(position: index + 1)
    end
    head :ok
  end

  def remove_song
    playlist_song = @playlist.playlist_songs.find_by(id: params[:playlist_song_id])
    if playlist_song
      playlist_song.destroy
      redirect_to @playlist, notice: "Song removed from playlist."
    else
      redirect_to @playlist, alert: "Song not found in playlist."
    end
  end

  private

  def set_playlist
    @playlist = Playlist.find(params[:id])
  end

  def playlist_params
    params.require(:playlist).permit(:name, :description)
  end
end
