# Tuner

Tuner is a Rails-based comprehensive MP3 manager.

The library defaults to `storage/music` but can be overridden using the `MUSIC_ROOT` environment variable.

This app is my first attempt at (near) fully vibe coding an app. It's meant to be a single user, personal app. I have no delusions of this being 100% stable for use by the masses.

## Setup

- Install Ruby as defined in `.ruby_version`
- Install dependencies with `$ bundle install`
- Initialize the database with `$ rails db:setup`

## Running the app

- Run `bin/dev` and access the app at `http://localhost:3000`
