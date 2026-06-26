/* =============================================================================
 * core-map.js — Khởi tạo bản đồ Leaflet dùng chung
 * Hợp nhất initializeMap của 2 dự án (lớp nền OSM/Google/vệ tinh + MarkerCluster
 * + lớp nhãn). Cần Leaflet + Leaflet.markercluster đã nạp.
 *
 * Phụ thuộc: L (Leaflet), L.markerClusterGroup. Tùy chọn window.CSGT_CONFIG.
 * Xuất: window.CSGT.map
 * ========================================================================== */
(function (global) {
  'use strict';
  const CSGT = (global.CSGT = global.CSGT || {});

  const SUB = ['mt0', 'mt1', 'mt2', 'mt3'];
  const T = {
    osm:       'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    googleMap: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    googleSat: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    googleHybrid: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    cartoLabels: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
  };

  // @param elementId  id div bản đồ
  // @param opts       { center=[10.762622,106.660172], zoom=13, maxZoom=22,
  //                     mobile=false, labelMinZoom=14 }
  // @return { map, cluster, labelLayer, layers }
  function createMap(elementId, opts = {}) {
    if (typeof L === 'undefined') throw new Error('Leaflet (L) chưa được nạp.');
    const {
      center = [10.762622, 106.660172], zoom = 13, maxZoom = 22,
      mobile = false, labelMinZoom = 14,
    } = opts;

    const googleMap    = L.tileLayer(T.googleMap,    { maxZoom, subdomains: SUB, attribution: '© Google' });
    const osm          = L.tileLayer(T.osm,          { maxZoom, attribution: '© OpenStreetMap' });
    const googleSat    = L.tileLayer(T.googleSat,    { maxZoom, subdomains: SUB, attribution: '© Google' });
    const googleHybrid = L.tileLayer(T.googleHybrid, { maxZoom, subdomains: SUB, attribution: '© Google' });
    const streetLabels = L.tileLayer(T.cartoLabels,  { maxZoom, attribution: '© CartoDB', pane: 'shadowPane' });

    const map = L.map(elementId, { center, zoom, maxZoom, layers: [googleMap] });
    if (mobile) {
      map.options.zoomAnimation = false;
      map.options.markerZoomAnimation = false;
      map.options.fadeAnimation = false;
    }
    if (map.zoomControl) map.zoomControl.setPosition('topright');

    const cluster = L.markerClusterGroup({
      disableClusteringAtZoom: mobile ? 16 : 15,
      maxClusterRadius: mobile ? 80 : 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      chunkedLoading: true,
    });
    const labelLayer = L.layerGroup();

    L.control.layers(
      {
        '🗺 Google Maps': googleMap,
        'OpenStreetMap': osm,
        'Vệ tinh (Google)': googleSat,
        '🛰 Vệ tinh + tên đường': googleHybrid,
      },
      { '🏷 Nhãn tên đường': streetLabels },
      { position: 'topright' }
    ).addTo(map);

    map.addLayer(cluster);
    if (map.getZoom() > labelMinZoom) map.addLayer(labelLayer);

    // Tự ẩn/hiện lớp nhãn theo mức zoom
    map.on('zoomend', () => {
      if (map.getZoom() > labelMinZoom) {
        if (!map.hasLayer(labelLayer)) map.addLayer(labelLayer);
      } else if (map.hasLayer(labelLayer)) {
        map.removeLayer(labelLayer);
      }
    });

    return { map, cluster, labelLayer, layers: { googleMap, osm, googleSat, googleHybrid, streetLabels } };
  }

  // Tiện ích tạo nhãn text nổi trên marker (số trụ)
  function makeLabel(latlng, text) {
    return L.marker(latlng, {
      icon: L.divIcon({ className: 'custom-label', html: '<div>' + text + '</div>', iconSize: [80, 16], iconAnchor: [40, 22] }),
    });
  }

  CSGT.map = { createMap, makeLabel, TILES: T };
})(typeof window !== 'undefined' ? window : globalThis);
