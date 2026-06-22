import { API_BASE } from './api';

export const mapProvider = {

    // MapmyIndia (Mappls) Integration Settings
    // Set VITE_MAPPLS_API_KEY in your Vercel environment variables (or .env.local for dev)
    // If not set, the map falls back to CartoDB dark tiles automatically
    MAPMYINDIA_API_KEY: import.meta.env.VITE_MAPPLS_API_KEY || '',

    // Dynamically build map style based on selected basemap type
    getMapStyle: (type: 'LIGHT' | 'DARK' | 'SATELLITE' | 'MAPMYINDIA') => {
        if (type === 'MAPMYINDIA') {
            return `${API_BASE}/mapstyle/mapmyindia`;
        }

        let tileUrl = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
        if (type === 'DARK') {
            tileUrl = 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
        } else if (type === 'SATELLITE') {
            tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        }
        
        const domains = ['a', 'b', 'c', 'd'];
        const tiles = type === 'SATELLITE' 
            ? [tileUrl] 
            : domains.map(d => tileUrl.replace('a.basemaps', `${d}.basemaps`));

        return {
            version: 8,
            sources: {
                'raster-tiles': {
                    type: 'raster',
                    tiles: tiles,
                    tileSize: 256,
                    maxzoom: type === 'SATELLITE' ? 17 : 20,
                    attribution: type === 'SATELLITE' 
                        ? 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community' 
                        : 'Tiles &copy; CartoDB &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }
            },
            layers: [
                {
                    id: 'simple-tiles',
                    type: 'raster',
                    source: 'raster-tiles',
                    minzoom: 0,
                    maxzoom: 20
                }
            ]
        };
    },
    
    // Default viewport for Bengaluru
    DEFAULT_VIEWPORT: {
        longitude: 77.5946,
        latitude: 12.9716,
        zoom: 12,
        pitch: 45,
        bearing: 0
    }
};
