class CreatePlaylists < ActiveRecord::Migration[8.1]
  def change
    create_table :playlists do |t|
      t.string :name, null: false
      t.text :description

      t.timestamps
    end
  end
end
