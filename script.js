'use strict';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const methodNames = ['Ground Truth', 'ReCoSplat (official)', 'ReCoSplat (adapted)', 'OF3GS', 'LonGaussian'];
const players = [];
const preferredVideo = (mp4, video) => video.canPlayType('video/webm; codecs="vp9"') ? mp4.replace(/\.mp4$/, '.webm') : mp4;

class ComparisonPlayer {
  constructor(root, scenes) {
    this.root = root;
    this.scenes = scenes;
    this.video = root.querySelector('video');
    this.playButton = root.querySelector('.play-button');
    this.seek = root.querySelector('.seek');
    this.badge = root.querySelector('.frame-badge');
    this.time = root.querySelector('.time');
    this.status = root.querySelector('.player-status');
    this.wipe = root.querySelector('.wipe');
    this.canvases = [...root.querySelectorAll('canvas')];
    this.method = 3;
    this.visible = false;
    this.userPaused = false;
    this.loaded = false;
    this.webmFallback = false;
    this.callback = null;
    this.scene = scenes.find(s => s.id === root.querySelector('.scene-choice.selected').dataset.scene);

    root.querySelectorAll('[data-method]').forEach(button => button.addEventListener('click', () => {
      this.method = Number(button.dataset.method);
      root.querySelectorAll('[data-method]').forEach(b => {
        b.classList.toggle('selected', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      });
      const label = root.querySelector('.reference, .baseline-label');
      label.textContent = methodNames[this.method];
      this.canvases[0].setAttribute('aria-label', 'LonGaussian on the left, ' + label.textContent + ' on the right');
      this.draw();
    }));
    root.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => {
      root.querySelectorAll('[data-scene]').forEach(b => {
        b.classList.toggle('selected', b === button);
        b.setAttribute('aria-pressed', String(b === button));
      });
      this.scene = scenes.find(s => s.id === button.dataset.scene);
      root.querySelector('h3').textContent = this.scene.name + ' · ' + this.scene.context + ' context views';
      root.querySelector('.kicker').textContent = this.scene.dataset.toLowerCase() === 'dl3dv' ? 'DL3DV' : 'RealEstate10K';
      this.wipe.style.setProperty('--poster', `url('media/posters/${this.scene.id}-ours.jpg')`);
      this.load();
    }));
    const range = root.querySelector('.wipe-range');
    if (range) range.addEventListener('input', () => {
      this.wipe.style.setProperty('--split', range.value + '%');
      range.setAttribute('aria-valuetext', range.value + ' percent Ours, ' + (100 - range.value) + ' percent reference');
      this.draw();
    });
    this.playButton.addEventListener('click', () => {
      if (!this.video.paused) {
        this.userPaused = true;
        this.video.pause();
      } else {
        this.userPaused = false;
        if (this.video.error) this.load();
        else this.start();
      }
    });
    this.seek.addEventListener('input', () => {
      if (Number.isFinite(this.video.duration)) this.video.currentTime = this.seek.value / 100 * this.video.duration;
    });
    this.video.addEventListener('loadeddata', () => {
      if (this.video.videoWidth !== this.scene.width || this.video.videoHeight !== this.scene.height * 5) {
        this.status.textContent = 'Unexpected video layout. Please select another scene.';
        return;
      }
      this.playButton.disabled = this.seek.disabled = false;
      this.draw();
      this.updateTime();
      this.status.textContent = 'Drag to compare · synchronized video playback';
      if (this.visible && !this.userPaused && !reducedMotion.matches && !document.hidden) this.start();
    });
    this.video.addEventListener('seeked', () => { this.draw(); this.updateTime(); });
    this.video.addEventListener('timeupdate', () => this.updateTime());
    this.video.addEventListener('play', () => {
      this.playButton.textContent = 'Pause';
      this.cancelTick();
      this.tick();
    });
    this.video.addEventListener('pause', () => {
      this.playButton.textContent = 'Play';
      this.cancelTick();
    });
    this.video.addEventListener('error', () => {
      if (!this.webmFallback) {
        this.webmFallback = true;
        this.video.src = this.video.src.endsWith('.webm') ? this.scene.video : this.scene.video.replace(/\.mp4$/, '.webm');
        this.video.load();
        return;
      }
      this.status.textContent = 'Video could not load. Press Retry or choose another scene.';
      this.playButton.textContent = 'Retry';
      this.playButton.disabled = false;
      this.seek.disabled = true;
    });
    this.paintPosters();
    this.observer = new IntersectionObserver(entries => {
      this.visible = entries[0].isIntersecting;
      if (this.visible) {
        if (!this.loaded) this.load();
        else if (!this.userPaused && !reducedMotion.matches && !document.hidden) this.start();
      } else this.video.pause();
    }, { threshold: .12 });
    this.observer.observe(this.wipe);
  }
  paintPosters() {
    const scene = this.scene;
    this.canvases.forEach(canvas => {
      const panel = canvas.dataset.panel;
      const suffix = panel === '0' ? 'gt' : panel === 'baseline' ? 'of3gs' : 'ours';
      const image = new Image();
      image.onload = () => {
        if (scene === this.scene && this.video.readyState < 2) canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = 'media/posters/' + scene.id + '-' + suffix + '.jpg';
    });
  }
  load() {
    this.video.pause();
    this.loaded = true;
    this.webmFallback = false;
    this.playButton.disabled = this.seek.disabled = true;
    this.playButton.textContent = 'Play';
    this.badge.textContent = 'Loading';
    this.badge.classList.remove('nvs');
    this.seek.value = 0;
    this.time.textContent = '0.0 s';
    this.video.src = preferredVideo(this.scene.video, this.video);
    this.video.load();
    this.canvases.forEach(c => c.getContext('2d').clearRect(0, 0, c.width, c.height));
    this.paintPosters();
  }
  async start() {
    if (this.video.readyState < 2) return;
    try { await this.video.play(); }
    catch (error) {
      if (error.name !== 'AbortError') this.status.textContent = 'Press Play to start video playback.';
    }
  }
  draw() {
    if (this.video.readyState < 2) return;
    const w = this.scene.width, h = this.scene.height;
    this.canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.video, 0, this.method * h, w, h, 0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.root.querySelector('.wipe-range').value / 100 * canvas.width, canvas.height);
      ctx.clip();
      ctx.drawImage(this.video, 0, 4 * h, w, h, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    });
  }
  updateTime() {
    const duration = this.video.duration;
    if (Number.isFinite(duration)) this.seek.value = this.video.currentTime / duration * 100;
    this.time.textContent = this.video.currentTime.toFixed(1) + ' s';
    const index = Math.min(this.scene.frames.length - 1, Math.floor(this.video.currentTime * this.scene.fps + .001));
    const frame = this.scene.frames[index];
    this.badge.textContent = frame.kind + ' ' + (frame.index + 1);
    this.badge.classList.toggle('nvs', frame.kind === 'NVS');
  }
  tick() {
    this.draw();
    this.updateTime();
    if (this.video.paused) return;
    if (this.video.requestVideoFrameCallback) this.callback = this.video.requestVideoFrameCallback(() => this.tick());
    else this.callback = requestAnimationFrame(() => this.tick());
  }
  cancelTick() {
    if (this.callback === null) return;
    if (this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this.callback);
    else cancelAnimationFrame(this.callback);
    this.callback = null;
  }
}

