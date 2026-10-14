# Postseason Hit Luck

A static site. Every game you add shows every batted ball with exit velocity, launch angle,
hit probability (Statcast xBA) and a luck percentage for each team.

## Languages

The page comes in English and Traditional Chinese. The button at the top right switches between them,
and the choice is remembered in the visitor's browser. A browser set to Chinese opens in Chinese the first time.
Player names stay in English. Team names, result types, ballparks and series names are translated.
The wording for both languages sits at the top of the script in `public/index.html`.

## How it works

- `games-raw/` holds one Baseball Savant game file per game. This is the only folder you add to.
- On every deploy, Vercel runs `scripts/build-games.js`, which turns those files into small ones in
  `public/games/` and writes the game list the page reads. You never run it yourself.
- `public/` is the site.

## Add a game (no terminal needed)

1. Find the game number. It is the `game_pk` of the game. The numbers for the rest of the 2026
   postseason are already in `games-raw/labels.json`, so the game gets its name (like "NLCS Game 3") automatically.
2. In your browser, open `https://baseballsavant.mlb.com/gf?game_pk=NUMBER` (your number in place of NUMBER).
3. Save the page (Ctrl+S or Cmd+S). Any file name is fine, as long as it ends in `.json`, `.html` or `.txt`.
4. On GitHub, open your repository, go into the `games-raw` folder, choose Add file, then Upload files,
   drop the file in and press Commit changes.
5. Vercel redeploys in about a minute. Reload the site and the game is in the picker.

Games that are not needed (for example an if-necessary game after a series ends) are simply never added.

## Add games from a terminal (optional)

Needs Node 18 or newer. From this folder:

    node scripts/add-game.js 849809 849820
    git add games-raw && git commit -m "Add games" && git push

The first line downloads the games from Baseball Savant into `games-raw/`.

## Look at the site on your own computer

    npm run preview

Then open the address it prints. Opening `public/index.html` by double-clicking will not work,
because the page loads its games over the web.

## First-time Vercel setup

1. Put this folder in a GitHub repository.
2. On vercel.com choose Add New, then Project, and import the repository.
3. Leave every setting as it is. `vercel.json` already tells Vercel what to build and what to publish.

## Remove a game

Delete its file from `games-raw/` on GitHub. The next deploy drops it.
