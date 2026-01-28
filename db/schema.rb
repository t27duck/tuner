# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_01_27_231717) do
  create_table "songs", force: :cascade do |t|
    t.string "album"
    t.string "artist"
    t.datetime "created_at", null: false
    t.integer "disc_number"
    t.integer "duration"
    t.string "file_path"
    t.integer "file_size"
    t.string "genre"
    t.string "title"
    t.integer "track_number"
    t.datetime "updated_at", null: false
    t.integer "year"
    t.index ["album"], name: "index_songs_on_album"
    t.index ["artist"], name: "index_songs_on_artist"
    t.index ["file_path"], name: "index_songs_on_file_path", unique: true
    t.index ["genre"], name: "index_songs_on_genre"
  end
end
