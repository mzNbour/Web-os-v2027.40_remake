import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoCoord } from '../../../data/geoguessrLocations';

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const FALLBACK_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
const FALLBACK_TILE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, OpenStreetMap contributors';

function attachResilientTileLayer(map: L.Map): void {
  let errorCount = 0;
  let switchedToFallback = false;

  const layer = L.tileLayer(OSM_TILE_URL, {
    maxZoom: 19,
    attribution: OSM_TILE_ATTRIBUTION,
    keepBuffer: 2,
    updateWhenIdle: false,
  }).addTo(map);

  layer.on('tileerror', () => {
    if (switchedToFallback) return;
    errorCount += 1;
    if (errorCount >= 3) {
      switchedToFallback = true;
      layer.setUrl(FALLBACK_TILE_URL);
      const attrEl = map.attributionControl;
      if (attrEl) {
        attrEl.removeAttribution(OSM_TILE_ATTRIBUTION);
        attrEl.addAttribution(FALLBACK_TILE_ATTRIBUTION);
      }
    }
  });
}

function createPinIcon(color: string, label?: string): L.DivIcon {
  if (label) {
    return L.divIcon({
      className: 'geo-custom-marker',
      html: `<div style="transform:translate(-50%,-50%);background:${color};color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:9999px;border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.45);white-space:nowrap;">${label}</div>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }
  return L.divIcon({
    className: 'geo-custom-marker',
    html: `<svg width="26" height="34" viewBox="0 0 26 34" style="filter:drop-shadow(0 3px 6px rgba(0,0,0,0.45));display:block;"><path d="M13 1C6.4 1 1 6.4 1 13c0 8.5 12 20 12 20s12-11.5 12-20C25 6.4 19.6 1 13 1z" fill="${color}" stroke="#ffffff" stroke-width="2.2"/><circle cx="13" cy="13" r="4.2" fill="#ffffff"/></svg>`,
    iconSize: [26, 34],
    iconAnchor: [13, 33],
  });
}

function createFlagIcon(numberLabel?: string): L.DivIcon {
  const inner = numberLabel
    ? `<span style="font-size:11px;font-weight:900;color:#fff;">${numberLabel}</span>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" stroke="#fff" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`;
  return L.divIcon({
    className: 'geo-custom-flag',
    html: `<div style="transform:translate(-50%,-50%);width:28px;height:28px;border-radius:9999px;background:#10b981;border:2.5px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;">${inner}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

interface LeafletMiniMapProps {
  defaultCenter: GeoCoord;
  defaultZoom: number;
  roundKey: string;
  guessPin: GeoCoord | null;
  disabled?: boolean;
  onMapClick: (coord: GeoCoord) => void;
}

export const LeafletMiniMap: React.FC<LeafletMiniMapProps> = ({
  defaultCenter,
  defaultZoom,
  roundKey,
  guessPin,
  disabled = false,
  onMapClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onClickRef = useRef(onMapClick);
  const disabledRef = useRef(disabled);
  onClickRef.current = onMapClick;
  disabledRef.current = disabled;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [defaultCenter.lat, defaultCenter.lng],
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 85,
      inertia: true,
      inertiaDeceleration: 2800,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    attachResilientTileLayer(map);
    map.attributionControl.setPrefix('');

    map.on('click', (evt: L.LeafletMouseEvent) => {
      if (disabledRef.current) return;
      const wrapped = evt.latlng.wrap();
      onClickRef.current({
        lat: Number(wrapped.lat.toFixed(6)),
        lng: Number(wrapped.lng.toFixed(6)),
      });
    });

    mapRef.current = map;

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);

    const initTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 60);

    return () => {
      window.clearTimeout(initTimer);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Reset center/zoom on new round
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([defaultCenter.lat, defaultCenter.lng], defaultZoom, { animate: false });
  }, [roundKey, defaultCenter.lat, defaultCenter.lng, defaultZoom]);

  // Sync guess pin marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!guessPin) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([guessPin.lat, guessPin.lng], {
        icon: createPinIcon('#f43f5e'),
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([guessPin.lat, guessPin.lng]);
    }
  }, [guessPin]);

  return <div ref={containerRef} className="w-full h-full cursor-crosshair bg-slate-800" />;
};

export interface ResultPinEntry {
  key: string;
  coord: GeoCoord;
  actual: GeoCoord;
  color: string;
  label?: string;
}

export interface ResultRoundPlot {
  roundNumber: number;
  actual: GeoCoord;
  guesses: Array<{
    key: string;
    coord: GeoCoord;
    color: string;
    label?: string;
  }>;
  showRoundNumber?: boolean;
}

interface LeafletResultMapProps {
  plots: ResultRoundPlot[];
  fallbackCenter: GeoCoord;
}

export const LeafletResultMap: React.FC<LeafletResultMapProps> = ({ plots, fallbackCenter }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [fallbackCenter.lat, fallbackCenter.lng],
      zoom: 3,
      zoomControl: true,
      attributionControl: true,
      worldCopyJump: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 85,
      inertia: true,
      inertiaDeceleration: 2800,
      fadeAnimation: true,
      zoomAnimation: true,
    });

    attachResilientTileLayer(map);
    map.attributionControl.setPrefix('');

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);

    const initTimer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 60);

    return () => {
      window.clearTimeout(initTimer);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const boundsPoints: L.LatLngExpression[] = [];

    for (const plot of plots) {
      const actualLatLng: [number, number] = [plot.actual.lat, plot.actual.lng];
      boundsPoints.push(actualLatLng);

      L.marker(actualLatLng, {
        icon: createFlagIcon(plot.showRoundNumber ? String(plot.roundNumber) : undefined),
        zIndexOffset: 200,
      }).addTo(group);

      for (const g of plot.guesses) {
        // Adjust longitude wrap so line takes shortest path across dateline
        let gLng = g.coord.lng;
        if (Math.abs(gLng - plot.actual.lng) > 180) {
          gLng += gLng < plot.actual.lng ? 360 : -360;
        }
        const guessLatLng: [number, number] = [g.coord.lat, gLng];
        boundsPoints.push(guessLatLng);

        L.polyline([guessLatLng, actualLatLng], {
          color: g.color,
          weight: 3,
          opacity: 0.9,
          dashArray: '6 5',
        }).addTo(group);

        L.marker(guessLatLng, {
          icon: createPinIcon(g.color, g.label),
          zIndexOffset: 100,
        }).addTo(group);
      }
    }

    if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 11, { animate: false });
    } else if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14, animate: false });
    }
  }, [plots]);

  return <div ref={containerRef} className="w-full h-full bg-slate-900" />;
};
