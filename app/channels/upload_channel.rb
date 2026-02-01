class UploadChannel < ApplicationCable::Channel
  def subscribed
    stream_from "upload_status"
  end
end