fetch('media/scenes.json').then(r => {
  if (!r.ok) throw new Error('Missing scene manifest');
  return r.json();
}).then(scenes => {
  document.querySelectorAll('[data-player]').forEach(root => players.push(new ComparisonPlayer(root, scenes)));
}).catch(() => {
  document.querySelectorAll('.player-status').forEach(s => {
    s.textContent = 'Could not load comparisons. Serve this folder over HTTP and reload.';
  });
});

// Only visible media plays. Reduced-motion users get still posters and manual Play.
const ambientVideos = [...document.querySelectorAll('[data-ambient]')];
const ambientStates = new Map();
const hero = document.querySelector('#hero-video');
const motionButton = document.querySelector('#toggle-motion');
ambientVideos.forEach(video => {
  const state = { visible: false, pausedByUser: false, fallback: false };
  ambientStates.set(video, state);
  video.addEventListener('error', () => {
    if (!state.fallback) {
      state.fallback = true;
      video.src = video.src.endsWith('.webm') ? video.dataset.src : video.dataset.src.replace(/\.mp4$/, '.webm');
      video.load();
      if (state.visible && !state.pausedByUser && !reducedMotion.matches) video.play().catch(() => {});
    }
  });
  if (video !== hero) {
    video.addEventListener('click', event => {
      const rect = video.getBoundingClientRect();
      if (event.clientY > rect.bottom - 38) return; // leave native controls usable
      state.pausedByUser = !video.paused;
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
  }
  video.addEventListener('pause', () => {
    if (state.visible && !document.hidden) state.pausedByUser = true;
  });
  const observer = new IntersectionObserver(entries => {
    state.visible = entries[0].isIntersecting;
    if (state.visible) {
      if (!video.getAttribute('src')) { video.src = preferredVideo(video.dataset.src, video); video.load(); }
      if (!state.pausedByUser && !reducedMotion.matches && !document.hidden) video.play().catch(() => {});
    } else video.pause();
  }, { threshold: .15 });
  observer.observe(video === hero ? document.querySelector('.hero') : video);
});
motionButton.hidden = false;
motionButton.textContent = reducedMotion.matches ? 'Play background' : 'Pause background';
motionButton.addEventListener('click', () => {
  const state = ambientStates.get(hero);
  state.pausedByUser = !hero.paused;
  if (hero.paused) hero.play().catch(() => {});
  else hero.pause();
  motionButton.textContent = state.pausedByUser ? 'Play background' : 'Pause background';
  motionButton.setAttribute('aria-pressed', String(state.pausedByUser));
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    players.forEach(p => p.video.pause());
    ambientVideos.forEach(v => v.pause());
  } else {
    players.forEach(p => { if (p.visible && !p.userPaused && !reducedMotion.matches) p.start(); });
    ambientVideos.forEach(v => {
      const state = ambientStates.get(v);
      if (state.visible && !state.pausedByUser && !reducedMotion.matches) v.play().catch(() => {});
    });
  }
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) {
    players.forEach(p => p.video.pause());
    ambientVideos.forEach(v => v.pause());
  }
});

