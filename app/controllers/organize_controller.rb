class OrganizeController < ApplicationController
  def new
  end

  def preview
    @template = params[:template]
    @changes = OrganizeFilesJob.preview(@template)
  end

  def create
    template = params[:template]
    OrganizeFilesJob.perform_later(template)
    redirect_to songs_path, notice: "File organization started."
  end
end
