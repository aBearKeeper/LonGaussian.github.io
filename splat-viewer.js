import * as THREE from './vendor/three.module.js';
import { Viewer, RenderMode, SceneRevealMode, LogLevel } from './vendor/gaussian-splats-3d.module.js';

// Preserve anisotropic scales, rotations, alpha and degree-2 SH. Local workers
// need no SharedArrayBuffer or special HTTP headers on GitHub Pages.
export async function loadReconstruction(scene, status) {
  const response = await fetch(scene.metadata, { cache: 'no-cache' });
  if (!response.ok) throw new Error('Scene metadata is unavailable');
  const meta = await response.json();
  const mount = document.querySelector('#splat-mount');
  const shell = document.querySelector('#geometry-shell');
  const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'highp' });
  if (!renderer.capabilities.isWebGL2) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw new Error('Enable WebGL2 and browser hardware acceleration to use the 3D viewer');
  }
  renderer.setPixelRatio(1);
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.setClearColor(0x000000, 1);
  mount.appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(meta.cameraFov, mount.clientWidth / mount.clientHeight, meta.near, meta.far);
  camera.position.fromArray(meta.cameraPosition);
  camera.up.fromArray(meta.cameraUp).normalize();
  camera.lookAt(new THREE.Vector3().fromArray(meta.cameraLookAt));
  // Retain the exported intrinsics, including unequal fx and fy. On fullscreen
  // resize, retain the vertical field of view and extend the horizontal view.
  camera.updateProjectionMatrix = () => {
    const n = camera.near, k = meta.K;
    const horizontal = camera.aspect / (meta.W / meta.H);
    camera.projectionMatrix.makePerspective(
      -k[0][2] / k[0][0] * n * horizontal, (meta.W - k[0][2]) / k[0][0] * n * horizontal,
      k[1][2] / k[1][1] * n, -(meta.H - k[1][2]) / k[1][1] * n, n, camera.far);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  };
  camera.updateProjectionMatrix();
  const viewer = new Viewer({
    rootElement: mount, camera, renderer, selfDrivenMode: false,
    initialCameraPosition: meta.cameraPosition,
    initialCameraLookAt: meta.cameraLookAt, cameraUp: meta.cameraUp,
    sharedMemoryForWorkers: false, gpuAcceleratedSort: false,
    integerBasedSort: false, enableSIMDInSort: true,
    halfPrecisionCovariancesOnGPU: false, sphericalHarmonicsDegree: 2,
    kernel2DSize: .3, antialiased: false,
    ignoreDevicePixelRatio: true, renderMode: RenderMode.OnChange,
    sceneRevealMode: SceneRevealMode.Instant, sceneFadeInRateMultiplier: 300,
    logLevel: LogLevel.None, showLoadingUI: false, inMemoryCompressionLevel: 1,
  });
  const releaseRenderer = () => {
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    delete mount.dataset.renderer;
    delete mount.dataset.gaussians;
    delete mount.dataset.scene;
  };
  try {
    const base = new URL(scene.metadata, document.baseURI);
    await viewer.addSplatScenes(meta.urls.map(path => ({
      path: new URL(path, base).href, splatAlphaRemovalThreshold: 0,
    })), false, (percent, label, stage) => {
      status.textContent = stage === 0 ? `Loading ${scene.name} ${label || Math.round(percent) + '%'}…` : 'Preparing Gaussian rendering…';
    });
    // Fix an upstream eigenvalue floor that discards valid small Gaussians;
    // handle diagonal covariances without normalizing a zero eigenvector.
    const shader = viewer.splatMesh.material.vertexShader;
    const patched = shader
      .replace('sqrt(max(0.1f, traceOver2 * traceOver2 - D))', 'sqrt(max(0.0, traceOver2 * traceOver2 - D))')
      .replace('normalize(vec2(b, eigenValue1 - a))',
        '(abs(b) > 1e-7 ? normalize(vec2(b, eigenValue1 - a)) : (a >= d ? vec2(1.0, 0.0) : vec2(0.0, 1.0)))');
    if (patched === shader) throw new Error('Gaussian projection compatibility check failed');
    viewer.splatMesh.material.vertexShader = patched;
    viewer.splatMesh.material.needsUpdate = true;
  } catch (error) {
    await viewer.dispose();
    releaseRenderer();
    throw error;
  }
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `Interactive Gaussian rendering of ${scene.name}`);
  canvas.setAttribute('aria-describedby', 'geometry-instructions');
  viewer.controls.minDistance = .01;
  viewer.controls.maxDistance = 40;
  viewer.controls.maxPolarAngle = Math.PI - .1;
  viewer.controls.stopListenToKeyEvents();
  viewer.controls.listenToKeyEvents(canvas);
  window.removeEventListener('keydown', viewer.keyDownListener);
  const focus = () => canvas.focus({ preventScroll: true });
  canvas.addEventListener('pointerdown', focus);
  const resize = () => {
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    camera.aspect = mount.clientWidth / mount.clientHeight;
    camera.updateProjectionMatrix();
    viewer.forceRenderNextFrame();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mount);
  const reset = () => {
    viewer.transitioningCameraTarget = false;
    const damping = viewer.controls.enableDamping;
    viewer.controls.enableDamping = false;
    viewer.controls.update();
    camera.position.fromArray(meta.cameraPosition);
    camera.up.fromArray(meta.cameraUp).normalize();
    viewer.controls.target.fromArray(meta.cameraLookAt);
    viewer.controls.update();
    viewer.controls.enableDamping = damping;
    viewer.forceRenderNextFrame();
  };
  const resetButton = document.querySelector('#reset-geometry');
  resetButton.addEventListener('click', reset);
  const fullscreen = document.querySelector('#fullscreen-geometry');
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shell.requestFullscreen();
    } catch (_) { fullscreen.textContent = 'Fullscreen unavailable'; }
  };
  const fullscreenChanged = () => {
    fullscreen.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen';
    resize();
  };
  fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', fullscreenChanged);
  // Submit at most one unfinished GPU frame, so costly draws never accumulate.
  const context = renderer.getContext();
  let visible = true, running = false, frameId = null, fence = null, lastUpdate = 0;
  const tick = time => {
    if (!running) return;
    frameId = requestAnimationFrame(tick);
    if (time - lastUpdate < 1000 / 30) return;
    if (fence) {
      if (context.clientWaitSync(fence, 0, 0) === context.TIMEOUT_EXPIRED) return;
      context.deleteSync(fence);
      fence = null;
    }
    lastUpdate = time;
    viewer.update();
    if (viewer.shouldRender()) {
      viewer.render();
      fence = context.fenceSync(context.SYNC_GPU_COMMANDS_COMPLETE, 0);
      context.flush();
    }
    viewer.renderNextFrame = false;
  };
  const stop = () => { running = false; cancelAnimationFrame(frameId); };
  const updateActivity = () => {
    const active = visible && !document.hidden;
    viewer.controls.enabled = active;
    if (active && !running) { running = true; frameId = requestAnimationFrame(tick); }
    else if (!active) stop();
  };
  const intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateActivity();
  }, { threshold: .01 });
  intersectionObserver.observe(shell);
  document.addEventListener('visibilitychange', updateActivity);
  const contextLost = event => {
    event.preventDefault();
    stop();
    document.querySelector('#geometry-placeholder').hidden = false;
    status.textContent = 'Graphics context lost. Reload the page to restore the rendering.';
    document.querySelector('#load-geometry').disabled = true;
  };
  canvas.addEventListener('webglcontextlost', contextLost);
  mount.dataset.renderer = 'gaussian-splats';
  mount.dataset.gaussians = meta.count;
  mount.dataset.scene = scene.id;
  status.textContent = 'Gaussian scene ready';
  document.querySelector('#geometry-placeholder').hidden = true;
  document.querySelector('.geometry-toolbar').hidden = false;
  updateActivity();
  return {
    async dispose() {
      stop();
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', updateActivity);
      document.removeEventListener('fullscreenchange', fullscreenChanged);
      resetButton.removeEventListener('click', reset);
      fullscreen.removeEventListener('click', toggleFullscreen);
      canvas.removeEventListener('pointerdown', focus);
      canvas.removeEventListener('webglcontextlost', contextLost);
      if (fence) { context.deleteSync(fence); fence = null; }
      // Cancel any pending sort before disposal instead of awaiting a sort
      // for a scene that is no longer displayed. Release the GPU context too.
      viewer.disposeSortWorker();
      renderer.forceContextLoss();
      await viewer.dispose();
      releaseRenderer();
    },
  };
}
