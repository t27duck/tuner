class Song < ApplicationRecord
  validates :file_path, presence: true, uniqueness: true

  def self.ransackable_attributes(auth_object = nil)
    %w[title artist album genre year track_number disc_number file_path]
  end

  def self.ransackable_associations(auth_object = nil)
    []
  end
end
