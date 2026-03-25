import axios from 'axios';

// ── API endpoints ─────────────────────────────────────────────────────────────
const PHOTON_URL    = 'https://photon.komoot.io/api/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// ── Hyderabad geographic center (Panjagutta) ──────────────────────────────────
const HYD_LAT = 17.4065;
const HYD_LON = 78.4772;

// ── Popular Hyderabad locations — instant local suggestions ───────────────────
// These appear instantly without an API call when query matches
const HYD_LOCATIONS = [
    // GHMC Circles / Main Areas
    'Banjara Hills','Jubilee Hills','Madhapur','Gachibowli','Kondapur','Kukatpally',
    'Miyapur','KPHB Colony','Hitech City','Cyberabad','Begumpet','Secunderabad',
    'Ameerpet','Dilsukhnagar','LB Nagar','Mehdipatnam','Attapur','Tolichowki',
    'Manikonda','Narsingi','Kokapet','Financial District','Nanakramguda',
    'Raidurgam','Hafeezpet','Chandanagar','Lingampally','Nizampet','Bachupally',
    'Kompally','Medchal','Shamirpet','Quthbullapur','Jeedimetla','Balanagar',
    'Bowenpally','Trimulgherry','Malkajgiri','Uppal','LB Nagar','Vanasthalipuram',
    'Hayathnagar','Nagole','Boduppal','Ghatkesar','Keesara','Medipally',
    'Peerzadiguda','Yapral','AS Rao Nagar','ECIL','Nacharam','Kushaiguda',
    'Ramanthapur','Tarnaka','Sainikpuri','Kapra','Cherlapally','Alwal',
    'Old Town Secunderabad','Marredpally','Karkhana','Chilkalguda',
    'Padmarao Nagar','Musheerabad','Gandhinagar Hyderabad','Himayathnagar',
    'Narayanguda','Basheerbagh','Nampally','Abids','Koti','Charminar',
    'Falaknuma','Santoshnagar','Malakpet','Amberpet','Nallakunta',
    'Vidyanagar Hyderabad','Saidabad','Chandrayangutta','Bahadurpura',
    'Rajendranagar','Shamshabad','Narsingi','Tellapur','Gopanpally',
    'Khajaguda','Puppalaguda','Manikonda','Langer Houz','Kismatpur',
    'Gandipet','Mokila','Tukkuguda','Adibatla','Kothur','Maheshwaram',
    // Famous Roads & Junctions
    'Road No 36 Jubilee Hills','Road No 45 Jubilee Hills','Panjagutta',
    'Punjagutta Circle','Film Nagar','Masab Tank','Lakdikapul',
    'Khairatabad','Yellareddiguda','Erragadda','Sanathnagar',
    'Moosapet','Sultan Bazar','Secunderabad Station','Hyderabad Station',
    'Kacheguda Station','Nampally Station','Hitech City Metro','MGBS',
    // Landmarks
    'Hussain Sagar','Tank Bund','Lumbini Park','NTR Gardens','Birla Temple',
    'Golconda Fort','Charminar','Mecca Masjid','Chowmahalla Palace',
    'Salar Jung Museum','Nehru Zoological Park','Ramoji Film City',
    'IKEA Hyderabad','INORBIT Mall','GVK One Mall','Forum Mall Kukatpally',
    'PVP Mall Vijayawada','City Centre Mall','Shilparamam','Lad Bazaar',
    'Laad Bazaar','Paradise Biryani','Hotel Taj Krishna','Novotel Hitech City',
    // Colleges & Universities
    'SNIST Ghatkesar','NNRG Ghatkesar','Anurag University Venkatapur',
    'CVR College Hyderabad','GRIET Bachupally','VNR VJIET Bachupally',
    'CBIT Gandipet','JNTUH Kukatpally','Osmania University Hyderabad',
    'IIT Hyderabad Kandi','University of Hyderabad Gachibowli',
    'MGIT Hyderabad','MRCET Hyderabad','Sreenidhi Institute Ghatkesar',
    'Stanley College Hyderabad','MLR Institute Dundigal',
];

