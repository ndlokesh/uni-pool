import axios from 'axios';

// ── Photon (by Komoot) – much faster than Nominatim, no API key needed ─────────
// Docs: https://photon.komoot.io
const PHOTON_URL = 'https://photon.komoot.io/api/';

// ── Nominatim as secondary fallback ─────────────────────────────────────────────
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// ── India geographic center bias ──────────────────────────────────────────────
const INDIA_LAT = 20.5937;
const INDIA_LON = 78.9629;

// ── College / university shorthand → full name ───────────────────────────────
const COLLEGE_ALIASES = {
    // Hyderabad
    'nnrg':    'Nalla Narasimha Reddy Group of Institutions Hyderabad',
    'snist':   'Sreenidhi Institute of Science and Technology Hyderabad',
    'anurag':  'Anurag University Hyderabad',
    'anurag college': 'Anurag College of Engineering Hyderabad',
    'cvr':     'CVR College of Engineering Hyderabad',
    'mrcet':   'Malla Reddy College of Engineering Technology Hyderabad',
    'griet':   'Gokaraju Rangaraju Institute of Engineering Technology Hyderabad',
    'vnr':     'VNR Vignana Jyothi Institute Engineering Technology Hyderabad',
    'vnrvjiet':'VNR Vignana Jyothi Institute Engineering Technology Hyderabad',
    'cbit':    'Chaitanya Bharathi Institute of Technology Hyderabad',
    'mgit':    'Mahatma Gandhi Institute of Technology Hyderabad',
    'mjcet':   'Muffakham Jah College of Engineering Hyderabad',
    'mlrit':   'MLR Institute of Technology Hyderabad',
    'vbit':    'Vignana Bharathi Institute of Technology Hyderabad',
    'cmr':     'CMR College of Engineering Technology Hyderabad',
    'stanley': 'Stanley College of Engineering Hyderabad',
    'lords':   'Lords Institute of Engineering Hyderabad',
    'vignan':  'Vignan Institute of Technology Hyderabad',
    'bvrit':   'B V Raju Institute of Technology',
    'klh':     'KL University Hyderabad',
    'hit':     'Hyderabad Institute of Technology and Management',
    'jntu':    'Jawaharlal Nehru Technological University Hyderabad',
    'jntuh':   'Jawaharlal Nehru Technological University Hyderabad',
    'jntuk':   'Jawaharlal Nehru Technological University Kakinada',
    'jntua':   'Jawaharlal Nehru Technological University Anantapur',
    'osmania': 'Osmania University Hyderabad',
    'iith':    'Indian Institute of Technology Hyderabad',
    'nitw':    'National Institute of Technology Warangal',
    'kcet':    'Kakatiya College of Engineering Warangal',
    'klu':     'KL University Vijayawada',
    // Pan-India
    'iit':     'Indian Institute of Technology',
    'nit':     'National Institute of Technology',
    'bits':    'BITS Pilani',
    'vit':     'Vellore Institute of Technology',
    'iitb':    'Indian Institute of Technology Bombay',
    'iitd':    'Indian Institute of Technology Delhi',
    'iitm':    'Indian Institute of Technology Madras',
    'iitk':    'Indian Institute of Technology Kanpur',
    'iisc':    'Indian Institute of Science Bangalore',
    'dtu':     'Delhi Technological University',
    'nsit':    'Netaji Subhas University of Technology Delhi',
    'jnu':     'Jawaharlal Nehru University Delhi',
    'du':      'University of Delhi',
    'jamia':   'Jamia Millia Islamia Delhi',
    'coep':    'College of Engineering Pune',
    'vjti':    'Veermata Jijabai Technological Institute Mumbai',
    'rvce':    'RV College of Engineering Bangalore',
    'msrit':   'MS Ramaiah Institute of Technology Bangalore',
    'pes':     'PES University Bangalore',
    'nitk':    'National Institute of Technology Karnataka Surathkal',
    'anna':    'Anna University Chennai',
    'nitt':    'National Institute of Technology Tiruchirappalli',
    'psg':     'PSG College of Technology Coimbatore',
    'au':      'Andhra University Visakhapatnam',
    'rgukt':   'Rajiv Gandhi University of Knowledge Technologies',
    'ju':      'Jadavpur University Kolkata',
    'aiims':   'AIIMS New Delhi',
};

