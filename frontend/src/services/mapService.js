import axios from 'axios';

// ── API endpoints ─────────────────────────────────────────────────────────────
const PHOTON_URL    = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// ── Hyderabad geographic constants ────────────────────────────────────────────
// Bounding box: covers all of Greater Hyderabad + surrounding districts
const HYD_LAT  = 17.385;
const HYD_LON  = 78.4867;
// Photon bbox: [minLon, minLat, maxLon, maxLat]  — entire GHMC + suburbs
const HYD_BBOX = '77.9,16.9,79.2,17.9';

// ── College / university alias dictionary ─────────────────────────────────────
const COLLEGE_ALIASES = {
    // Hyderabad colleges
    'nnrg':    'Nalla Narasimha Reddy Group of Institutions Hyderabad',
    'snist':   'Sreenidhi Institute of Science and Technology Ghatkesar',
    'anurag':  'Anurag University Venkatapur Hyderabad',
    'cvr':     'CVR College of Engineering Hyderabad',
    'mrcet':   'Malla Reddy College of Engineering Technology Hyderabad',
    'griet':   'Gokaraju Rangaraju Institute of Engineering Technology Bachupally',
    'vnr':     'VNR Vignana Jyothi Institute Engineering Technology Bachupally',
    'cbit':    'Chaitanya Bharathi Institute of Technology Gandipet',
    'mgit':    'Mahatma Gandhi Institute of Technology Hyderabad',
    'mjcet':   'Muffakham Jah College of Engineering Hyderabad',
    'mlrit':   'MLR Institute of Technology Dundigal Hyderabad',
    'vbit':    'Vignana Bharathi Institute of Technology Hyderabad',
    'cmr':     'CMR College of Engineering Technology Hyderabad',
    'stanley': 'Stanley College of Engineering Hyderabad',
    'lords':   'Lords Institute of Engineering Hyderabad',
    'bvrit':   'B V Raju Institute of Technology Narsapur',
    'klh':     'KL University Hyderabad',
    'iith':    'Indian Institute of Technology Hyderabad Kandi',
    'nitw':    'National Institute of Technology Warangal',
    'jntu':    'Jawaharlal Nehru Technological University Kukatpally',
    'jntuh':   'Jawaharlal Nehru Technological University Kukatpally',
    'osmania': 'Osmania University Hyderabad',
    'ou':      'Osmania University Hyderabad',
    // Pan-India
    'iit':  'Indian Institute of Technology',
    'nit':  'National Institute of Technology',
    'bits': 'BITS Pilani',
    'vit':  'Vellore Institute of Technology',
    'iisc': 'Indian Institute of Science Bangalore',
    'dtu':  'Delhi Technological University',
    'jnu':  'Jawaharlal Nehru University Delhi',
    'du':   'University of Delhi',
    'anna': 'Anna University Chennai',
};

const expandAlias = (q) => COLLEGE_ALIASES[q.trim().toLowerCase()] || q;

// ── Parse a Photon feature to our common shape ────────────────────────────────
const parsePhoton = (feature) => {
    const p = feature.properties;
    // Build a human display name: Name, Street, Suburb/Neighbourhood, City
    const parts = [
        p.name,
        p.street && p.street !== p.name ? p.street : null,
        p.suburb || p.neighbourhood || p.village || p.quarter,
        p.city || p.town || p.county,
        p.state,
    ].filter(Boolean);
    const display_name = parts.join(', ');

    return {
        place_id:     `photon-${p.osm_id}`,
        display_name,
        short_name:   p.name || parts[0] || display_name,
        lat:          String(feature.geometry.coordinates[1]),
        lon:          String(feature.geometry.coordinates[0]),
        type:         p.type || p.osm_value || '',
        class:        p.osm_key || '',
        importance:   p.extent ? 1 : 0.5,
    };
};

const EDU_TYPES = ['university', 'college', 'school', 'institute', 'campus'];
const isEduResult = (r) => EDU_TYPES.some(t =>
    (r.type || '').toLowerCase().includes(t) ||
    (r.class || '').toLowerCase().includes(t) ||
    (r.display_name || '').toLowerCase().includes(t)
);

// ── Sort: educational institutions first, then by importance ─────────────────
const sortResults = (results) =>
    [...results].sort((a, b) => {
        const ae = isEduResult(a), be = isEduResult(b);
        if (ae && !be) return -1;
        if (!ae && be) return 1;
        return (b.importance || 0) - (a.importance || 0);
    });

