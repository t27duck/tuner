class FoldersController < ApplicationController
  before_action :resolve_path, only: :show

  def index
    @resolved_path = Configuration.music_root
    @breadcrumbs = [ { name: "Music", path: folders_path } ]
    load_directory_contents
    render :show
  end

  def show
    load_directory_contents
  end

  private

  def resolve_path
    relative = params[:id].to_s
    # Strip leading slashes and remove any .. components
    clean_segments = relative.split("/").reject { |s| s.blank? || s == ".." || s == "." }
    clean_relative = clean_segments.join("/")

    @resolved_path = File.join(Configuration.music_root, clean_relative)

    # Verify the resolved path stays within music root
    begin
      real_path = File.realpath(@resolved_path)
      real_root = File.realpath(Configuration.music_root)
    rescue Errno::ENOENT
      raise ActionController::RoutingError, "Not Found"
    end

    unless real_path.start_with?(real_root + "/") || real_path == real_root
      raise ActionController::RoutingError, "Not Found"
    end

    unless File.directory?(@resolved_path)
      raise ActionController::RoutingError, "Not Found"
    end

    # Build breadcrumbs
    @breadcrumbs = [ { name: "Music", path: folders_path } ]
    accumulated = ""
    clean_segments.each do |segment|
      accumulated = accumulated.empty? ? segment : "#{accumulated}/#{segment}"
      @breadcrumbs << { name: segment, path: folder_path(accumulated) }
    end
  end

  def load_directory_contents
    entries = Dir.children(@resolved_path).sort_by { |name| name.downcase }

    @subdirectories = entries
      .reject { |name| name.start_with?(".") }
      .select { |name| File.directory?(File.join(@resolved_path, name)) }
      .map { |name| directory_info(name) }

    mp3_entries = entries.select { |name| name.downcase.end_with?(".mp3") && File.file?(File.join(@resolved_path, name)) }
    full_paths = mp3_entries.map { |name| File.join(@resolved_path, name) }
    songs_by_path = Song.where(file_path: full_paths).index_by(&:file_path)

    @files = mp3_entries.map do |name|
      full_path = File.join(@resolved_path, name)
      { name: name, path: full_path, song: songs_by_path[full_path] }
    end

    @songs = @files.filter_map { |f| f[:song] }
  end

  def directory_info(name)
    path = File.join(@resolved_path, name)
    children = Dir.children(path)
    subfolder_count = children.count { |c| !c.start_with?(".") && File.directory?(File.join(path, c)) }
    file_count = children.count { |c| c.downcase.end_with?(".mp3") && File.file?(File.join(path, c)) }
    { name: name, subfolder_count: subfolder_count, file_count: file_count }
  end
end
