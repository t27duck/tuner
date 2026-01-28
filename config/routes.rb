Rails.application.routes.draw do
  resources :songs, except: :new do
    member do
      get :album_art
    end
  end
  resource :sync_status, only: :create, controller: "sync_status"
  resource :bulk_update, only: :update
  resource :organize, only: %i[new create] do
    post :preview, on: :collection
  end

  get "up" => "rails/health#show", as: :rails_health_check

  root "songs#index"
end
