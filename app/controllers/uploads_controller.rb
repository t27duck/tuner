class UploadsController < ApplicationController
  include Mp3MetadataExtractor

  skip_forgery_protection only: :create

  def new
  end

  def create
    file = params[:file]
    relative_path = params[:relative_path].to_s

    unless file.present?
      render json: { error: "No file provided" }, status: :unprocessable_entity
      return
    end

    unless file.original_filename.to_s.downcase.end_with?(".mp3")
      render json: { error: "Only MP3 files are accepted" }, status: :unprocessable_entity
      return
    end

    # Sanitize relative_path to prevent path traversal
    relative_path = relative_path.gsub("..", "").gsub(/\A\//, "").strip
    relative_path = file.original_filename if relative_path.blank?

    new_dir = File.join(Configuration.music_root, "_NEW")
    FileUtils.mkdir_p(new_dir)

    dest = File.join(new_dir, relative_path)

    # Verify destination is still under new_dir
    FileUtils.mkdir_p(File.dirname(dest))
    unless File.realpath(File.dirname(dest)).start_with?(File.realpath(new_dir))
      render json: { error: "Invalid path" }, status: :unprocessable_entity
      return
    end

    File.open(dest, "wb") { |f| f.write(file.read) }

    tags = extract_tags(dest)
    attrs = {
      file_size: File.size(dest),
      title: tags[:title].presence || File.basename(dest, ".mp3"),
      artist: tags[:artist],
      album: tags[:album],
      genre: tags[:genre],
      year: tags[:year],
      track_number: tags[:track_number],
      disc_number: tags[:disc_number],
      duration: tags[:duration]
    }

    song = Song.find_or_initialize_by(file_path: dest)
    song.assign_attributes(attrs)
    song.save!

    ActionCable.server.broadcast("upload_status", {
      status: "uploaded",
      message: "Uploaded #{relative_path}",
      file_path: relative_path
    })

    render json: { message: "Uploaded #{relative_path}", song_id: song.id }, status: :ok
  end
end