const expandAlias = (q) => COLLEGE_ALIASES[q.trim().toLowerCase()] || q;

// ── Parse Photon feature into a common shape ─────────────────────────────────
const parsePhoton = (feature) => {
    const p = feature.properties;
    const name = [p.name, p.street, p.city, p.state, p.country]
        .filter(Boolean).join(', ');
    return {
        place_id:     `photon-${feature.properties.osm_id}`,
        display_name: name,
        lat:          String(feature.geometry.coordinates[1]),
        lon:          String(feature.geometry.coordinates[0]),
        type:         p.type || p.osm_value || '',
        class:        p.osm_key || '',
        importance:   p.extent ? 1 : 0.5,
    };
};

const EDU_TYPES = ['university', 'college', 'school', 'institute', 'campus'];
const isEdu = (r) => EDU_TYPES.some(t => r.type?.toLowerCase().includes(t) || r.class?.toLowerCase().includes(t));

// ── Primary search using Photon ───────────────────────────────────────────────
const photonSearch = async (query) => {
    try {
        const res = await axios.get(PHOTON_URL, {
            params: {
                q:       query,
                limit:   10,
                lang:    'en',
                lat:     INDIA_LAT,
                lon:     INDIA_LON,
            },
            timeout: 3000,
        });
        if (!res.data?.features?.length) return [];
        // Filter to India only (bbox: lon 68–98, lat 6–37)
        return res.data.features
            .filter(f => {
                const [lon, lat] = f.geometry.coordinates;
                return lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98;
            })
            .map(parsePhoton);
    } catch {
        return [];
    }
};

// ── Fallback search using Nominatim ──────────────────────────────────────────
const nominatimSearch = async (query) => {
    try {
        const res = await axios.get(NOMINATIM_URL, {
            params: { q: query, format: 'json', addressdetails: 1, limit: 8, countrycodes: 'in' },
            headers: { 'Accept-Language': 'en' },
            timeout: 5000,
        });
        return res.data || [];
    } catch {
        return [];
    }
};

// ── Sort: educational institutions first, then by importance ─────────────────
const sortResults = (results) =>
    [...results].sort((a, b) => {
        const ae = isEdu(a), be = isEdu(b);
        if (ae && !be) return -1;
        if (!ae && be) return 1;
        return (b.importance || 0) - (a.importance || 0);
    });

/**
 * Main location search — tries Photon first, falls back to Nominatim.
 * Automatically expands college abbreviations.
 */
export const searchLocation = async (query) => {
    if (!query || query.length < 2) return [];

    const expandedQuery = expandAlias(query);

    // Try Photon with expanded query first
    let results = await photonSearch(expandedQuery);

    // If alias expansion changed the query and Photon returned nothing, try original
    if (!results.length && expandedQuery !== query) {
        results = await photonSearch(query);
    }

    // If Photon failed entirely, fall back to Nominatim
    if (!results.length) {
        results = await nominatimSearch(expandedQuery);
        if (!results.length && expandedQuery !== query) {
            results = await nominatimSearch(query);
        }
    }

    return sortResults(results).slice(0, 6);
};

/**
 * Resolve a text query to {lat, lng}. Returns null if not found.
 */
export const resolveCoordinates = async (query) => {
    const results = await searchLocation(query);
    if (results?.length) {
        return {
            lat: parseFloat(results[0].lat),
            lng: parseFloat(results[0].lon),
            displayName: results[0].display_name,
        };
    }
    return null;
};

/**
 * Reverse geocode: converts {lat, lng} → human-readable address string.
 * Returns a short name like "Sreenidhi Institute, Ghatkesar, Hyderabad".
 */
export const reverseGeocode = async (lat, lng) => {
    try {
        const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat, lon: lng, format: 'json', addressdetails: 1, zoom: 17 },
            headers: { 'Accept-Language': 'en' },
            timeout: 4000,
        });
        if (res.data?.display_name) {
            // Build a short, readable name: "Name, Area, City"
            const addr = res.data.address || {};
            const parts = [
                res.data.name || addr.amenity || addr.building || addr.road,
                addr.suburb || addr.neighbourhood || addr.village,
                addr.city || addr.town || addr.county,
            ].filter(Boolean);
            return parts.length ? parts.join(', ') : res.data.display_name.split(',').slice(0, 2).join(', ');
        }
    } catch {
        // silently fall back
    }
    return null;
};
