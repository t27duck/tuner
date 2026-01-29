require "test_helper"

class SyncStatusControllerTest < ActionDispatch::IntegrationTest
  test "create enqueues sync library job and redirects" do
    assert_enqueued_with(job: SyncLibraryJob) do
      post sync_status_path
    end

    assert_redirected_to songs_path
    assert_equal "Sync started.", flash[:notice]
  end
end
