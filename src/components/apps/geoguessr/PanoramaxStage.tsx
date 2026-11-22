import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ChevronUp, Loader2 } from 'lucide-react';
import type { GeoCoord, GeoMoveMode } from '../../../data/geoguessrLocations';

const PANORAMAX_API_BASE = 'https://api.panoramax.xyz/api';

// Federated hosts known to return 502/timeout or block CORS from third-party origins
const BLOCKED_PANORAMAX_HOSTS = new Set(['pano.locus.sbs', 'nl.panoramax.xyz']);
const DEGRADED_HOSTS = new Set<string>();

interface PanoramaxLink {
  rel: string;
  href?: string;
  id?: string;
  geometry?: {
    type: string;
    coordinates: [number, number];
  };
}

interface PanoramaxFeature {
  id: string;
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
  assets?: {
    sd?: { href: string };
    hd?: { href: string };
    thumb?: { href: string };
  };
  links?: PanoramaxLink[];
  _synthetic?: boolean;
}

interface NavArrow {
  id: string;
  rel: 'prev' | 'next';
  href?: string;
  bearingDeg: number;
  label: string;
}

export interface PanoramaxTarget extends GeoCoord {
  heading: number;
  panoId?: string;
  sdUrl?: string;
  az?: number;
}

export interface PanoramaxStageProps {
  target: PanoramaxTarget | null;
  moveMode: GeoMoveMode;
  roundKey: string;
  hdQuality?: boolean;
  fallbackCoords?: GeoCoord[];
  allowAltFallback?: boolean;
  deterministicPick?: boolean;
  onHeadingChange: (heading: number) => void;
  onPanoramaResolved: (info: { lat: number; lng: number; panoId: string; locationLabel?: string }) => void;
  onPanoramaError: (msg: string) => void;
  registerActions: (actions: {
    resetToStart: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    snapNorth: () => void;
  }) => void;
}

// ─── Bounded Lightweight LRU Caches (Keeps RAM small on mobile/iPad) ───
const MAX_FEATURE_CACHE = 80;
const MAX_NEARBY_CACHE = 32;
const MAX_IMAGE_CACHE = 12;

const featureCache = new Map<string, PanoramaxFeature>();
const nearbyCache = new Map<string, PanoramaxFeature[]>();
const imageCache = new Map<string, HTMLImageElement>();
const inFlightFeatureIds = new Map<string, Promise<PanoramaxFeature | null>>();
const inFlightNearby = new Map<string, Promise<PanoramaxFeature[]>>();
const inFlightImages = new Map<string, Promise<HTMLImageElement>>();

function setLru<K, V>(map: Map<K, V>, key: K, val: V, limit: number) {
  if (map.has(key)) map.delete(key);
  map.set(key, val);
  if (map.size > limit) {
    const oldest = map.keys().next().value;
    if (oldest !== undefined) map.delete(oldest);
  }
}

function getLru<K, V>(map: Map<K, V>, key: K): V | undefined {
  const v = map.get(key);
  if (v !== undefined) {
    map.delete(key);
    map.set(key, v);
  }
  return v;
}

function isSoftwareGl(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const r = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(r);
  } catch {
    return true;
  }
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function calcBearingDeg(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(toLng - fromLng)) * Math.cos(toRad(toLat));
  const x =
    Math.cos(toRad(fromLat)) * Math.sin(toRad(toLat)) -
    Math.sin(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.cos(toRad(toLng - fromLng));
  return normalizeDeg((Math.atan2(y, x) * 180) / Math.PI);
}

function getHostFromUrl(href?: string): string {
  if (!href) return '';
  try {
    return new URL(href).host;
  } catch {
    return '';
  }
}

function isAllowedHref(href?: string): href is string {
  if (!href) return false;
  const host = getHostFromUrl(href);
  return Boolean(host) && !BLOCKED_PANORAMAX_HOSTS.has(host);
}

function getFeatureImageUrl(f: PanoramaxFeature): string | null {
  const sd = f.assets?.sd?.href;
  if (isAllowedHref(sd)) return sd;
  const thumb = f.assets?.thumb?.href;
  if (isAllowedHref(thumb)) return thumb;
  const hd = f.assets?.hd?.href;
  if (isAllowedHref(hd)) return hd;
  return null;
}

function getFeatureHdUrl(f: PanoramaxFeature): string | null {
  const hd = f.assets?.hd?.href;
  if (isAllowedHref(hd)) return hd;
  return null;
}

function getFeatureThumbUrl(f: PanoramaxFeature): string | null {
  const thumb = f.assets?.thumb?.href;
  if (isAllowedHref(thumb)) return thumb;
  return null;
}

function getFeatureAzimuth(f: PanoramaxFeature): number {
  const az = f.properties?.['view:azimuth'];
  return typeof az === 'number' && Number.isFinite(az) ? az : 0;
}

function getFeatureAttribution(f: PanoramaxFeature): string {
  const providers = f.properties?.providers as Array<{ name?: string }> | undefined;
  const producer = providers?.find((p) => p?.name)?.name;
  const license = typeof f.properties?.license === 'string' ? f.properties.license : 'CC-BY-SA-4.0';
  return producer ? `© ${producer} (${license}) · Panoramax` : `Panoramax (${license})`;
}

function extractNavArrows(f: PanoramaxFeature): NavArrow[] {
  const [lng, lat] = f.geometry.coordinates;
  const arrows: NavArrow[] = [];
  for (const link of f.links || []) {
    if ((link.rel === 'next' || link.rel === 'prev') && link.id && link.geometry?.coordinates) {
      const [nlng, nlat] = link.geometry.coordinates;
      const bearingDeg = calcBearingDeg(lat, lng, nlat, nlng);
      arrows.push({
        id: link.id,
        rel: link.rel,
        href: link.href,
        bearingDeg,
        label: link.rel === 'next' ? '前へ進む' : '後ろへ戻る',
      });
    }
  }
  return arrows;
}

