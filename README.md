# Postseason Hit Luck

A static site. Every game shows every batted ball with exit velocity, launch angle,
hit probability (Statcast xBA) and a luck percentage for each team. English and Traditional Chinese.

## How games get onto the site

Games are added automatically.

- `.github/workflows/sync-games.yml` runs on GitHub every 3 hours.
- It runs `scripts/sync-postseason.js`, which reads MLB's schedule, downloads every finished
  2026 postseason game (Wild Card, Division Series, League Championship Series and World Series)
  from Baseball Savant, and saves a small file for each one in `games-raw/`.
- Each new file is committed, Vercel sees the commit and redeploys, and the game shows up in the picker.
- Games that are not played (an if-necessary game after a series ends) are never added.

To fetch games right now: on GitHub open the Actions tab, choose "Sync postseason games",
then Run workflow. On the first run it fills in every game played so far.

If Vercel says a deployment was blocked, open the project settings on vercel.com and check the Git settings.
The sync commits are made under the repository owner's name so that Vercel accepts them.

## Add one game by hand

Open `https://baseballsavant.mlb.com/gf?game_pk=NUMBER` in a browser, save the page, and put the file in `games-raw/`
(any name ending in `.json`, `.html` or `.txt`; large files are fine). Or send the file to Claude to add.
Names like "NLCS Game 3" come from `games-raw/labels.json`.

## Languages

The button at the top right switches between English and Traditional Chinese, and the choice is remembered.
A browser set to Chinese opens in Chinese the first time. Player names stay in English.
The wording for both languages is at the top of the script in `public/index.html`.

## Files

- `games-raw/`: one small file per game. This is the only folder that holds game data.
- `scripts/build-games.js`: Vercel runs this on every deploy. It turns `games-raw/` into `public/games/`.
- `scripts/sync-postseason.js`, `scripts/add-game.js`, `scripts/slim.js`: the download scripts.
- `public/`: the site.

## Look at the site on a computer

Needs Node 18 or newer.

    npm run preview

Then open the address it prints. Double-clicking `public/index.html` does not work,
because the page loads its games over the web.

## First-time Vercel setup

On vercel.com choose Add New, then Project, import this repository and leave every setting as it is.
`vercel.json` already tells Vercel what to build and what to publish.
