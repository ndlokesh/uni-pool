import React, { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const MapsContext = createContext({ isLoaded: false, loadError: null, isValidKey: false });

const libraries = ['places', 'geometry'];

export const MapsProvider = ({ children }) => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    console.log("MapsProvider - Raw API Key:", apiKey);

    // Strict check: if key is placeholder or short, treat as invalid/missing
    const isValidKey = apiKey && apiKey !== 'YOUR_API_KEY_HERE' && apiKey.length > 10;
    console.log("MapsProvider - Is Valid Key:", isValidKey);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: isValidKey ? apiKey : '',
        libraries,
        preventGoogleFontsLoading: true
    });

    console.log("MapsProvider - Is Loaded:", isLoaded, "Error:", loadError);

    return (
        <MapsContext.Provider value={{ isLoaded: isValidKey && isLoaded, loadError, isValidKey }}>
            {children}
        </MapsContext.Provider>
    );
};

export const useMaps = () => useContext(MapsContext);
