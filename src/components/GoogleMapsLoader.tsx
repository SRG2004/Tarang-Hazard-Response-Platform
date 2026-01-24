import { useEffect } from 'react';

declare global {
    interface Window {
        initMap: () => void;
        google: any;
    }
}

export const GoogleMapsLoader = () => {
    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn('Google Maps API Key (VITE_GOOGLE_MAPS_API_KEY) is missing');
            return;
        }

        if (window.google?.maps) return; // Already loaded

        // Create script tag
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=initMap`;
        script.async = true;
        script.defer = true;
        script.id = 'google-maps-script';

        // Define global callback
        if (!window.initMap) {
            window.initMap = () => {
                console.log('Google Maps loaded successfully');
            };
        }

        document.head.appendChild(script);
    }, []);

    return null;
};
