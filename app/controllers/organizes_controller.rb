class OrganizesController < ApplicationController
  def new
    @song_ids = session[:organize_song_ids] || []
  end

  def select
    session[:organize_song_ids] = Array(params[:song_ids]).map(&:to_i)
    redirect_to new_organize_path
  end

  def preview
    @template = params[:template]
    @song_ids = session[:organize_song_ids] || []
    @music_root = Configuration.music_root
    @changes = OrganizeFilesJob.preview(@template, song_ids: @song_ids.presence)
  end

  def create
    template = params[:template]
    song_ids = session.delete(:organize_song_ids) || []
    OrganizeFilesJob.perform_later(template, song_ids: song_ids.presence)
    redirect_to songs_path, notice: "File organization started."
  end
end
