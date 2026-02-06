Rails.application.routes.draw do
  resources :songs, except: :new do
    member do
      get :album_art
      get :stream
    end
  end
  resource :sync_status, only: :create, controller: "sync_status"
  resource :bulk_update, only: :update
  resource :upload, only: %i[new create]
  resource :organize, only: %i[new create] do
    collection do
      post :select
      post :preview
    end
  end

  resources :albums, only: [ :index, :show ], id: /.+/
  resources :artists, only: [ :index, :show ], id: /.+/
  resources :folders, only: [ :index, :show ], id: /.+/

  resources :playlists do
    member do
      patch :reorder
      delete :remove_song
    end
  end
  resource :playlist_additions, only: :create

  get "up" => "rails/health#show", as: :rails_health_check

  root "songs#index"
end