// ── College / university short alias → full name ──────────────────────────────
const COLLEGE_ALIASES = {
    'nnrg':    'Nalla Narasimha Reddy Group of Institutions Ghatkesar Hyderabad',
    'snist':   'Sreenidhi Institute of Science and Technology Ghatkesar',
    'anurag':  'Anurag University Venkatapur Hyderabad',
    'cvr':     'CVR College of Engineering Ibrahimpatan Hyderabad',
    'mrcet':   'Malla Reddy College of Engineering Technology Hyderabad',
    'griet':   'Gokaraju Rangaraju Institute of Engineering Technology Bachupally',
    'vnr':     'VNR Vignana Jyothi Institute Engineering Technology Bachupally',
    'vnrvjiet':'VNR Vignana Jyothi Institute Engineering Technology Bachupally',
    'cbit':    'Chaitanya Bharathi Institute of Technology Gandipet',
    'mgit':    'Mahatma Gandhi Institute of Technology Kokapet Hyderabad',
    'mjcet':   'Muffakham Jah College of Engineering Hyderabad',
    'mlrit':   'MLR Institute of Technology Dundigal Hyderabad',
    'vbit':    'Vignana Bharathi Institute of Technology Hyderabad',
    'cmr':     'CMR College of Engineering Technology Medchal',
    'stanley': 'Stanley College of Engineering Abids Hyderabad',
    'lords':   'Lords Institute of Engineering Himayatnagar Hyderabad',
    'bvrit':   'B V Raju Institute of Technology Narsapur Medak',
    'klh':     'KL University Hyderabad Bachupally',
    'iith':    'Indian Institute of Technology Hyderabad Kandi Sangareddy',
    'nitw':    'National Institute of Technology Warangal',
    'jntu':    'Jawaharlal Nehru Technological University Kukatpally Hyderabad',
    'jntuh':   'Jawaharlal Nehru Technological University Kukatpally Hyderabad',
    'osmania': 'Osmania University Amberpet Hyderabad',
    'ou':      'Osmania University Amberpet Hyderabad',
    'uoh':     'University of Hyderabad Gachibowli',
    'iit':     'Indian Institute of Technology',
    'nit':     'National Institute of Technology',
    'bits':    'BITS Pilani',
    'vit':     'Vellore Institute of Technology',
    'iisc':    'Indian Institute of Science Bangalore',
    'anna':    'Anna University Chennai',
};

const expandAlias = (q) => COLLEGE_ALIASES[q.trim().toLowerCase()] || q;

// ── Match against local HYD_LOCATIONS list ────────────────────────────────────
const localSuggest = (query) => {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return [];
    const matches = HYD_LOCATIONS.filter(loc => loc.toLowerCase().includes(q));
    return matches.slice(0, 5).map((name, i) => ({
        place_id:     `local-${i}-${name}`,
        display_name: `${name}, Hyderabad, Telangana`,
        short_name:   name,
        lat:          String(HYD_LAT + (Math.random() - 0.5) * 0.01), // approx center
        lon:          String(HYD_LON + (Math.random() - 0.5) * 0.01),
        type:         'locality',
        class:        'place',
        importance:   0.9,
        isLocalHint:  true, // flag: coordinates will be geocoded properly
    }));
};

