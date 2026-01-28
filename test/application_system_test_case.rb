require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  if ENV["CAPYBARA_SERVER_PORT"]
    served_by host: "rails-app", port: ENV["CAPYBARA_SERVER_PORT"]

    driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ], options: {
      browser: :remote,
      url: "http://#{ENV.fetch('SELENIUM_HOST', nil)}:4444"
    }
  else
    driven_by :selenium, using: :headless_chrome, screen_size: [ 1400, 1400 ]
  end

  setup do
    @temp_dir = Dir.mktmpdir("system_test_#{Process.pid}_#{Thread.current.object_id}")
    @original_music_root = Configuration.music_root
    Configuration.instance_variable_set(:@music_root, @temp_dir)
  end

  teardown do
    Configuration.instance_variable_set(:@music_root, @original_music_root)
    FileUtils.remove_entry(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
  end

  private

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
      **attrs.slice(:album, :genre, :year, :track_number, :disc_number)
    )
  end
end
