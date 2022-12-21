# enstars/makotools-data-sync

Github action for purposes of automating data from google sheets -> JSON files in our data repos.

This used to be a fork of https://github.com/rjoydip-zz/googlesheet-actions, but with the specificality we decided to move it to its own repo. Anyone is free to fork this as well, as it can be useful in syncing Google Sheets data to GitHub Actions in a JSON format.

Forked/written by @kamishirorui. He doesn't know how to properly write tests so tests have been removed from the repo for now :,)

## Development

Use command `npm run build-pack && npx ts-node dist/index.js` to run and test the script.