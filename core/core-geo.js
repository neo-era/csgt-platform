/* =============================================================================
 * core-geo.js — Reverse geocode (Nominatim) + định tuyến (OSRM)
 * Hợp nhất reverseGeocode (2 dự án) + fetchMotorbikeRoute (lighting-survey).
 *
 * Phụ thuộc: không (fetch). Tùy chọn L (Leaflet) cho drawRoute.
 * Xuất: window.CSGT.geo
 * ========================================================================== */
(function (global) {
  'use strict';
  const CSGT = (global.CSGT = global.CSGT || {});

  // Trả về object address của Nominatim (road, suburb, quarter, ...), hoặc null.
  async function reverseGeocode(lat, lon) {
    try {
      const url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat +
        '&lon=' + lon + '&accept-language=vi&addressdetails=1';
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      return data.address || null;
    } catch (e) { return null; }
  }

  // Lấy tên đường từ address Nominatim
  function roadFromAddress(a) {
    if (!a) return '';
    return a.road || a.pedestrian || a.footway || a.path || '';
  }

  // Định tuyến xe máy/ô tô qua OSRM, trả route đầu tiên (geometry GeoJSON, distance, duration)
  async function route(origin, destination) {
    const url = 'https://router.project-osrm.org/route/v1/driving/' +
      origin[1] + ',' + origin[0] + ';' + destination[1] + ',' + destination[0] +
      '?overview=full&geometries=geojson';
    const r = await fetch(url);
    if (!r.ok) throw new Error('Không thể tải lộ trình.');
    const data = await r.json();
    if (!data.routes || !data.routes.length || data.code !== 'Ok') throw new Error('Không tìm thấy lộ trình.');
    return data.routes[0];
  }

  // Vẽ route lên map (cần Leaflet). Trả về layer để xóa sau.
  function drawRoute(map, routeObj, style) {
    if (typeof L === 'undefined') return null;
    const line = L.geoJSON(routeObj.geometry, {
      style: style || { color: '#ef4444', weight: 5, opacity: 0.8 },
    }).addTo(map);
    if (line.getBounds) map.fitBounds(line.getBounds().pad(0.15));
    return line;
  }

  CSGT.geo = { reverseGeocode, roadFromAddress, route, drawRoute };
})(typeof window !== 'undefined' ? window : globalThis);
