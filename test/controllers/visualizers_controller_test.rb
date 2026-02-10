require "test_helper"

class VisualizersControllerTest < ActionDispatch::IntegrationTest
  test "show renders successfully" do
    get visualizer_url
    assert_response :success
  end

  test "show contains canvas element" do
    get visualizer_url
    assert_select "canvas[data-visualizer-target='canvas']"
  end

  test "show contains visualizer controller" do
    get visualizer_url
    assert_select "[data-controller='visualizer']"
  end

  test "show contains mode navigation controls" do
    get visualizer_url
    assert_select "button[data-action='click->visualizer#prevMode']"
    assert_select "span[data-visualizer-target='modeLabel']"
    assert_select "button[data-action='click->visualizer#nextMode']"
  end

  test "show contains close link" do
    get visualizer_url
    assert_select "a[aria-label='Close visualizer']"
  end
end
