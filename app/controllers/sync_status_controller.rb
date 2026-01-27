class SyncStatusController < ApplicationController
  def create
    SyncLibraryJob.perform_later
    redirect_to songs_path, notice: "Sync started."
  end
end
