require "test_helper"

class OrganizesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @temp_dir = Dir.mktmpdir("organizes_ctrl_#{Process.pid}_#{Thread.current.object_id}")
    @original_music_root = Configuration.music_root
    Configuration.instance_variable_set(:@music_root, @temp_dir)

    @song = create_test_song("song 1.mp3", "Artist/Album/test.mp3",
      title: "Test Song", artist: "Artist", album: "Album", track_number: 1)
  end

  teardown do
    Configuration.instance_variable_set(:@music_root, @original_music_root)
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  test "new renders organize form" do
    get new_organize_path
    assert_response :success
    assert_select "input[name=template]"
  end

  test "new shows selected song count from session" do
    select_songs(@song)
    get new_organize_path
    assert_response :success
    assert_select "p", text: /1 song\(s\) selected/
  end

  test "select stores song ids in session and redirects to new" do
    post select_organize_path, params: { song_ids: [ @song.id ] }
    assert_redirected_to new_organize_path
  end

  test "select handles string song ids" do
    post select_organize_path, params: { song_ids: [ @song.id.to_s ] }
    assert_redirected_to new_organize_path
  end

  test "preview renders changes table" do
    select_songs(@song)
    post preview_organize_path, params: { template: "<Artist>/<Album>/<Track:2> - <Title>" }

    assert_response :success
    assert_select "table"
  end

  test "preview shows no changes message when paths unchanged" do
    song = create_test_song("song 1.mp3", "Artist/Album/1 - Test Song.mp3",
      title: "Test Song", artist: "Artist", album: "Album", track_number: 1)

    select_songs(song)
    post preview_organize_path, params: { template: "<Artist>/<Album>/<Track> - <Title>" }

    assert_response :success
    assert_select "p", text: /No files would be moved/
  end

  test "create enqueues organize job and redirects" do
    select_songs(@song)
    assert_enqueued_with(job: OrganizeFilesJob) do
      post organize_path, params: { template: "<Artist>/<Album>/<Track:2> - <Title>" }
    end

    assert_redirected_to songs_path
    assert_equal "File organization started.", flash[:notice]
  end

  test "create clears session song ids" do
    select_songs(@song)
    post organize_path, params: { template: "<Artist>/<Album>/<Track:2> - <Title>" }

    follow_redirect!
    assert_nil session[:organize_song_ids]
  end

  test "create without selected songs enqueues job for all songs" do
    assert_enqueued_with(job: OrganizeFilesJob) do
      post organize_path, params: { template: "<Artist>/<Album>/<Title>" }
    end

    assert_redirected_to songs_path
  end

  private

  def select_songs(*songs)
    post select_organize_path, params: { song_ids: songs.map(&:id) }
  end

  def create_test_song(fixture_name, dest_subpath, attrs = {})
    source = Rails.root.join("test/fixtures/files/#{fixture_name}")
    dest = File.join(@temp_dir, dest_subpath)
    FileUtils.mkdir_p(File.dirname(dest))
    FileUtils.cp(source, dest)

    Song.create!(
      title: attrs[:title] || "Test Song",
      artist: attrs[:artist] || "Test Artist",
      file_path: dest,
      file_size: File.size(dest),
      duration: 180,
      **attrs.slice(:album, :genre, :year, :track_number)
    )
  end
end