// Exact values transcribed from Table 1; #G is in millions.
const benchmarks = {
  dl3dv: {
    64: [[13.62,.234,.647,8.78],[15.95,.288,.599,8.78],[16.29,.438,.489,7.10],[19.57,.617,.381,2.36]],
    96: [[13.67,.237,.654,13.17],[15.74,.282,.606,13.17],[15.31,.404,.545,10.45],[18.88,.575,.420,3.54]],
    128: [[13.70,.241,.660,17.56],[15.48,.276,.612,17.56],[14.83,.316,.574,13.67],[18.31,.536,.450,4.80]]
  },
  re10k: {
    64: [[13.66,.358,.609,8.78],[16.34,.431,.589,8.78],[18.47,.580,.331,6.04],[19.73,.636,.339,1.12]],
    96: [[13.72,.359,.618,13.17],[15.85,.421,.601,13.17],[17.17,.518,.384,8.74],[18.91,.595,.372,1.66]],
    128: [[13.67,.358,.627,17.56],[15.34,.412,.612,17.56],[16.19,.473,.431,11.37],[18.23,.561,.397,2.15]]
  }
};
let dataset = 'dl3dv';
function updateTable() {
  const length = document.querySelector('#table-context').value;
  const rows = benchmarks[dataset][length];
  const best = [0,1,2,3].map(col => (col < 2 ? Math.max : Math.min)(...rows.map(r => r[col])));
  document.querySelectorAll('#results-table tbody tr').forEach((tr, i) => {
    tr.querySelectorAll('td').forEach((cell, col) => {
      cell.textContent = rows[i][col].toFixed(col === 1 || col === 2 ? 3 : 2);
      cell.classList.toggle('best', rows[i][col] === best[col]);
    });
  });
  document.querySelector('#results-table caption').textContent = (dataset === 'dl3dv' ? 'DL3DV' : 'RealEstate10K') + ' benchmark results with ' + length + ' context views';
}
document.querySelectorAll('[data-dataset]').forEach(button => button.addEventListener('click', () => {
  dataset = button.dataset.dataset;
  document.querySelectorAll('[data-dataset]').forEach(b => {
    b.classList.toggle('selected', b === button);
    b.setAttribute('aria-pressed', String(b === button));
  });
  updateTable();
}));
document.querySelector('#table-context').addEventListener('change', updateTable);
updateTable();

