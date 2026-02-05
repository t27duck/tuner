class AlbumsController < ApplicationController
  UNKNOWN_SENTINEL = "_unknown"
  PER_PAGE = 24

  def index
    base = Song.select(
      "COALESCE(NULLIF(album, ''), 'Unknown Album') AS album_name",
      "COUNT(*) AS song_count",
      "GROUP_CONCAT(DISTINCT artist) AS artist_list",
      "MIN(id) AS representative_song_id"
    ).group("COALESCE(NULLIF(album, ''), 'Unknown Album')")

    if params[:q].present?
      base = base.having("album_name LIKE ?", "%#{Song.sanitize_sql_like(params[:q])}%")
    end

    results = base.order("album_name ASC")
    @albums = Kaminari.paginate_array(results.to_a).page(params[:page]).per(PER_PAGE)
  end

  def show
    if params[:id] == UNKNOWN_SENTINEL
      @album_name = "Unknown Album"
      @songs = Song.where(album: [nil, ""]).order(:disc_number, :track_number, :title)
    else
      @album_name = params[:id]
      @songs = Song.where(album: @album_name).order(:disc_number, :track_number, :title)
    end

    @artists = @songs.pluck(:artist).compact_blank.uniq
    @representative_song = @songs.first
    @song_count = @songs.size
  end
end
