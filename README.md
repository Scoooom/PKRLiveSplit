# PKRLiveSplit

A Tampermonkey userscript that integrates [PokeRogue](https://pokerogue.net) with [LiveSplit](https://livesplit.org) for speedrunning.

## How it works

The script polls `window.gameInfo`, an object PokeRogue intentionally exposes for third-party integrations, and sends commands to LiveSplit via WebSocket using the [LiveSplit Server](https://github.com/LiveSplit/LiveSplit.Server) component.

## Setup

### 1. LiveSplit Server
1. Download [LiveSplit Server](https://github.com/LiveSplit/LiveSplit.Server/releases) and place it in your LiveSplit `Components` folder
2. In LiveSplit, right-click → Edit Layout → add **LiveSplit Server**
3. Right-click → Control → **Start Server** before starting your run

### 2. Tampermonkey
1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Click **Raw** on `pokerogue-livesplit.user.js` and Tampermonkey will prompt you to install it
3. Navigate to [pokerogue.net](https://pokerogue.net) — the script activates automatically

## Tracked Modes

| Mode | Tracked |
|------|---------|
| Classic | ✅ |
| Challenge | ✅ |
| Daily Run | ✅ |
| Endless | ❌ |

## Split Points

### Classic & Challenge

| Wave | Event |
|------|-------|
| 1 | ▶ Timer Start |
| 5 | Youngster |
| 8 | Rival 1 |
| 25 | Rival 2 |
| 35 | Evil Team Grunt |
| 55 | Rival 3 |
| 62 | Evil Team Grunt |
| 64 | Evil Team Grunt |
| 66 | Evil Team Admin |
| 95 | Rival 4 |
| 112 | Evil Team Grunt |
| 114 | Evil Team Grunt |
| 115 | Evil Team Boss |
| 145 | Rival 5 |
| 164 | Evil Team Admin |
| 165 | Evil Team Boss |
| 182 | Elite Four 1 |
| 184 | Elite Four 2 |
| 186 | Elite Four 3 |
| 188 | Elite Four 4 |
| 190 | Champion |
| 195 | Rival 6 (Final) |
| 200 | Eternatus (Final Boss) |

### Daily Run

| Wave | Event |
|------|-------|
| 1 | ▶ Timer Start |
| 5 | Trainer |
| 15 | Trainer |
| 25 | Trainer |
| 35 | Trainer |
| 45 | Trainer |
| 50 | Final Boss |

## Configuration

At the top of the script you can adjust:

```js
const CONFIG = {
  livesplitHost: 'localhost',
  livesplitPort: 16834,
  pollIntervalMs: 500,
  reconnectDelayMs: 3000,
  debugLogging: false, // set true for verbose console output
};
```

## Notes

- The timer starts automatically on wave 1 and resets automatically when a new run is detected (via `playTime` dropping)
- Gym leaders are intentionally excluded from splits per the project design
- The script will continuously attempt to reconnect to LiveSplit Server if the connection drops

## Split Files

Pre-made LiveSplit split files are included in the repo:

| File | Mode |
|------|------|
| `classic.lss` | Classic & Challenge |
| `daily.lss` | Daily Run |

To use: open LiveSplit → right-click → **Open Splits** → select the file. The script will automatically advance through the splits as you play.
