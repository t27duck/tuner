class ArtistsController < ApplicationController
  UNKNOWN_SENTINEL = "_unknown"
  PER_PAGE = 24

  def index
    base = Song.select(
      "COALESCE(NULLIF(artist, ''), 'Unknown Artist') AS artist_name",
      "COUNT(*) AS song_count",
      "COUNT(DISTINCT NULLIF(album, '')) AS album_count",
      "MIN(id) AS representative_song_id"
    ).group("COALESCE(NULLIF(artist, ''), 'Unknown Artist')")

    if params[:q].present?
      base = base.having("artist_name LIKE ?", "%#{Song.sanitize_sql_like(params[:q])}%")
    end

    results = base.order("artist_name ASC")
    @artists = Kaminari.paginate_array(results.to_a).page(params[:page]).per(PER_PAGE)
  end

  def show
    if params[:id] == UNKNOWN_SENTINEL
      @artist_name = "Unknown Artist"
      @songs = Song.where(artist: [nil, ""]).order(:album, :disc_number, :track_number, :title)
    else
      @artist_name = params[:id]
      @songs = Song.where(artist: @artist_name).order(:album, :disc_number, :track_number, :title)
    end

    @albums_with_songs = @songs.group_by { |s| s.album.presence || "Unknown Album" }
    @album_count = @albums_with_songs.keys.size
    @song_count = @songs.size
    @representative_song = @songs.first
  end
end
