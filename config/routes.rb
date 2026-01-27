Rails.application.routes.draw do
  resources :songs, except: :new do
    member do
      get :album_art
    end
  end
  resource :sync_status, only: :create

  get "up" => "rails/health#show", as: :rails_health_check

  root "songs#index"
end