// Original figures remain inspectable without tiny text or an external viewer.
const dialog = document.querySelector('#figure-dialog');
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  const image = dialog.querySelector('img');
  const responsiveResource = button.classList.contains('resource-zoom') && window.matchMedia('(max-width: 560px)').matches;
  image.src = responsiveResource ? button.querySelector('img').currentSrc : button.dataset.image;
  image.alt = button.querySelector('img').alt;
  dialog.classList.toggle('resource-dialog', button.classList.contains('resource-zoom'));
  dialog.showModal();
}));
document.querySelector('#close-figure').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
// Select a reconstruction without downloading it; load only on explicit request.
let geometryScenes = [], geometryScene = null, geometry = null, geometryLoading = false;
const geometryButton = document.querySelector('#load-geometry');
const geometryStatus = document.querySelector('#geometry-status');
const geometryChoices = [...document.querySelectorAll('[data-geometry-scene]')];
function previewGeometry(scene) {
  geometryScene = scene;
  geometryChoices.forEach(button => {
    const selected = button.dataset.geometryScene === scene.id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  const placeholder = document.querySelector('#geometry-placeholder');
  placeholder.style.setProperty('--geometry-poster', `url('${scene.poster}')`);
  placeholder.hidden = false;
  document.querySelector('.geometry-toolbar').hidden = true;
  document.querySelector('.geometry-toolbar span').textContent = `${scene.name} · ${scene.context} views`;
  geometryButton.innerHTML = `Explore in 3D <small>${(scene.bytes / 1024 / 1024).toFixed(0)} MiB</small>`;
  geometryStatus.textContent = `${scene.name} · Gaussian rendering · loads on demand`;
}
async function openGeometry() {
  if (!geometryScene || geometryLoading) return;
  geometryLoading = true;
  geometryButton.disabled = true;
  geometryChoices.forEach(button => { button.disabled = true; });
  geometryStatus.textContent = 'Loading Gaussian renderer…';
  try {
    if (geometry) { await geometry.dispose(); geometry = null; }
    const { loadReconstruction } = await import('./splat-viewer.js?v=dcf7151fdd76');
    geometry = await loadReconstruction(geometryScene, geometryStatus);
  } catch (error) {
    geometryStatus.textContent = error.message + '. Rendering videos remain available above.';
    geometryButton.textContent = 'Retry 3D rendering';
  } finally {
    geometryLoading = false;
    geometryButton.disabled = false;
    geometryChoices.forEach(button => { button.disabled = false; });
  }
}
geometryButton.disabled = true;
fetch('media/geometry/scenes.json', { cache: 'no-cache' }).then(response => {
  if (!response.ok) throw new Error('Reconstruction list is unavailable');
  return response.json();
}).then(scenes => {
  geometryScenes = scenes;
  previewGeometry(scenes[0]);
  geometryButton.disabled = false;
}).catch(error => { geometryStatus.textContent = error.message; });
geometryChoices.forEach(button => button.addEventListener('click', async () => {
  if (geometryLoading || geometryScene?.id === button.dataset.geometryScene) return;
  const scene = geometryScenes.find(item => item.id === button.dataset.geometryScene);
  if (!scene) return;
  const wasLoaded = Boolean(geometry);
  previewGeometry(scene);
  if (wasLoaded) await openGeometry();
}));
geometryButton.addEventListener('click', openGeometry);
