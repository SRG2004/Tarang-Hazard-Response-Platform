import { useEffect, useState } from 'react';
import { Input } from './ui/input';
import { MapPin } from 'lucide-react';

interface PlacesAutocompleteProps {
    value: string;
    onChange: (value: string, lat?: number, lng?: number) => void;
    placeholder?: string;
    className?: string;
}

export function PlacesAutocomplete({
    value,
    onChange,
    placeholder = 'Search for a location...',
    className = ''
}: PlacesAutocompleteProps) {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string>('');
    const inputId = 'places-autocomplete-input';

    useEffect(() => {
        let autocomplete: google.maps.places.Autocomplete | null = null;
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds

        const initAutocomplete = () => {
            const input = document.getElementById(inputId) as HTMLInputElement;

            if (!input) {
                console.log('⏳ Input not found');
                return false;
            }

            if (typeof window.google?.maps?.places?.Autocomplete !== 'function') {
                console.log('⏳ Google Maps not ready');
                return false;
            }

            console.log('🚀 Initializing autocomplete');

            try {
                autocomplete = new window.google.maps.places.Autocomplete(input, {
                    componentRestrictions: { country: 'in' },
                    fields: ['address_components', 'geometry', 'formatted_address', 'name'],
                    types: ['geocode', 'establishment']
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete!.getPlace();

                    if (!place.geometry || !place.geometry.location) {
                        onChange(input.value || '');
                        return;
                    }

                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    const address = place.formatted_address || place.name || '';

                    console.log('📍 Selected:', address);
                    onChange(address, lat, lng);

                    if (window.gtag) {
                        window.gtag('event', 'place_selected', {
                            place_name: place.name,
                            place_type: place.types?.[0] || 'unknown'
                        });
                    }
                });

                setIsReady(true);
                setError('');
                console.log('✅ Autocomplete ready!');
                return true;
            } catch (err) {
                console.error('❌ Error:', err);
                setError('Failed to initialize');
                return false;
            }
        };

        // Wait for DOM and Google Maps
        const checkInterval = setInterval(() => {
            attempts++;

            if (initAutocomplete()) {
                console.log(`✅ Initialized after ${attempts * 100}ms`);
                clearInterval(checkInterval);
            } else if (attempts >= maxAttempts) {
                console.error('❌ Timeout');
                setError('Search unavailable');
                setIsReady(true); // Enable anyway
                clearInterval(checkInterval);
            }
        }, 100);

        return () => {
            clearInterval(checkInterval);
            if (autocomplete && window.google?.maps?.event) {
                window.google.maps.event.clearInstanceListeners(autocomplete);
            }
        };
    }, [onChange]);

    return (
        <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
                id={inputId}
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={error || (isReady ? placeholder : 'Loading...')}
                className={`pl-10 ${className}`}
                disabled={!isReady && !error}
            />
            {!isReady && !error && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
            )}
        </div>
    );
}
