// ==UserScript==
// @name         PokeRogue LiveSplit Integration
// @namespace    https://github.com/Scoooom
// @version      1.0.0
// @description  Auto-splits LiveSplit for PokeRogue speedruns via WebSocket
// @author       Scoooom
// @match        https://pokerogue.net/*
// @match        https://*.pokerogue.net/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // CONFIG — edit these if needed
  // ============================================================
  const CONFIG = {
    livesplitHost: 'localhost',
    livesplitPort: 16834,
    pollIntervalMs: 500,
    reconnectDelayMs: 3000,
    // Set to true to log every poll to the console (noisy)
    debugLogging: false,
  };

  // ============================================================
  // SPLIT DEFINITIONS
  // ============================================================

  // Classic & Challenge mode
  const CLASSIC_SPLITS = {
    label: {
      5:   'Youngster',
      8:   'Rival 1',
      25:  'Rival 2',
      35:  'Evil Team Grunt',
      55:  'Rival 3',
      62:  'Evil Team Grunt',
      64:  'Evil Team Grunt',
      66:  'Evil Team Admin',
      95:  'Rival 4',
      112: 'Evil Team Grunt',
      114: 'Evil Team Grunt',
      115: 'Evil Team Boss',
      145: 'Rival 5',
      164: 'Evil Team Admin',
      165: 'Evil Team Boss',
      182: 'Elite Four 1',
      184: 'Elite Four 2',
      186: 'Elite Four 3',
      188: 'Elite Four 4',
      190: 'Champion',
      195: 'Rival 6 (Final)',
      200: 'Eternatus (Final Boss)',
    }
  };
  const CLASSIC_SPLIT_WAVES = new Set(Object.keys(CLASSIC_SPLITS.label).map(Number));

  // Daily Run mode — trainers on waves ending in 5, final boss wave 50
  const DAILY_SPLITS = {
    label: {
      5:  'Trainer Wave 5',
      15: 'Trainer Wave 15',
      25: 'Trainer Wave 25',
      35: 'Trainer Wave 35',
      45: 'Trainer Wave 45',
      50: 'Final Boss (Daily)',
    }
  };
  const DAILY_SPLIT_WAVES = new Set(Object.keys(DAILY_SPLITS.label).map(Number));

  // ============================================================
  // STATE
  // ============================================================
  let ws = null;
  let wsReady = false;

  // Tracks previous poll values to detect transitions
  let prevWave = null;
  let prevPlayTime = null;
  let timerStarted = false;

  // ============================================================
  // LIVESPLIT WEBSOCKET
  // ============================================================
  function connect() {
    const url = `ws://${CONFIG.livesplitHost}:${CONFIG.livesplitPort}`;
    log(`Connecting to LiveSplit Server at ${url}…`);
    ws = new WebSocket(url);

    ws.onopen = () => {
      wsReady = true;
      log('✅ Connected to LiveSplit Server');
    };

    ws.onclose = () => {
      wsReady = false;
      log(`❌ LiveSplit WebSocket closed. Reconnecting in ${CONFIG.reconnectDelayMs}ms…`);
      setTimeout(connect, CONFIG.reconnectDelayMs);
    };

    ws.onerror = (e) => {
      // onclose fires after onerror, so reconnect is handled there
      log('LiveSplit WebSocket error:', e);
    };
  }

  function send(command) {
    if (!wsReady || !ws) {
      log(`⚠️ Cannot send "${command}" — WebSocket not ready`);
      return;
    }
    log(`→ LiveSplit: ${command}`);
    ws.send(command + '\r\n');
  }

  // LiveSplit Server command reference:
  // startTimer  — starts the timer from 0
  // split       — triggers the next split
  // reset       — resets the timer
  // pausegametime / resumegametime — pause/resume IGT if using game time

  // ============================================================
  // SPLIT LOGIC
  // ============================================================
  function getSplitWaves(gameMode) {
    if (!gameMode) return null;
    const mode = gameMode.toLowerCase();
    if (mode === 'daily' || mode === 'daily run') return DAILY_SPLIT_WAVES;
    if (mode === 'classic' || mode === 'challenge') return CLASSIC_SPLIT_WAVES;
    return null;
  }

  function getSplitLabel(gameMode, wave) {
    const mode = (gameMode || '').toLowerCase();
    if (mode === 'daily' || mode === 'daily run') {
      return DAILY_SPLITS.label[wave] || `Wave ${wave}`;
    }
    return CLASSIC_SPLITS.label[wave] || `Wave ${wave}`;
  }

  function onNewWave(gameInfo, wave) {
    const splitWaves = getSplitWaves(gameInfo.gameMode);
    if (!splitWaves) {
      log(`Game mode "${gameInfo.gameMode}" not tracked — skipping`);
      return;
    }

    if (wave === 1 && !timerStarted) {
      log('Wave 1 detected — starting timer');
      send('startTimer');
      timerStarted = true;
      return;
    }

    if (splitWaves.has(wave)) {
      const label = getSplitLabel(gameInfo.gameMode, wave);
      log(`Split: Wave ${wave} — ${label}`);
      send('split');
    }
  }

  function onRunReset() {
    log('New run detected (playTime reset) — resetting LiveSplit timer');
    send('reset');
    timerStarted = false;
    prevWave = null;
  }

  // ============================================================
  // POLL LOOP
  // ============================================================
  function poll() {
    const gameInfo = window.gameInfo;

    if (!gameInfo) {
      debugLog('window.gameInfo not available yet');
      return;
    }

    const { wave, playTime, gameMode } = gameInfo;

    if (typeof wave !== 'number' || typeof playTime !== 'number') {
      debugLog('gameInfo missing wave or playTime');
      return;
    }

    // Detect run reset: playTime dropped significantly (new run started)
    if (prevPlayTime !== null && playTime < prevPlayTime - 10) {
      onRunReset();
    }

    // Detect wave transition (wave number increased)
    if (prevWave !== null && wave !== prevWave && wave > 0) {
      onNewWave(gameInfo, wave);
    }

    // First poll — bootstrap state without triggering splits
    if (prevWave === null) {
      log(`PokeRogue detected — Mode: ${gameMode}, Wave: ${wave}`);
    }

    prevWave = wave;
    prevPlayTime = playTime;
  }

  // ============================================================
  // LOGGING
  // ============================================================
  function log(...args) {
    console.log('[PokeRogue LiveSplit]', ...args);
  }

  function debugLog(...args) {
    if (CONFIG.debugLogging) {
      console.debug('[PokeRogue LiveSplit DEBUG]', ...args);
    }
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    log('PokeRogue LiveSplit Integration v1.0.0 loaded');
    log('Tracked modes: Classic, Challenge, Daily Run');
    log(`Polling every ${CONFIG.pollIntervalMs}ms`);
    connect();
    setInterval(poll, CONFIG.pollIntervalMs);
  }

  // Wait for page to be ready before starting
  if (document.readyState === 'complete') {
    init();
  } else {
    window.addEventListener('load', init);
  }
})();
