class PlaylistAdditionsController < ApplicationController
  def create
    if params[:new_playlist_name].present?
      playlist = Playlist.create!(name: params[:new_playlist_name])
    else
      playlist = Playlist.find(params[:playlist_id])
    end

    song_ids = Array(params[:song_ids])
    added = 0
    skipped = 0
    song_ids.each do |song_id|
      song = Song.find_by(id: song_id)
      next unless song
      if playlist.playlist_songs.exists?(song: song)
        skipped += 1
      else
        playlist.add_song(song)
        added += 1
      end
    end

    message = if added > 0 && skipped > 0
      "#{added} #{"song".pluralize(added)} added to #{playlist.name}. #{skipped} already in playlist."
    elsif added > 0
      "#{added} #{"song".pluralize(added)} added to #{playlist.name}."
    else
      "#{"Song".pluralize(skipped)} already in #{playlist.name}."
    end

    respond_to do |format|
      format.html { redirect_back fallback_location: playlists_path, notice: message }
      format.json { render json: { added: added, skipped: skipped, playlist_id: playlist.id, playlist_name: playlist.name, message: message } }
    end
  end
end
