// DOM refs
const refs = {
    scores: [null,
      document.getElementById('score1'),
      document.getElementById('score2')
    ],
    serves: [null,
      document.getElementById('serve1'),
      document.getElementById('serve2')
    ],
    names: [null,
      document.getElementById('name1'),
      document.getElementById('name2')
    ],
    statsNames: [null,
      document.getElementById('stats-name1'),
      document.getElementById('stats-name2')
    ],
    wins: [null,
      document.getElementById('wins1'),
      document.getElementById('wins2')
    ],
    pointsScored: [null,
      document.getElementById('points1'),
      document.getElementById('points2')
    ],
    addBtns: document.querySelectorAll('.add-score'),
    undoBtn: document.getElementById('undo'),
    resetBtn: document.getElementById('reset'),
    mode11Btn: document.getElementById('mode-11'),
    mode21Btn: document.getElementById('mode-21'),
    serves2Btn: document.getElementById('serves-2'),
    serves3Btn: document.getElementById('serves-3'),
    serves5Btn: document.getElementById('serves-5'),
    themeToggle: document.getElementById('theme-toggle'),
    soundToggle: document.getElementById('sound-toggle'),
    musicToggle: document.getElementById('music-toggle'),
    musicPanel: document.getElementById('music-panel'),
    musicBtns: document.querySelectorAll('.music-btn'),
    statsToggle: document.getElementById('stats-toggle'),
    statsPanel: document.querySelector('.stats-panel'),
    closeStats: document.getElementById('close-stats'),
    winnerModal: document.getElementById('winner-modal'),
    winnerName: document.getElementById('winner-name'),
    finalScore1: document.getElementById('final-score1'),
    finalScore2: document.getElementById('final-score2'),
    newMatchBtn: document.getElementById('new-match'),
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history')
  };
  
  // App state
  const state = {
    matchPoint: parseInt(localStorage.getItem('pp_match')) || 21,
    history: [],
    stats: {
      1: { wins: 0, points: 0, name: 'Player 1' },
      2: { wins: 0, points: 0, name: 'Player 2' }
    },
    matches: [],
    currentServer: 1,
    servesPerPlayer: parseInt(localStorage.getItem('pp_serves')) || 2,
    soundMuted: localStorage.getItem('pp_muted') === 'true',
    musicTrack: localStorage.getItem('pp_music_track') || 'off'
  };

  // Audio: synthesized sound effects
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTone(freq, duration, delay = 0, volume = 0.2, type = 'sine') {
    if (state.soundMuted) return;
    const ctx = getAudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.value = freq;
    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(volume, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // A soft paddle "tock" when a point is scored - a quick downward
  // pitch glide reads as a percussive knock rather than a beep
  function playPointSound() {
    if (state.soundMuted) return;
    const ctx = getAudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'triangle';
    const startTime = ctx.currentTime;
    const duration = 0.08;
    oscillator.frequency.setValueAtTime(320, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(120, startTime + duration);
    gainNode.gain.setValueAtTime(0.12, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // A short ascending chime when a match is won
  function playWinSound() {
    playTone(523.25, 0.15, 0);
    playTone(659.25, 0.15, 0.15);
    playTone(783.99, 0.35, 0.3);
  }

  // Update sound toggle button state
  function updateSoundButton() {
    refs.soundToggle.classList.toggle('muted', state.soundMuted);
  }

  // Update music track selector buttons and the header icon's active state
  function updateMusicButtons() {
    refs.musicBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.track === state.musicTrack);
    });
    refs.musicToggle.classList.toggle('active', state.musicTrack !== 'off');
  }

  // Switch the background music track (or turn it off)
  function changeMusicTrack(track) {
    if (state.musicTrack === track) return;
    state.musicTrack = track;
    localStorage.setItem('pp_music_track', track);
    updateMusicButtons();
    stopMusic();
    startMusic();
  }

  // Open/close the collapsible background music popover
  function toggleMusicPanel(open) {
    const shouldOpen = open !== undefined ? open : !refs.musicPanel.classList.contains('open');
    refs.musicPanel.classList.toggle('open', shouldOpen);
    refs.musicToggle.setAttribute('aria-expanded', shouldOpen);
  }

  // Procedural background music - four looping tracks synthesized with the

  // Short percussive/melodic note - used by the arcade, funky and synth tracks
  function playMelodicNote(freq, type, duration, volume) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    const attack = Math.min(0.015, duration * 0.3);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  // Sustained pad chord - used by the chill track
  function playPadChord(freqs, duration) {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const chordGain = ctx.createGain();
    chordGain.connect(ctx.destination);
    chordGain.gain.setValueAtTime(0, now);
    chordGain.gain.linearRampToValueAtTime(0.045, now + 1.2);
    chordGain.gain.setValueAtTime(0.045, now + duration - 1.2);
    chordGain.gain.linearRampToValueAtTime(0, now + duration);

    freqs.forEach(freq => {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      oscillator.connect(chordGain);
      oscillator.start(now);
      oscillator.stop(now + duration);
    });
  }

  let musicTimerId = null;
  let musicGeneration = 0;

  // Arcade: bouncy 8-bit melody with a steady bass thump
  const arcadeLead = [
    523.25, 659.25, 783.99, 659.25, 523.25, 659.25, 783.99, 1046.50,
    783.99, 659.25, 523.25, 659.25, 783.99, 659.25, 587.33, 0
  ];
  const arcadeStep = 0.15;

  function scheduleArcadeLoop(generation, step) {
    if (generation !== musicGeneration) return;
    const note = arcadeLead[step % arcadeLead.length];
    if (note) playMelodicNote(note, 'square', 0.12, 0.05);
    if (step % 4 === 0) playMelodicNote(130.81, 'square', 0.13, 0.05);
    musicTimerId = setTimeout(() => scheduleArcadeLoop(generation, step + 1), arcadeStep * 1000);
  }

  // Funky: syncopated bass groove with chord stabs
  const funkyBass = [
    98.00, 0, 98.00, 116.54, 0, 98.00, 0, 130.81,
    98.00, 0, 98.00, 116.54, 0, 98.00, 0, 0
  ];
  const funkyStabs = { 3: [293.66, 349.23, 440.00], 11: [293.66, 349.23, 440.00] };
  const funkyStep = 0.22;

  function scheduleFunkyLoop(generation, step) {
    if (generation !== musicGeneration) return;
    const idx = step % funkyBass.length;
    const bassNote = funkyBass[idx];
    if (bassNote) playMelodicNote(bassNote, 'sawtooth', 0.18, 0.06);
    const stab = funkyStabs[idx];
    if (stab) stab.forEach(freq => playMelodicNote(freq, 'triangle', 0.15, 0.035));
    musicTimerId = setTimeout(() => scheduleFunkyLoop(generation, step + 1), funkyStep * 1000);
  }

  // Synth: driving retro arpeggio over a four-chord progression
  const synthChords = [
    [220.00, 261.63, 329.63, 440.00], // Am
    [174.61, 220.00, 261.63, 349.23], // F
    [261.63, 329.63, 392.00, 523.25], // C
    [196.00, 246.94, 293.66, 392.00]  // G
  ];
  const synthStep = 0.14;

  function scheduleSynthLoop(generation, step) {
    if (generation !== musicGeneration) return;
    const chord = synthChords[Math.floor(step / 8) % synthChords.length];
    const beat = step % 8;
    const noteIndex = beat < 4 ? beat : 7 - beat;
    playMelodicNote(chord[noteIndex], 'sawtooth', 0.13, 0.04);
    musicTimerId = setTimeout(() => scheduleSynthLoop(generation, step + 1), synthStep * 1000);
  }

  // Chill: slow, mellow four-chord pad loop
  const chillChords = [
    [220.00, 261.63, 329.63], // Am
    [174.61, 220.00, 261.63], // F
    [261.63, 329.63, 392.00], // C
    [196.00, 246.94, 293.66]  // G
  ];
  const chillStep = 4.5;

  function scheduleChillLoop(generation, step) {
    if (generation !== musicGeneration) return;
    playPadChord(chillChords[step % chillChords.length], chillStep);
    musicTimerId = setTimeout(() => scheduleChillLoop(generation, step + 1), chillStep * 1000);
  }

  function startMusic() {
    if (state.soundMuted || state.musicTrack === 'off') return;
    musicGeneration++;
    const generation = musicGeneration;
    if (state.musicTrack === 'arcade') scheduleArcadeLoop(generation, 0);
    else if (state.musicTrack === 'funky') scheduleFunkyLoop(generation, 0);
    else if (state.musicTrack === 'synth') scheduleSynthLoop(generation, 0);
    else if (state.musicTrack === 'chill') scheduleChillLoop(generation, 0);
  }

  function stopMusic() {
    musicGeneration++; // invalidates any pending scheduled note
    if (musicTimerId) {
      clearTimeout(musicTimerId);
      musicTimerId = null;
    }
  }

  // Browsers block audio until a user gesture; if a track was left selected
  // from a previous session, start it as soon as the user interacts with the page
  function tryAutoStartMusic() {
    if (state.musicTrack === 'off' || state.soundMuted) return;
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      const resumeAndStart = () => {
        ctx.resume().then(startMusic);
        document.removeEventListener('click', resumeAndStart);
      };
      document.addEventListener('click', resumeAndStart, { once: true });
    } else {
      startMusic();
    }
  }

  // Load saved data
  function loadSavedData() {
    // Load theme
    const savedTheme = localStorage.getItem('pp_theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-theme');
    }
  
    // Load match point setting
    state.matchPoint = parseInt(localStorage.getItem('pp_match')) || 21;
    updateModeButtons();
    
    // Load serves per player setting
    state.servesPerPlayer = parseInt(localStorage.getItem('pp_serves')) || 2;
    updateServesButtons();
    
    // Load player names
    const savedNames = JSON.parse(localStorage.getItem('pp_names'));
    if (savedNames) {
      refs.names[1].textContent = savedNames[1];
      refs.names[2].textContent = savedNames[2];
      refs.statsNames[1].textContent = savedNames[1];
      refs.statsNames[2].textContent = savedNames[2];
      state.stats[1].name = savedNames[1];
      state.stats[2].name = savedNames[2];
    }
    
    // Load match history
    const savedMatches = JSON.parse(localStorage.getItem('pp_matches'));
    if (savedMatches && Array.isArray(savedMatches)) {
      state.matches = savedMatches;
      renderMatchHistory();
    }
    
    // Load player stats
    const savedStats = JSON.parse(localStorage.getItem('pp_stats'));
    if (savedStats) {
      state.stats = savedStats;
      updateStatsDisplay();
    }
    
    // Set initial server indicator
    updateServeIndicator();

    // Set initial sound button state
    updateSoundButton();

    // Set initial music button state and try to resume music from last session
    updateMusicButtons();
    tryAutoStartMusic();
  }
  
  // Update game mode buttons
  function updateModeButtons() {
    const activePoint = state.matchPoint;
    refs.mode11Btn.classList.toggle('active', activePoint === 11);
    refs.mode21Btn.classList.toggle('active', activePoint === 21);
  }

  // Change the game mode (points to win). Only resets the current game if
  // either player's score would already be at or past the new target.
  function changeGameMode(newPoint) {
    if (state.matchPoint === newPoint) return;

    const needsReset = getScore(1) >= newPoint || getScore(2) >= newPoint;

    if (needsReset && !confirm(`Change game mode to ${newPoint} points? Current scores exceed that target, so the game will be reset.`)) {
      return;
    }

    state.matchPoint = newPoint;
    localStorage.setItem('pp_match', newPoint);
    updateModeButtons();

    if (needsReset) {
      reset();
    } else {
      calculateNextServer();
    }
  }

  // Update serves buttons
  function updateServesButtons() {
    const activeServes = state.servesPerPlayer;
    refs.serves2Btn.classList.toggle('active', activeServes === 2);
    refs.serves3Btn.classList.toggle('active', activeServes === 3);
    refs.serves5Btn.classList.toggle('active', activeServes === 5);
  }
  
  // Save player names
  function saveNames() {
    const names = {
      1: refs.names[1].textContent,
      2: refs.names[2].textContent
    };
    localStorage.setItem('pp_names', JSON.stringify(names));
  }
  
  // Save stats
  function saveStats() {
    localStorage.setItem('pp_stats', JSON.stringify(state.stats));
  }
  
  // Save match history
  function saveMatches() {
    localStorage.setItem('pp_matches', JSON.stringify(state.matches));
  }
  
  // Update stats display
  function updateStatsDisplay() {
    refs.wins[1].textContent = state.stats[1].wins;
    refs.wins[2].textContent = state.stats[2].wins;
    refs.pointsScored[1].textContent = state.stats[1].points;
    refs.pointsScored[2].textContent = state.stats[2].points;
    refs.statsNames[1].textContent = state.stats[1].name;
    refs.statsNames[2].textContent = state.stats[2].name;
  }
  
  // Render match history
  function renderMatchHistory() {
    refs.historyList.innerHTML = '';
    
    // Take last 5 matches
    const recentMatches = state.matches.slice(-5).reverse();
    
    if (recentMatches.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = 'No matches yet';
      refs.historyList.appendChild(emptyItem);
      return;
    }
    
    recentMatches.forEach(match => {
      const item = document.createElement('li');
      const winner = match.winner === 1 ? state.stats[1].name : state.stats[2].name;
      
      item.innerHTML = `
        <div class="winner">${winner} won</div>
        <div>${state.stats[1].name} (${match.score1}) - (${match.score2}) ${state.stats[2].name}</div>
      `;
      
      refs.historyList.appendChild(item);
    });
  }
  
  // Update serve indicator
  function updateServeIndicator() {
    refs.serves[1].classList.toggle('active', state.currentServer === 1);
    refs.serves[2].classList.toggle('active', state.currentServer === 2);
  }
  
  // Calculate next server
  function calculateNextServer() {
    const totalScore = getScore(1) + getScore(2);
    
    // In endgame situations (deuce/advantage)
    if ((state.matchPoint === 21 && getScore(1) >= 20 && getScore(2) >= 20) || 
        (state.matchPoint === 11 && getScore(1) >= 10 && getScore(2) >= 10)) {
      // Switch server every point in endgame
      state.currentServer = (totalScore % 2 === 0) ? 1 : 2;
    } else {
      // Use the servesPerPlayer value for normal play
      state.currentServer = (Math.floor(totalScore / state.servesPerPlayer) % 2 === 0) ? 1 : 2;
    }
    
    updateServeIndicator();
  }
  
  // Get score for player
  function getScore(player) {
    return parseInt(refs.scores[player].textContent);
  }
  
  // Set score for player
  function setScore(player, value) {
    refs.scores[player].textContent = value;
  }
  
  // Add score for player
  function addScore(player) {
    // Get current scores
    let sc = getScore(player);
    
    // Save current state to history
    state.history.push({
      player1: getScore(1),
      player2: getScore(2),
      lastScorer: player
    });
    
    // Increment score
    sc++;
    setScore(player, sc);
    
    // Update statistics
    state.stats[player].points++;

    // Play point sound
    playPointSound();

    // Add the pulse animation
    refs.scores[player].classList.add('pulse');
    setTimeout(() => refs.scores[player].classList.remove('pulse'), 400);
    
    // Update serve indicator
    calculateNextServer();
    
    // Save state
    saveStats();
    
    // Check for win condition
    checkWinCondition();
  }
  
  // Check if someone won
  function checkWinCondition() {
    const score1 = getScore(1);
    const score2 = getScore(2);
    const minWinScore = state.matchPoint;
    
    // Win by 2 points
    if ((score1 >= minWinScore && score1 >= score2 + 2) || 
        (score2 >= minWinScore && score2 >= score1 + 2)) {
      // Determine winner
      const winner = score1 > score2 ? 1 : 2;
      
      // Update stats
      state.stats[winner].wins++;
      
      // Record match
      state.matches.push({
        date: new Date().toISOString(),
        winner: winner,
        score1: score1,
        score2: score2
      });
      
      // Save stats and matches
      saveStats();
      saveMatches();
      
      // Play win sound
      playWinSound();

      // Show winner
      showWinner(winner, score1, score2);

      // Fire confetti
      setTimeout(fireConfetti, 300);
    }
  }
  
  // Show winner modal
  function showWinner(winner, score1, score2) {
    // Set the content
    refs.winnerName.textContent = state.stats[winner].name;
    refs.finalScore1.textContent = score1;
    refs.finalScore2.textContent = score2;
    
    // Show the modal
    refs.winnerModal.classList.add('active');
  }
  
  // Undo last action
  function undo() {
    if (state.history.length === 0) {
      return;
    }
    
    const lastState = state.history.pop();
    
    // Restore scores
    setScore(1, lastState.player1);
    setScore(2, lastState.player2);
    
    // Decrement the point counter for the last scorer
    state.stats[lastState.lastScorer].points--;
    
    // Update serve indicator
    calculateNextServer();
    
    // Save stats
    saveStats();
  }
  
  // Reset the game
  function reset() {
    // Clear scores
    setScore(1, 0);
    setScore(2, 0);
    
    // Clear history for current game
    state.history = [];
    
    // Reset server
    state.currentServer = 1;
    updateServeIndicator();
  }
  
  // Enhanced confetti effect
  function fireConfetti() {
    const confettiCanvas = document.getElementById('confetti-canvas');
    const myConfetti = confetti.create(confettiCanvas, { resize: true });
    
    // First wave - explosion
    myConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    // Second wave - from sides
    setTimeout(() => {
      myConfetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      
      myConfetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 250);
  }
  
  // Initialize the app
  function init() {
    // Load data
    loadSavedData();
    
    // Set up event listeners
    refs.addBtns.forEach(btn =>
      btn.addEventListener('click', () => addScore(+btn.dataset.player))
    );
    
    refs.undoBtn.addEventListener('click', undo);
    refs.resetBtn.addEventListener('click', () => {
      if (confirm('Reset the current game?')) {
        reset();
      }
    });
    
    // Game mode buttons
    refs.mode11Btn.addEventListener('click', () => changeGameMode(11));
    refs.mode21Btn.addEventListener('click', () => changeGameMode(21));
    
    // Serves per player buttons
    refs.serves2Btn.addEventListener('click', () => {
      state.servesPerPlayer = 2;
      localStorage.setItem('pp_serves', 2);
      updateServesButtons();
      calculateNextServer(); // Update the current server based on new serves setting
    });
    
    refs.serves3Btn.addEventListener('click', () => {
      state.servesPerPlayer = 3;
      localStorage.setItem('pp_serves', 3);
      updateServesButtons();
      calculateNextServer(); // Update the current server based on new serves setting
    });
    
    refs.serves5Btn.addEventListener('click', () => {
      state.servesPerPlayer = 5;
      localStorage.setItem('pp_serves', 5);
      updateServesButtons();
      calculateNextServer(); // Update the current server based on new serves setting
    });
    
    // Theme toggle
    refs.themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      localStorage.setItem('pp_theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    });

    // Sound toggle
    refs.soundToggle.addEventListener('click', () => {
      state.soundMuted = !state.soundMuted;
      localStorage.setItem('pp_muted', state.soundMuted);
      updateSoundButton();
      if (state.soundMuted) {
        stopMusic();
      } else {
        startMusic();
      }
    });

    // Music toggle - opens/closes the collapsible track picker
    refs.musicToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMusicPanel();
    });

    // Don't let clicks inside the panel bubble up and close it immediately
    refs.musicPanel.addEventListener('click', (e) => e.stopPropagation());

    // Close the panel on any outside click
    document.addEventListener('click', () => toggleMusicPanel(false));

    // Close the panel on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleMusicPanel(false);
    });

    // Music track selector - picking a track also collapses the panel
    refs.musicBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        changeMusicTrack(btn.dataset.track);
        toggleMusicPanel(false);
      });
    });

    // Stats panel
    refs.statsToggle.addEventListener('click', () => {
      refs.statsPanel.classList.toggle('active');
      updateStatsDisplay();
      renderMatchHistory();
    });
    
    refs.closeStats.addEventListener('click', () => {
      refs.statsPanel.classList.remove('active');
    });
    
    // Editable player names
    refs.names.forEach((el, index) => {
      if (!el) return;
      
      el.addEventListener('click', () => {
        const newName = prompt('Player name:', el.textContent);
        if (newName && newName.trim()) {
          el.textContent = newName.trim();
          refs.statsNames[index].textContent = newName.trim();
          state.stats[index].name = newName.trim();
          saveNames();
          saveStats();
        }
      });
    });
    
    // Winner modal
    refs.newMatchBtn.addEventListener('click', () => {
      refs.winnerModal.classList.remove('active');
      reset();
    });
    
    // Clear history
    refs.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all match history and stats?')) {
        state.matches = [];
        state.stats[1].wins = 0;
        state.stats[1].points = 0;
        state.stats[2].wins = 0;
        state.stats[2].points = 0;
        saveMatches();
        saveStats();
        renderMatchHistory();
        updateStatsDisplay();
      }
    });
  }
  
  // Start the app
  document.addEventListener('DOMContentLoaded', init);