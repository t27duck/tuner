class CreateSongs < ActiveRecord::Migration[8.1]
  def change
    create_table :songs do |t|
      t.string :title
      t.string :artist
      t.string :album
      t.string :genre
      t.integer :year
      t.integer :track_number
      t.integer :disc_number
      t.string :file_path
      t.integer :file_size
      t.integer :duration

      t.timestamps
    end

    add_index :songs, :file_path, unique: true
    add_index :songs, :artist
    add_index :songs, :album
    add_index :songs, :genre
  end
end