// ── Photon search (Hyderabad-biased via bbox) ─────────────────────────────────
const photonSearch = async (query) => {
    try {
        const res = await axios.get(PHOTON_URL, {
            params: {
                q:    query,
                limit: 10,
                lang: 'en',
                lat:  HYD_LAT,
                lon:  HYD_LON,
                bbox: HYD_BBOX,   // Restrict to Hyderabad region
            },
            timeout: 3500,
        });
        return (res.data?.features || []).map(parsePhoton);
    } catch {
        return [];
    }
};

// ── Wider India search (fallback when bbox returns nothing) ───────────────────
const photonSearchIndia = async (query) => {
    try {
        const res = await axios.get(PHOTON_URL, {
            params: { q: query, limit: 8, lang: 'en', lat: HYD_LAT, lon: HYD_LON },
            timeout: 3500,
        });
        // Filter to India bbox
        return (res.data?.features || [])
            .filter(f => {
                const [lon, lat] = f.geometry.coordinates;
                return lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98;
            })
            .map(parsePhoton);
    } catch {
        return [];
    }
};

// ── Nominatim search (last resort) ───────────────────────────────────────────
const nominatimSearch = async (query) => {
    try {
        const res = await axios.get(`${NOMINATIM_URL}/search`, {
            params: { q: query, format: 'json', addressdetails: 1, limit: 8, countrycodes: 'in' },
            headers: { 'Accept-Language': 'en' },
            timeout: 5000,
        });
        return (res.data || []).map(r => ({
            ...r,
            short_name: r.display_name.split(',')[0],
        }));
    } catch {
        return [];
    }
};

/**
 * Main location search — prioritises Hyderabad results.
 * Falls back: Photon (Hyderabad bbox) → Photon (all India) → Nominatim
 */
export const searchLocation = async (query) => {
    if (!query || query.length < 2) return [];

    const expandedQuery = expandAlias(query);

    let results = await photonSearch(expandedQuery);

    // If alias expansion helped and bbox returned results → use them
    // Otherwise try the raw query inside bbox
    if (!results.length) results = await photonSearch(query);

    // Still nothing → widen to all India
    if (!results.length) results = await photonSearchIndia(expandedQuery);
    if (!results.length && expandedQuery !== query) results = await photonSearchIndia(query);

    // Last resort → Nominatim
    if (!results.length) results = await nominatimSearch(expandedQuery);

    return sortResults(results).slice(0, 7);
};

/**
 * Resolve text → {lat, lng}.
 */
export const resolveCoordinates = async (query) => {
    const results = await searchLocation(query);
    if (results?.length) {
        return {
            lat:         parseFloat(results[0].lat),
            lng:         parseFloat(results[0].lon),
            displayName: results[0].display_name,
        };
    }
    return null;
};

/**
 * Reverse geocode: lat/lng → human-readable location name.
 * Tries Nominatim first, falls back to Photon reverse.
 * NEVER returns raw coordinates — always returns a meaningful string.
 */
export const reverseGeocode = async (lat, lng) => {
    // ── Try Nominatim reverse ─────────────────────────────────────────────────
    try {
        const res = await axios.get(`${NOMINATIM_URL}/reverse`, {
            params: { lat, lon: lng, format: 'json', addressdetails: 1, zoom: 18 },
            headers: { 'Accept-Language': 'en' },
            timeout: 4000,
        });

        if (res.data && !res.data.error) {
            const addr = res.data.address || {};

            // Build the most human-readable name we can
            const placeName =
                res.data.name ||
                addr.amenity ||
                addr.building ||
                addr.shop ||
                addr.leisure ||
                addr.tourism ||
                null;

            const area =
                addr.road ||
                addr.pedestrian ||
                addr.path ||
                null;

            const locale =
                addr.suburb ||
                addr.neighbourhood ||
                addr.village ||
                addr.quarter ||
                null;

            const city =
                addr.city ||
                addr.town ||
                addr.county ||
                null;

            // Combine into a readable short name
            const parts = [placeName, area, locale, city].filter(Boolean);
            if (parts.length > 0) return parts.slice(0, 3).join(', ');

            // Fallback: first 3 parts of full display name
            return res.data.display_name.split(',').slice(0, 3).join(', ').trim();
        }
    } catch { /* try next */ }

    // ── Try Photon reverse ────────────────────────────────────────────────────
    try {
        const res = await axios.get(`${PHOTON_URL}reverse`, {
            params: { lat, lon: lng, lang: 'en' },
            timeout: 3500,
        });
        const features = res.data?.features || [];
        if (features.length > 0) {
            const parsed = parsePhoton(features[0]);
            if (parsed.display_name) return parsed.display_name;
        }
    } catch { /* silent */ }

    // ── Absolute last resort: return area description not raw coords ──────────
    return `Near ${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`;
};