// ── Parse Photon feature → common shape ──────────────────────────────────────
const parsePhoton = (feature) => {
    const p = feature.properties;
    const nameParts = [
        p.name,
        p.street && p.street !== p.name ? p.street : null,
        p.suburb || p.neighbourhood || p.village || p.quarter,
        p.city    || p.town    || p.county,
        p.state,
    ].filter(Boolean);

    return {
        place_id:     `photon-${p.osm_id}`,
        display_name: nameParts.join(', '),
        short_name:   p.name || p.suburb || nameParts[0] || '',
        lat:          String(feature.geometry.coordinates[1]),
        lon:          String(feature.geometry.coordinates[0]),
        type:         p.type  || p.osm_value || '',
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

const sortResults = (results) =>
    [...results].sort((a, b) => {
        const ae = isEduResult(a), be = isEduResult(b);
        if (ae && !be) return -1;
        if (!ae && be) return 1;
        return (b.importance || 0) - (a.importance || 0);
    });

// ── Photon — biased to Hyderabad, NO hard bbox so ALL areas are reachable ─────
const photonSearch = async (query) => {
    try {
        const res = await axios.get(PHOTON_URL, {
            params: {
                q:     query,
                limit: 12,
                lang:  'en',
                lat:   HYD_LAT,   // bias center = Hyderabad
                lon:   HYD_LON,
                // No bbox — so Warangal, Mahbubnagar suburbs are reachable too
            },
            timeout: 4000,
        });
        // Soft-filter: prefer results within a generous radius of Hyderabad city
        // (Hyderabad Metro region: ~150 km radius still makes sense)
        return (res.data?.features || [])
            .filter(f => {
                const [lon, lat] = f.geometry.coordinates;
                // Keep India only (prevents European cities with similar names)
                return lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98;
            })
            .map(parsePhoton);
    } catch {
        return [];
    }
};

// ── Nominatim (last resort) ───────────────────────────────────────────────────
const nominatimSearch = async (query) => {
    try {
        const res = await axios.get(`${NOMINATIM_URL}/search`, {
            params: {
                q:             query,
                format:        'json',
                addressdetails: 1,
                limit:          8,
                countrycodes:  'in',
                'accept-language': 'en',
            },
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
 * Main search function.
 * Priority:
 *   1. Local HYD_LOCATIONS dictionary (instant)
 *   2. Photon API (Hyderabad-biased, covers entire Hyderabad metro)
 *   3. Nominatim (fallback)
 */
export const searchLocation = async (query) => {
    if (!query || query.length < 2) return [];

    const expandedQuery = expandAlias(query);

    // Instant local matches (no API call needed)
    const localMatches = localSuggest(query);

    // API search in parallel for speed
    const photonPromise = photonSearch(expandedQuery);

    // Only start Nominatim if Photon might fail (run in parallel as backup)
    const nominatimPromise = (expandedQuery !== query)
        ? photonSearch(query)      // try original query too
        : nominatimSearch(expandedQuery);

    const [photonResults, backupResults] = await Promise.all([photonPromise, nominatimPromise]);

    let results = photonResults.length > 0 ? photonResults : backupResults;

    if (results.length === 0) {
        results = await nominatimSearch(query);
    }

    // Merge: local matches first, then API results (dedup by name)
    const seenNames = new Set(localMatches.map(l => l.short_name.toLowerCase()));
    const apiFiltered = results.filter(r => !seenNames.has((r.short_name || r.display_name.split(',')[0]).toLowerCase()));

    const merged = [...localMatches, ...apiFiltered];
    return sortResults(merged).slice(0, 8);
};

/**
 * Resolve text → {lat, lng, displayName}
 */
export const resolveCoordinates = async (query) => {
    const results = await searchLocation(query);
    if (results?.length) {
        // For local hints use Nominatim to get exact coords
        if (results[0].isLocalHint) {
            const nom = await nominatimSearch(results[0].short_name + ' Hyderabad');
            if (nom?.length) {
                return { lat: parseFloat(nom[0].lat), lng: parseFloat(nom[0].lon), displayName: nom[0].display_name };
            }
        }
        return {
            lat:         parseFloat(results[0].lat),
            lng:         parseFloat(results[0].lon),
            displayName: results[0].display_name,
        };
    }
    return null;
};

/**
 * Reverse geocode lat/lng → human-readable address.
 * Tries Nominatim first, falls back to Photon reverse.
 * NEVER returns raw coordinates.
 */
export const reverseGeocode = async (lat, lng) => {
    // ── Nominatim reverse ─────────────────────────────────────────────────────
    try {
        const res = await axios.get(`${NOMINATIM_URL}/reverse`, {
            params: { lat, lon: lng, format: 'json', addressdetails: 1, zoom: 18 },
            headers: { 'Accept-Language': 'en' },
            timeout: 4000,
        });

        if (res.data && !res.data.error) {
            const addr = res.data.address || {};

            const placeName =
                res.data.name      ||
                addr.amenity       ||
                addr.building      ||
                addr.shop          ||
                addr.leisure       ||
                addr.tourism       ||
                null;

            const area =
                addr.road          ||
                addr.pedestrian    ||
                addr.path          ||
                null;

            const locale =
                addr.suburb        ||
                addr.neighbourhood ||
                addr.village       ||
                addr.quarter       ||
                null;

            const city =
                addr.city   ||
                addr.town   ||
                addr.county ||
                null;

            const parts = [placeName, area, locale, city].filter(Boolean);
            if (parts.length > 0) return parts.slice(0, 3).join(', ');

            return res.data.display_name.split(',').slice(0, 3).join(', ').trim();
        }
    } catch { /* try next */ }

    // ── Photon reverse ────────────────────────────────────────────────────────
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

    // ── Last resort ───────────────────────────────────────────────────────────
    return 'Hyderabad, Telangana';
};