function makeSyntheticFeature(target: PanoramaxTarget): PanoramaxFeature | null {
  if (!target.panoId || !isAllowedHref(target.sdUrl)) return null;
  return {
    id: target.panoId,
    geometry: { type: 'Point', coordinates: [target.lng, target.lat] },
    properties: { 'view:azimuth': typeof target.az === 'number' ? target.az : 0 },
    assets: { sd: { href: target.sdUrl } },
    links: [],
    _synthetic: true,
  };
}

async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const ac = new AbortController();
  const tid = window.setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { signal: ac.signal });
  } finally {
    window.clearTimeout(tid);
  }
}

async function searchPanoramaxNearby(lat: number, lng: number, distanceM: number, limit = 6): Promise<PanoramaxFeature[]> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}:${distanceM}`;
  const cached = getLru(nearbyCache, cacheKey);
  if (cached) return cached;

  const pending = inFlightNearby.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    try {
      const filter = encodeURIComponent('field_of_view=360');
      const url = `${PANORAMAX_API_BASE}/search?limit=${limit}&place_position=${lng},${lat}&place_distance=0-${distanceM}&filter=${filter}`;
      const res = await fetchWithTimeout(url, 6500);
      if (!res.ok) return [];
      const data = (await res.json()) as { features?: PanoramaxFeature[] };
      const valid = (data.features || []).filter((f) => Boolean(getFeatureImageUrl(f)));
      for (const f of valid) {
        setLru(featureCache, f.id, f, MAX_FEATURE_CACHE);
      }
      if (valid.length > 0) {
        setLru(nearbyCache, cacheKey, valid, MAX_NEARBY_CACHE);
      }
      return valid;
    } catch {
      return [];
    } finally {
      inFlightNearby.delete(cacheKey);
    }
  })();

  inFlightNearby.set(cacheKey, task);
  return task;
}

export async function fetchPanoramaxBatchByIds(ids: string[]): Promise<Map<string, PanoramaxFeature>> {
  const out = new Map<string, PanoramaxFeature>();
  const missing: string[] = [];

  for (const id of ids) {
    if (!id) continue;
    const cached = getLru(featureCache, id);
    if (cached && !cached._synthetic) {
      out.set(id, cached);
    } else if (!missing.includes(id)) {
      missing.push(id);
    }
  }

  if (missing.length === 0) return out;

  const url = `${PANORAMAX_API_BASE}/search?ids=${encodeURIComponent(missing.join(','))}`;
  try {
    const res = await fetchWithTimeout(url, 6000);
    if (res.ok) {
      const data = (await res.json()) as { features?: PanoramaxFeature[] };
      for (const f of data.features || []) {
        if (f && f.id && getFeatureImageUrl(f)) {
          setLru(featureCache, f.id, f, MAX_FEATURE_CACHE);
          out.set(f.id, f);
        }
      }
    }
  } catch {
    // ignore batch failure
  }
  return out;
}

async function fetchPanoramaxById(id: string): Promise<PanoramaxFeature | null> {
  const cached = getLru(featureCache, id);
  if (cached && !cached._synthetic) return cached;

  const pending = inFlightFeatureIds.get(id);
  if (pending) return pending;

  const task = (async () => {
    try {
      const map = await fetchPanoramaxBatchByIds([id]);
      return map.get(id) || null;
    } finally {
      inFlightFeatureIds.delete(id);
    }
  })();

  inFlightFeatureIds.set(id, task);
  return task;
}

function loadCorsImageCached(url: string, timeoutMs = 8000): Promise<HTMLImageElement> {
  const cached = getLru(imageCache, url);
  if (cached) return Promise.resolve(cached);

  const pending = inFlightImages.get(url);
  if (pending) return pending;

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      img.src = '';
      const host = getHostFromUrl(url);
      if (host) DEGRADED_HOSTS.add(host);
      reject(new Error('Image load timeout'));
    }, timeoutMs);

    img.onload = async () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      try {
        if (typeof img.decode === 'function') {
          await img.decode();
        }
      } catch {
        // decode optional
      }
      const host = getHostFromUrl(url);
      if (host) DEGRADED_HOSTS.delete(host);
      setLru(imageCache, url, img, MAX_IMAGE_CACHE);
      resolve(img);
    };

    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      const host = getHostFromUrl(url);
      if (host) DEGRADED_HOSTS.add(host);
      reject(new Error('Image load error'));
    };

    img.src = url;
  }).finally(() => {
    inFlightImages.delete(url);
  });

  inFlightImages.set(url, promise);
  return promise;
}

function preloadFeatureSd(feature: PanoramaxFeature) {
  const sd = getFeatureImageUrl(feature);
  if (sd) {
    loadCorsImageCached(sd, 8000).catch(() => {});
  }
}

async function prefetchNeighbors(feature: PanoramaxFeature) {
  // Lightweight depth-1 prefetch for the top 2 immediate road links (prev + next)
  const arrows = extractNavArrows(feature).slice(0, 2);
  if (arrows.length === 0) return;
  const map = await fetchPanoramaxBatchByIds(arrows.map((a) => a.id));
  for (const arrow of arrows) {
    const nf = map.get(arrow.id);
    if (nf) preloadFeatureSd(nf);
  }
}

/**
 * Ultra-fast pre-warming helper for Solo rounds:
 * - Preloads direct `sdUrl`s (~196 KB each) immediately without waiting for any API JSON.
 * - If Moving mode is enabled, fetches link metadata for all curated rounds in ONE batch HTTP call.
 */
export async function prefetchPanoramaxTargets(
  targets: PanoramaxTarget[],
  preferMoving = true
): Promise<void> {
  try {
    // Direct image preload for the first 2 targets (instant paint!)
    for (const t of targets.slice(0, 2)) {
      if (isAllowedHref(t.sdUrl)) {
        loadCorsImageCached(t.sdUrl, 8000).catch(() => {});
      }
    }
    if (preferMoving) {
      const ids = targets
        .map((t) => t.panoId)
        .filter((id): id is string => Boolean(id));
      if (ids.length > 0) {
        await fetchPanoramaxBatchByIds(ids);
      }
    }
  } catch {
    // best-effort background warmup
  }
}

/**
 * Legacy coordinate pre-warmer fallback (used only when target lacks pre-baked `sdUrl`).
 */
export async function prefetchPanoramaxCoord(
  lat: number,
  lng: number,
  preferMoving = true,
  directSdUrl?: string,
  panoId?: string
): Promise<void> {
  try {
    if (isAllowedHref(directSdUrl)) {
      loadCorsImageCached(directSdUrl, 8000).catch(() => {});
      if (preferMoving && panoId) {
        void fetchPanoramaxById(panoId);
      }
      return;
    }
    if (panoId) {
      const f = await fetchPanoramaxById(panoId);
      if (f) {
        preloadFeatureSd(f);
        if (preferMoving) void prefetchNeighbors(f);
      }
      return;
    }
    const list = await searchPanoramaxNearby(lat, lng, 12000, 4);
    if (list[0]) {
      preloadFeatureSd(list[0]);
      if (preferMoving) void prefetchNeighbors(list[0]);
    }
  } catch {
    // best-effort
  }
}

export const PanoramaxStage: React.FC<PanoramaxStageProps> = ({
  target,
  moveMode,
  roundKey,
  hdQuality = false,
  fallbackCoords,
  allowAltFallback = false,
  deterministicPick = false,
  onHeadingChange,
  onPanoramaResolved,
  onPanoramaError,
  registerActions,
}) => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingPano, setIsLoadingPano] = useState(true);
  const [navigatingArrowId, setNavigatingArrowId] = useState<string | null>(null);
  const [attribution, setAttribution] = useState('Panoramax');
  const [navArrows, setNavArrows] = useState<NavArrow[]>([]);
  const [cameraHeading, setCameraHeading] = useState(0);
  const [fallback2DUrl, setFallback2DUrl] = useState<string | null>(null);

  const onHeadingRef = useRef(onHeadingChange);
  const onResolvedRef = useRef(onPanoramaResolved);
  const onErrorRef = useRef(onPanoramaError);
  const fallbackCoordsRef = useRef(fallbackCoords);
  const moveModeRef = useRef(moveMode);
  const hdQualityRef = useRef(hdQuality);
  onHeadingRef.current = onHeadingChange;
  onResolvedRef.current = onPanoramaResolved;
  onErrorRef.current = onPanoramaError;
  fallbackCoordsRef.current = fallbackCoords;
  moveModeRef.current = moveMode;
  hdQualityRef.current = hdQuality;

  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    meshA: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
    meshB: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
    textureA: THREE.Texture | null;
    textureB: THREE.Texture | null;
    azimuthA: number;
    azimuthB: number;
    worldHeading: number;
    pitchDeg: number;
    fov: number;
    targetFov: number;
    velHeading: number;
    velPitch: number;
    animHeadingTarget: number | null;
    animPitchTarget: number | null;
    transition: {
      active: boolean;
      startTime: number;
      durationMs: number;
      bearingDeg: number;
      featureB: PanoramaxFeature;
    } | null;
    maxTexSize: number;
    softGl: boolean;
    rafId: number | null;
    ensureLoop: () => void;
  } | null>(null);

  const startStateRef = useRef<{ feature: PanoramaxFeature; heading: number } | null>(null);
  const loadedRoundRef = useRef<{ roundKey: string; panoId?: string }>({ roundKey: '' });
  const navSeqRef = useRef(0);
  const currentFeatureRef = useRef<PanoramaxFeature | null>(null);
  const activeFeatureTokenRef = useRef(0);
  const activeRoundKeyRef = useRef(roundKey);
  const isMountedRef = useRef(true);
  const arrowIconRefs = useRef<Map<string, SVGSVGElement>>(new Map());
  const navArrowsRef = useRef<NavArrow[]>([]);
  const latestHeadingRef = useRef(0);
  activeRoundKeyRef.current = roundKey;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize lightweight Three.js WebGL dual-sphere Street View engine once
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const softGl = isSoftwareGl();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false, // Full-bleed panorama sphere gains nothing from MSAA while saving GPU fillrate
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setFallback2DUrl('');
      return;
    }

    // Cap DPR at 1.5 so Retina/iPad renders ~44% fewer pixels per frame with crisp 2048px SD imagery
    renderer.setPixelRatio(softGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    host.appendChild(renderer.domElement);

    const w = Math.max(host.clientWidth, 1);
    const h = Math.max(host.clientHeight, 1);
    renderer.setSize(w, h, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b12);

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1200);
    camera.position.set(0, 0, 0);

    // 48x32 sphere reduces vertex overhead ~50% while staying visually identical
    const geometryA = new THREE.SphereGeometry(500, 48, 32);
    geometryA.scale(-1, 1, 1);
    const materialA = new THREE.MeshBasicMaterial({ color: 0x0b101b });
    const meshA = new THREE.Mesh(geometryA, materialA);
    scene.add(meshA);

    const geometryB = new THREE.SphereGeometry(492, 48, 32);
    geometryB.scale(-1, 1, 1);
    const materialB = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const meshB = new THREE.Mesh(geometryB, materialB);
    meshB.visible = false;
    scene.add(meshB);

    const state = {
      renderer,
      scene,
      camera,
      meshA,
      meshB,
      textureA: null as THREE.Texture | null,
      textureB: null as THREE.Texture | null,
      azimuthA: 0,
      azimuthB: 0,
      worldHeading: 0,
      pitchDeg: 0,
      fov: 75,
      targetFov: 75,
      velHeading: 0,
      velPitch: 0,
      animHeadingTarget: null as number | null,
      animPitchTarget: null as number | null,
      transition: null as {
        active: boolean;
        startTime: number;
        durationMs: number;
        bearingDeg: number;
        featureB: PanoramaxFeature;
      } | null,
      maxTexSize: renderer.capabilities.maxTextureSize || 4096,
      softGl,
      rafId: null as number | null,
      ensureLoop: () => {},
    };

    let lastFrameTime = performance.now();
    let lastHudSyncTime = 0;
    let lastSyncedHeading = -999;

    const syncDomArrowsAndThrottledHud = (now: number, force = false) => {
      const hDeg = normalizeDeg(state.worldHeading);
      latestHeadingRef.current = hDeg;

      for (const arrow of navArrowsRef.current) {
        const iconEl = arrowIconRefs.current.get(arrow.id);
        if (iconEl) {
          const relDeg = ((arrow.bearingDeg - hDeg + 540) % 360) - 180;
          iconEl.style.transform = `rotate(${relDeg}deg)`;
        }
      }

      if (
        force ||
        (now - lastHudSyncTime >= 65 && Math.abs(((hDeg - lastSyncedHeading + 540) % 360) - 180) >= 0.7)
      ) {
        lastHudSyncTime = now;
        lastSyncedHeading = hDeg;
        setCameraHeading(hDeg);
        onHeadingRef.current(hDeg);
      }
    };

    const tick = (now: number) => {
      state.rafId = null;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;

      let needsMoreFrames = false;

      if (!isDragging) {
        if (Math.abs(state.velHeading) > 0.08 || Math.abs(state.velPitch) > 0.08) {
          state.worldHeading = normalizeDeg(state.worldHeading + state.velHeading * dt);
          state.pitchDeg = Math.max(-82, Math.min(82, state.pitchDeg + state.velPitch * dt));
          const damping = Math.exp(-dt * 8.5);
          state.velHeading *= damping;
          state.velPitch *= damping;
          if (Math.abs(state.velHeading) < 0.08) state.velHeading = 0;
          if (Math.abs(state.velPitch) < 0.08) state.velPitch = 0;
          needsMoreFrames = true;
        }
      }

      if (state.animHeadingTarget !== null) {
        const diff = ((state.animHeadingTarget - state.worldHeading + 540) % 360) - 180;
        const factor = 1 - Math.exp(-dt * 12);
        if (Math.abs(diff) < 0.15) {
          state.worldHeading = normalizeDeg(state.animHeadingTarget);
          state.animHeadingTarget = null;
        } else {
          state.worldHeading = normalizeDeg(state.worldHeading + diff * factor);
          needsMoreFrames = true;
        }
      }
      if (state.animPitchTarget !== null) {
        const pDiff = state.animPitchTarget - state.pitchDeg;
        const factor = 1 - Math.exp(-dt * 12);
        if (Math.abs(pDiff) < 0.12) {
          state.pitchDeg = state.animPitchTarget;
          state.animPitchTarget = null;
        } else {
          state.pitchDeg += pDiff * factor;
          needsMoreFrames = true;
        }
      }

      const fovDiff = state.targetFov - state.fov;
      if (Math.abs(fovDiff) > 0.04) {
        state.fov += fovDiff * (1 - Math.exp(-dt * 14));
        needsMoreFrames = true;
      } else {
        state.fov = state.targetFov;
      }

      let dollyFovDelta = 0;
      if (state.transition && state.transition.active) {
        const elapsed = now - state.transition.startTime;
        const rawT = Math.min(1, elapsed / state.transition.durationMs);
        const ease = 1 - Math.pow(1 - rawT, 3);
        const fade = Math.min(1, Math.max(0, (rawT - 0.12) / 0.88));

        meshB.visible = true;
        meshB.material.opacity = fade;
        const bRad = (state.transition.bearingDeg * Math.PI) / 180;
        const dollyDist = 26 * ease;
        camera.position.set(
          -Math.cos(bRad) * dollyDist,
          0,
          -Math.sin(bRad) * dollyDist
        );
        dollyFovDelta = -7.5 * Math.sin(rawT * Math.PI);

        if (rawT >= 1) {
          if (state.textureA && state.textureA !== state.textureB) {
            state.textureA.dispose();
          }
          state.textureA = state.textureB;
          state.textureB = null;
          state.azimuthA = state.azimuthB;
          meshA.material.map = state.textureA;
          meshA.material.color.setHex(0xffffff);
          meshA.material.needsUpdate = true;
          meshA.rotation.y = -(state.azimuthA * Math.PI) / 180;

          meshB.visible = false;
          meshB.material.map = null;
          meshB.material.opacity = 0;
          meshB.material.needsUpdate = true;
          camera.position.set(0, 0, 0);
          state.transition = null;
        } else {
          needsMoreFrames = true;
        }
      }

      const hRad = (state.worldHeading * Math.PI) / 180;
      const pRad = (state.pitchDeg * Math.PI) / 180;
      const tx = camera.position.x - Math.cos(pRad) * Math.cos(hRad);
      const ty = camera.position.y + Math.sin(pRad);
      const tz = camera.position.z - Math.cos(pRad) * Math.sin(hRad);
      camera.lookAt(tx, ty, tz);

      const effectiveFov = Math.max(24, Math.min(100, state.fov + dollyFovDelta));
      if (Math.abs(camera.fov - effectiveFov) > 0.01) {
        camera.fov = effectiveFov;
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
      syncDomArrowsAndThrottledHud(now, !needsMoreFrames);

      if (needsMoreFrames) {
        state.rafId = window.requestAnimationFrame(tick);
      }
    };

    state.ensureLoop = () => {
      if (state.rafId === null) {
        lastFrameTime = performance.now();
        state.rafId = window.requestAnimationFrame(tick);
      }
    };

    threeRef.current = state;
    state.ensureLoop();

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastMoveTime = 0;
    let activePointerId: number | null = null;
    let dragDistancePx = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (moveModeRef.current === 'nmpz' || e.button !== 0) return;
      isDragging = true;
      activePointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveTime = performance.now();
      dragDistancePx = 0;
      state.velHeading = 0;
      state.velPitch = 0;
      state.animHeadingTarget = null;
      state.animPitchTarget = null;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      const now = performance.now();
      const dtMove = Math.max(0.004, Math.min(0.06, (now - lastMoveTime) / 1000));
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveTime = now;
      dragDistancePx += Math.hypot(dx, dy);

      const sensitivity = (state.fov / 75) * 0.22;
      const dHeading = -dx * sensitivity;
      const dPitch = dy * sensitivity;
      state.worldHeading = normalizeDeg(state.worldHeading + dHeading);
      state.pitchDeg = Math.max(-82, Math.min(82, state.pitchDeg + dPitch));

      const instVelH = dHeading / dtMove;
      const instVelP = dPitch / dtMove;
      state.velHeading = state.velHeading * 0.45 + Math.max(-420, Math.min(420, instVelH)) * 0.55;
      state.velPitch = state.velPitch * 0.45 + Math.max(-240, Math.min(240, instVelP)) * 0.55;

      state.ensureLoop();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging || e.pointerId !== activePointerId) return;
      isDragging = false;
      activePointerId = null;
      try {
        renderer.domElement.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      renderer.domElement.style.cursor = moveModeRef.current === 'nmpz' ? 'not-allowed' : 'grab';

      if (performance.now() - lastMoveTime > 75 || dragDistancePx < 4) {
        state.velHeading = 0;
        state.velPitch = 0;
      } else {
        state.ensureLoop();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (moveModeRef.current === 'nmpz') return;
      e.preventDefault();
      state.targetFov = Math.max(26, Math.min(98, state.targetFov + e.deltaY * 0.045));
      state.ensureLoop();
    };

    renderer.domElement.style.cursor = moveModeRef.current === 'nmpz' ? 'not-allowed' : 'grab';
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointercancel', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nw = Math.max(Math.round(entry.contentRect.width), 1);
      const nh = Math.max(Math.round(entry.contentRect.height), 1);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
      state.ensureLoop();
    });
    ro.observe(host);

    return () => {
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointercancel', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (state.rafId !== null) window.cancelAnimationFrame(state.rafId);
      if (state.textureA) state.textureA.dispose();
      if (state.textureB) state.textureB.dispose();
      geometryA.dispose();
      materialA.dispose();
      geometryB.dispose();
      materialB.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
  }, []);

  // Push loaded HTMLImageElement onto sphere without expensive mipmap generation
  const pushImageToSphere = (
    img: HTMLImageElement,
    feature: PanoramaxFeature,
    desiredHeadingDeg: number | null,
    resetCameraView: boolean,
    transitionBearingDeg?: number
  ) => {
    const state = threeRef.current;
    const azimuth = getFeatureAzimuth(feature);
    if (state) {
      let texSource: HTMLImageElement | HTMLCanvasElement = img;
      const maxDim = state.maxTexSize || 4096;
      if (img.naturalWidth > maxDim || img.naturalHeight > maxDim) {
        const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.floor(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          texSource = canvas;
        }
      }

      const tex = new THREE.Texture(texSource);
      tex.colorSpace = THREE.SRGBColorSpace;
      // Disable mipmap generation: cuts VRAM 33% and removes upload hitch on every move
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;

      const canCrossfade =
        typeof transitionBearingDeg === 'number' &&
        Boolean(state.textureA) &&
        !resetCameraView &&
        currentFeatureRef.current?.id !== feature.id;

      if (canCrossfade) {
        if (state.textureB) state.textureB.dispose();
        state.textureB = tex;
        state.azimuthB = azimuth;
        state.meshB.material.map = tex;
        state.meshB.material.opacity = 0;
        state.meshB.material.needsUpdate = true;
        state.meshB.rotation.y = -(azimuth * Math.PI) / 180;
        state.meshB.visible = true;
        state.camera.position.set(0, 0, 0);
        state.transition = {
          active: true,
          startTime: performance.now(),
          durationMs: 240,
          bearingDeg: transitionBearingDeg,
          featureB: feature,
        };
      } else {
        if (state.transition?.active && state.transition.featureB.id === feature.id) {
          if (state.textureB) state.textureB.dispose();
          state.textureB = tex;
          state.azimuthB = azimuth;
          state.meshB.material.map = tex;
          state.meshB.material.needsUpdate = true;
          state.meshB.rotation.y = -(azimuth * Math.PI) / 180;
        } else {
          if (state.transition?.active) {
            if (state.textureB) state.textureB.dispose();
            state.textureB = null;
            state.meshB.visible = false;
            state.meshB.material.map = null;
            state.meshB.material.opacity = 0;
            state.camera.position.set(0, 0, 0);
            state.transition = null;
          }
          if (state.textureA) state.textureA.dispose();
          state.textureA = tex;
          state.azimuthA = azimuth;
          state.meshA.material.map = tex;
          state.meshA.material.color.setHex(0xffffff);
          state.meshA.material.needsUpdate = true;
          state.meshA.rotation.y = -(azimuth * Math.PI) / 180;
        }
      }

      if (desiredHeadingDeg !== null) {
        state.worldHeading = normalizeDeg(desiredHeadingDeg);
        state.animHeadingTarget = null;
        if (resetCameraView) {
          state.pitchDeg = 0;
          state.animPitchTarget = null;
          state.fov = 75;
          state.targetFov = 75;
          state.velHeading = 0;
          state.velPitch = 0;
        }
      }
      state.ensureLoop();
      setFallback2DUrl(null);
    } else {
      setFallback2DUrl(img.src);
    }

    currentFeatureRef.current = feature;
    setAttribution(getFeatureAttribution(feature));
    if (!feature._synthetic) {
      const arrows = moveModeRef.current === 'moving' ? extractNavArrows(feature) : [];
      navArrowsRef.current = arrows;
      setNavArrows(arrows);
    }
  };

  /**
   * Lightweight SD-first panorama pipeline (~196 KB by default = ~40x lighter than HD):
   * - Paints SD directly without racing redundant thumb downloads.
   * - Only fetches 7.8MB HD when the user explicitly opts in via `hdQuality === true`.
   */
  const applyFeatureToSphere = async (
    feature: PanoramaxFeature,
    desiredHeadingDeg: number | null,
    options?: {
      isCancelled?: () => boolean;
      resetCameraView?: boolean;
      transitionBearingDeg?: number;
      onVisualReady?: () => void;
    }
  ): Promise<boolean> => {
    const sdUrl = getFeatureImageUrl(feature);
    if (!sdUrl) return false;
    const hdUrl = getFeatureHdUrl(feature);
    const token = ++activeFeatureTokenRef.current;
    const capturedRoundKey = activeRoundKeyRef.current;
    const resetCameraView = options?.resetCameraView ?? false;
    const transitionBearingDeg = options?.transitionBearingDeg;

    const isStillValidForRound = () =>
      isMountedRef.current &&
      activeRoundKeyRef.current === capturedRoundKey &&
      activeFeatureTokenRef.current === token;

    const isStillInitialPending = () =>
      !options?.isCancelled?.() && isStillValidForRound();

    const maybeUpgradeToHd = () => {
      if (!hdQualityRef.current || !hdUrl || hdUrl === sdUrl) return;
      const state = threeRef.current;
      if (state && (state.softGl || state.maxTexSize < 4096)) return;
      const hdHost = getHostFromUrl(hdUrl);
      if (hdHost && DEGRADED_HOSTS.has(hdHost)) return;

      const cachedHd = getLru(imageCache, hdUrl);
      if (cachedHd) {
        if (isStillValidForRound() && currentFeatureRef.current?.id === feature.id) {
          pushImageToSphere(cachedHd, feature, null, false);
        }
        return;
      }

      loadCorsImageCached(hdUrl, 12000)
        .then((hdImg) => {
          if (isStillValidForRound() && currentFeatureRef.current?.id === feature.id) {
            pushImageToSphere(hdImg, feature, null, false);
          }
        })
        .catch(() => {});
    };

    // If HD is enabled and already cached, use it directly
    if (hdQualityRef.current && hdUrl) {
      const cachedHd = getLru(imageCache, hdUrl);
      if (cachedHd) {
        if (!isStillInitialPending()) return false;
        pushImageToSphere(cachedHd, feature, desiredHeadingDeg, resetCameraView, transitionBearingDeg);
        options?.onVisualReady?.();
        if (moveModeRef.current === 'moving' && !feature._synthetic) {
          void prefetchNeighbors(feature);
        }
        return true;
      }
    }

    // Fast path: SD already cached
    const cachedSd = getLru(imageCache, sdUrl);
    if (cachedSd) {
      if (!isStillInitialPending()) return false;
      pushImageToSphere(cachedSd, feature, desiredHeadingDeg, resetCameraView, transitionBearingDeg);
      options?.onVisualReady?.();
      if (moveModeRef.current === 'moving' && !feature._synthetic) {
        void prefetchNeighbors(feature);
      }
      maybeUpgradeToHd();
      return true;
    }

    // Direct SD fetch (~196 KB, ~60-150ms)
    try {
      const img = await loadCorsImageCached(sdUrl, 9000);
      if (!isStillInitialPending()) return false;
      pushImageToSphere(img, feature, desiredHeadingDeg, resetCameraView, transitionBearingDeg);
      options?.onVisualReady?.();
      if (moveModeRef.current === 'moving' && !feature._synthetic) {
        void prefetchNeighbors(feature);
      }
      maybeUpgradeToHd();
      return true;
    } catch {
      // Fallback to thumb only if SD failed
      const thumbUrl = getFeatureThumbUrl(feature);
      if (thumbUrl && thumbUrl !== sdUrl) {
        try {
          const thumbImg = await loadCorsImageCached(thumbUrl, 6000);
          if (!isStillInitialPending()) return false;
          pushImageToSphere(thumbImg, feature, desiredHeadingDeg, resetCameraView, transitionBearingDeg);
          options?.onVisualReady?.();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  };

  // Trigger on-demand HD upgrade if user toggles HD ON mid-round
  useEffect(() => {
    if (!hdQuality || !currentFeatureRef.current) return;
    const f = currentFeatureRef.current;
    const ensureFullAndUpgrade = async () => {
      let fullFeature = f;
      if (f._synthetic && f.id) {
        const fetched = await fetchPanoramaxById(f.id);
        if (fetched) fullFeature = fetched;
      }
      const hdUrl = getFeatureHdUrl(fullFeature);
      if (!hdUrl || !isMountedRef.current || currentFeatureRef.current?.id !== fullFeature.id) return;
      const state = threeRef.current;
      if (state && (state.softGl || state.maxTexSize < 4096)) return;
      try {
        const hdImg = await loadCorsImageCached(hdUrl, 12000);
        if (isMountedRef.current && currentFeatureRef.current?.id === fullFeature.id) {
          pushImageToSphere(hdImg, fullFeature, null, false);
        }
      } catch {
        // ignore
      }
    };
    void ensureFullAndUpgrade();
  }, [hdQuality]);

  // Pre-cached movement along road arrows with subtle forward glide
  const navigateToNeighbor = async (arrow: NavArrow) => {
    if (moveModeRef.current !== 'moving') return;
    const seq = ++navSeqRef.current;

    const cached = getLru(featureCache, arrow.id);
    const nextFeatureCached = cached && !cached._synthetic ? cached : undefined;
    if (!nextFeatureCached) {
      setNavigatingArrowId(arrow.id);
    }

    try {
      const nextFeature = nextFeatureCached || (await fetchPanoramaxById(arrow.id));
      if (seq !== navSeqRef.current || !nextFeature) return;

      const state = threeRef.current;
      const preserveHeading = state ? state.worldHeading : arrow.bearingDeg;
      await applyFeatureToSphere(nextFeature, preserveHeading, {
        isCancelled: () => seq !== navSeqRef.current,
        resetCameraView: false,
        transitionBearingDeg: arrow.bearingDeg,
        onVisualReady: () => {
          if (seq === navSeqRef.current) {
            setNavigatingArrowId(null);
          }
        },
      });
    } catch {
      if (seq === navSeqRef.current) {
        onErrorRef.current('次の地点の画像読み込みに失敗しました。');
      }
    } finally {
      if (seq === navSeqRef.current) {
        setNavigatingArrowId(null);
      }
    }
  };

  const navigateClosestToBearing = (bearingDeg: number) => {
    if (moveModeRef.current !== 'moving') return;
    const arrows = navArrowsRef.current;
    if (arrows.length === 0) return;
    const sorted = [...arrows].sort((a, b) => {
      const diffA = Math.abs(((a.bearingDeg - bearingDeg + 540) % 360) - 180);
      const diffB = Math.abs(((b.bearingDeg - bearingDeg + 540) % 360) - 180);
      return diffA - diffB;
    });
    void navigateToNeighbor(sorted[0]);
  };

  // Load initial panorama for each round
  useEffect(() => {
    if (!target) return;

    const alreadyLoadedThisRound = loadedRoundRef.current.roundKey === roundKey;
    const samePanoAlreadyShown =
      alreadyLoadedThisRound &&
      (!target.panoId || loadedRoundRef.current.panoId === target.panoId);

    if (samePanoAlreadyShown && currentFeatureRef.current) {
      return;
    }

    let cancelled = false;
    let firstFrameShown = false;
    setIsLoadingPano(true);
    setNavigatingArrowId(null);

    const tryFeatureList = async (features: PanoramaxFeature[]): Promise<PanoramaxFeature | null> => {
      if (features.length === 0) return null;

      const ordered = [...features];
      if (!deterministicPick && ordered.length > 1) {
        for (let i = ordered.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
        }
      }

      ordered.sort((a, b) => {
        const aUrl = getFeatureImageUrl(a) || '';
        const bUrl = getFeatureImageUrl(b) || '';
        const aCached = imageCache.has(aUrl) ? 1 : 0;
        const bCached = imageCache.has(bUrl) ? 1 : 0;
        if (aCached !== bCached) return bCached - aCached;

        const aDeg = DEGRADED_HOSTS.has(getHostFromUrl(aUrl)) ? 1 : 0;
        const bDeg = DEGRADED_HOSTS.has(getHostFromUrl(bUrl)) ? 1 : 0;
        if (aDeg !== bDeg) return aDeg - bDeg;

        if (moveMode === 'moving') {
          return extractNavArrows(b).length - extractNavArrows(a).length;
        }
        return 0;
      });

      for (const candidate of ordered.slice(0, 4)) {
        if (cancelled) return null;
        try {
          const ok = await applyFeatureToSphere(candidate, target.heading ?? 0, {
            isCancelled: () => cancelled,
            resetCameraView: true,
            onVisualReady: () => {
              if (!cancelled && !firstFrameShown) {
                firstFrameShown = true;
                setIsLoadingPano(false);
              }
            },
          });
          if (ok) return candidate;
        } catch {
          // Try next candidate
        }
      }
      return null;
    };

    const loadRoundPanorama = async () => {
      try {
        // 0. ULTRA-FAST DIRECT PATH: pre-baked `sdUrl` + `panoId` skips spatial `/search` (~1.3s saved!)
        const synthetic = makeSyntheticFeature(target);
        if (synthetic) {
          // If full metadata is already cached from batch prefetch, prefer it immediately
          const cachedFull = getLru(featureCache, synthetic.id);
          const initialFeature = cachedFull && !cachedFull._synthetic ? cachedFull : synthetic;

          const okDirect = await applyFeatureToSphere(initialFeature, target.heading ?? 0, {
            isCancelled: () => cancelled,
            resetCameraView: true,
            onVisualReady: () => {
              if (!cancelled) setIsLoadingPano(false);
            },
          });

          if (okDirect && !cancelled) {
            startStateRef.current = { feature: initialFeature, heading: target.heading ?? 0 };
            loadedRoundRef.current = { roundKey, panoId: initialFeature.id };
            setIsLoadingPano(false);
            onResolvedRef.current({
              lat: target.lat,
              lng: target.lng,
              panoId: initialFeature.id,
              locationLabel: initialFeature._synthetic ? 'Panoramax (CC-BY-SA-4.0)' : getFeatureAttribution(initialFeature),
            });

            // Non-blocking background metadata fetch ONLY when Moving arrows or HD URL are needed
            if (initialFeature._synthetic && (moveModeRef.current === 'moving' || hdQualityRef.current)) {
              void fetchPanoramaxById(initialFeature.id).then((full) => {
                if (!full || cancelled || activeRoundKeyRef.current !== roundKey) return;
                if (currentFeatureRef.current?.id === full.id) {
                  currentFeatureRef.current = full;
                  startStateRef.current = { feature: full, heading: target.heading ?? 0 };
                  setAttribution(getFeatureAttribution(full));
                  if (moveModeRef.current === 'moving') {
                    const arrows = extractNavArrows(full);
                    navArrowsRef.current = arrows;
                    setNavArrows(arrows);
                    void prefetchNeighbors(full);
                  }
                }
              });
            }
            return;
          }
        }

        // 1. Exact ID lookup (used if sdUrl unavailable/failed or online room sent panoId only)
        if (target.panoId) {
          const byId = await fetchPanoramaxById(target.panoId);
          if (!cancelled && byId) {
            const ok = await applyFeatureToSphere(byId, target.heading ?? 0, {
              isCancelled: () => cancelled,
              resetCameraView: true,
              onVisualReady: () => {
                if (!cancelled) setIsLoadingPano(false);
              },
            });
            if (ok && !cancelled) {
              const [lng, lat] = byId.geometry.coordinates;
              startStateRef.current = { feature: byId, heading: target.heading ?? 0 };
              loadedRoundRef.current = { roundKey, panoId: byId.id };
              setIsLoadingPano(false);
              onResolvedRef.current({
                lat,
                lng,
                panoId: byId.id,
                locationLabel: getFeatureAttribution(byId),
              });
              return;
            }
          }
        }

        // 2. Nearby search fallback
        let resolved: PanoramaxFeature | null = null;
        for (const radius of [12000, 40000]) {
          if (cancelled) return;
          const list = await searchPanoramaxNearby(target.lat, target.lng, radius, 6);
          resolved = await tryFeatureList(list);
          if (resolved) break;
        }

        // 3. Alternate coordinate fallback within same map pack (Solo mode)
        if (!resolved && allowAltFallback && fallbackCoordsRef.current?.length) {
          const alts = [...fallbackCoordsRef.current].sort(() => Math.random() - 0.5).slice(0, 3);
          for (const alt of alts) {
            if (cancelled) return;
            const list = await searchPanoramaxNearby(alt.lat, alt.lng, 15000, 5);
            resolved = await tryFeatureList(list);
            if (resolved) break;
          }
        }

        if (cancelled) return;

        if (!resolved) {
          onErrorRef.current('この地点付近で360°パノラマ画像が見つかりませんでした。');
          setIsLoadingPano(false);
          return;
        }

        const [lng, lat] = resolved.geometry.coordinates;
        startStateRef.current = { feature: resolved, heading: target.heading ?? 0 };
        loadedRoundRef.current = { roundKey, panoId: resolved.id };
        setIsLoadingPano(false);
        onResolvedRef.current({
          lat,
          lng,
          panoId: resolved.id,
          locationLabel: getFeatureAttribution(resolved),
        });
      } catch {
        if (!cancelled) {
          onErrorRef.current('パノラマ画像の読み込み中に通信エラーが発生しました。');
          setIsLoadingPano(false);
        }
      }
    };

    void loadRoundPanorama();

    registerActions({
      resetToStart: () => {
        const start = startStateRef.current;
        if (!start) return;
        navSeqRef.current++;
        setNavigatingArrowId(null);
        const state = threeRef.current;
        if (currentFeatureRef.current?.id === start.feature.id && state) {
          state.velHeading = 0;
          state.velPitch = 0;
          state.animHeadingTarget = normalizeDeg(start.heading);
          state.animPitchTarget = 0;
          state.targetFov = 75;
          state.ensureLoop();
          return;
        }
        void applyFeatureToSphere(start.feature, start.heading, {
          resetCameraView: true,
        }).catch(() => {});
      },
      zoomIn: () => {
        const state = threeRef.current;
        if (!state || moveModeRef.current === 'nmpz') return;
        state.targetFov = Math.max(26, state.targetFov - 14);
        state.ensureLoop();
      },
      zoomOut: () => {
        const state = threeRef.current;
        if (!state || moveModeRef.current === 'nmpz') return;
        state.targetFov = Math.min(98, state.targetFov + 14);
        state.ensureLoop();
      },
      snapNorth: () => {
        const state = threeRef.current;
        if (!state || moveModeRef.current === 'nmpz') return;
        state.velHeading = 0;
        state.animHeadingTarget = 0;
        state.ensureLoop();
      },
    });

    return () => {
      cancelled = true;
    };
  }, [target?.lat, target?.lng, target?.panoId, target?.sdUrl, target?.heading, moveMode, roundKey, allowAltFallback, deterministicPick, registerActions]);

  // Update movement arrows visibility when moveMode changes
  useEffect(() => {
    if (moveMode !== 'moving') {
      navArrowsRef.current = [];
      setNavArrows([]);
    } else if (currentFeatureRef.current) {
      if (currentFeatureRef.current._synthetic && currentFeatureRef.current.id) {
        void fetchPanoramaxById(currentFeatureRef.current.id).then((full) => {
          if (full && currentFeatureRef.current?.id === full.id && moveModeRef.current === 'moving') {
            currentFeatureRef.current = full;
            const arrows = extractNavArrows(full);
            navArrowsRef.current = arrows;
            setNavArrows(arrows);
            void prefetchNeighbors(full);
          }
        });
      } else {
        const arrows = extractNavArrows(currentFeatureRef.current);
        navArrowsRef.current = arrows;
        setNavArrows(arrows);
      }
    }
  }, [moveMode]);

  // Keyboard W / ArrowUp movement & A/D/ArrowLeft/ArrowRight smooth panning
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      const state = threeRef.current;

      if (moveMode !== 'nmpz' && state) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          state.animHeadingTarget = null;
          state.velHeading = -110;
          state.ensureLoop();
          return;
        }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          state.animHeadingTarget = null;
          state.velHeading = 110;
          state.ensureLoop();
          return;
        }
      }

      if (moveMode === 'moving' && (e.code === 'KeyW' || e.code === 'ArrowUp')) {
        if (navArrowsRef.current.length === 0) return;
        e.preventDefault();
        navigateClosestToBearing(latestHeadingRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveMode]);

  const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (moveModeRef.current !== 'moving' || navArrowsRef.current.length === 0) return;
    const state = threeRef.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const normX = ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    const approxClickOffsetDeg = normX * ((state?.fov ?? 75) * 0.55);
    navigateClosestToBearing(normalizeDeg(latestHeadingRef.current + approxClickOffsetDeg));
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-[#070b12]">
      <div
        ref={canvasHostRef}
        onDoubleClick={handleCanvasDoubleClick}
        className="absolute inset-0 w-full h-full"
      />

      {fallback2DUrl && (
        <img
          src={fallback2DUrl}
          alt="Panoramax 360 Street View"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
        />
      )}

      {moveMode === 'nmpz' && (
        <div
          className="absolute inset-0 z-10 cursor-not-allowed"
          title="NMPZモード: 移動・視点操作・ズームは無効です"
        />
      )}

      {moveMode === 'moving' && navArrows.length > 0 && !isLoadingPano && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 pointer-events-none">
          {navArrows.map((arrow) => {
            const relDeg = ((arrow.bearingDeg - cameraHeading + 540) % 360) - 180;
            const isBusy = navigatingArrowId === arrow.id;
            return (
              <button
                key={`${arrow.rel}-${arrow.id}`}
                onClick={() => navigateToNeighbor(arrow)}
                title={`${arrow.label} (${Math.round(arrow.bearingDeg)}°)`}
                className="pointer-events-auto group flex flex-col items-center justify-center w-12 h-12 rounded-full bg-slate-950/85 hover:bg-emerald-500 border border-white/25 hover:border-emerald-300 text-white hover:text-slate-950 shadow-xl transition-all active:scale-90 cursor-pointer"
              >
                {isBusy ? (
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-300" />
                ) : (
                  <ChevronUp
                    ref={(el) => {
                      if (el) arrowIconRefs.current.set(arrow.id, el);
                      else arrowIconRefs.current.delete(arrow.id);
                    }}
                    className="w-6 h-6 will-change-transform"
                    style={{ transform: `rotate(${relDeg}deg)` }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="hidden sm:block absolute bottom-1.5 left-1/2 -translate-x-1/2 z-20 px-2.5 py-0.5 rounded bg-slate-950/80 border border-white/10 text-[10px] text-slate-300 pointer-events-none max-w-[320px] truncate">
        {attribution}
      </div>

      {isLoadingPano && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#090d16]/92">
          <div className="w-11 h-11 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin mb-3" />
          <p className="text-sm font-semibold text-emerald-200 tracking-wide">
            360° パノラマを読み込み中...
          </p>
        </div>
      )}
    </div>
  );
};
