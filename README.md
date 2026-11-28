# Catch the Coin

*by ChennyZEN*

A small browser arcade game: move your character, collect coins and dodge the bats. You only have one life, and the better you do, the faster the game gets.

**Play it on Itch.io:** https://chennyzen.itch.io/catch-the-coin 

## Controls
- Arrow keys or A / D: move (mouse / touch also supported)
- P or Esc: pause
- Space or Enter: start or restart

## Run locally
Open the project folder in VS Code and launch `index.html` with the Live Server extension.

## Version history 

### v1.7.1
- Player level and XP: every finished run earns XP (shown in the menu and on Game Over)
- 3 daily missions (easy, medium, hard) with a day streak
- History of your last 20 games, with averages and a "Copy data" button
- 10 new achievements (25 in total)
- New Progress screen

### v1.7.0
- Near-miss bonus: pass close to a bat without touching it for points (and extra time in Time Attack)
- Fever: build the bar with coins and near-misses for double points and a stronger magnet
- Biome rules: Night limits your vision, Storm brings wind gusts
- Six hand-designed wave patterns with a guaranteed safe path and a coin trail
- New difficulty curve: a gentler start, then rising pressure and breathers after each wave
- Hit-stop and a shattering death for more impact
- 4 new achievements (15 in total) and new stats
- Saves now have a version number and an automatic backup before migrating

### v1.6.1
- Windows version (.exe): a portable app, no installation needed 
**Windows app (.exe, no installation):** download it from the [Releases](https://github.com/ChennyZEN/catch-the-coin-/releases) page or from itch.io.

### v1.6.0
- Installable app (PWA) with offline play, available on the GitHub Pages version
- Smoother controls: the character now accelerates and brakes softly
- Adaptive quality: fewer effects on slow devices
- New animations for the player, coins, golden coin, bats, power-ups and menus
- "Install app" button in Settings
**Install it as an app (works offline):** https://chennyzen.github.io/catch-the-coin-/

### v1.5.0
- Unlockable character skins with a new Customize screen (Green at 500 total coins, Pink at 1000)
- New "Wardrobe" achievement (11 achievements in total)
- Skins unlocked are shown in Stats and announced in-game
- Main menu: the artwork is back to a single spinning coin

### v1.4.1 
- Cleaner main menu: on-screen controls and credits moved to How to Play and Settings
- New menu artwork showing coins, bats and power-ups
- Removed the byline from the menu title

### v1.4.0
- Game modes: Classic, Daily Challenge, Time Attack and Zen
- Statistics and 10 achievements, saved in your browser
- New How to Play, Stats and Settings screens
- English and Italian interface

### v1.3.0
- Power-ups: shield, coin magnet and slow-mo
- Rare golden coin (worth 5) and a combo multiplier up to x5
- New bats: zig-zag and fast (with a warning mark)
- Stages every 25 coins with themed backgrounds (cave, night, storm) and warning waves that always leave a safe lane
- Game music speeds up slightly with each stage

### v1.2.0
- Game feel: particles, "+1" popups, screen shake and flash on death
- Fairer collisions (smaller hitboxes) and a "safe lane" rule for bat spawns
- Audio: separate music/SFX volumes, M to mute, saved settings, new-record jingle, rising pitch for coin streaks
- 3-2-1 countdown, F for fullscreen, light sprite animations
- Favicon and meta tags

### v1.1.0
- Rebalanced difficulty: faster player and falling objects, more bats
- Interface translated to English
- Updated main menu and cover

### v1.0.0
- First public release

## Roadmap
- An improved HUD, a guided first run and progress export/import

## Feedback
Suggestions and bug reports are welcome on the Itch.io page or through GitHub issues.

## Credits
- Graphics: Kenney.nl (CC0)
- Menu music: "Crystal Cave (song18)" - The Cynic Project / pixelsphere.org (CC0)
- Gameplay music: "Enchanted Tiki 86" - cynicmusic.com (CC0)

## License
The source code is released under the MIT License (see `LICENSE`). Graphics and music are third-party assets; full attributions are in `CREDITS.txt`.
