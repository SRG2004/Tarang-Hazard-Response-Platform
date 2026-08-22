import { useEffect, useState, useRef } from 'react';
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
    const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesService = useRef<google.maps.places.PlacesService | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 100;

        const initServices = () => {
            if (typeof window.google?.maps?.places?.AutocompleteService !== 'function') {
                return false;
            }

            try {
                autocompleteService.current = new window.google.maps.places.AutocompleteService();
                // Create a dummy div for PlacesService since it requires an HTML element
                placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
                
                setIsReady(true);
                setError('');
                console.log('✅ Autocomplete Service ready!');
                return true;
            } catch (err) {
                console.error('❌ Error:', err);
                setError('Failed to initialize');
                return false;
            }
        };

        const checkInterval = setInterval(() => {
            attempts++;
            if (initServices()) {
                clearInterval(checkInterval);
            } else if (attempts >= maxAttempts) {
                console.error('❌ Timeout');
                setError('Search unavailable');
                setIsReady(true);
                clearInterval(checkInterval);
            }
        }, 100);

        return () => clearInterval(checkInterval);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (inputValue: string) => {
        onChange(inputValue); // Update the input value in parent
        
        if (!inputValue.trim()) {
            setPredictions([]);
            setShowDropdown(false);
            return;
        }

        if (autocompleteService.current) {
            autocompleteService.current.getPlacePredictions(
                { 
                    input: inputValue,
                    componentRestrictions: { country: 'in' },
                    types: ['geocode', 'establishment']
                },
                (results, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                        setPredictions(results);
                        setShowDropdown(true);
                    } else {
                        setPredictions([]);
                        setShowDropdown(false);
                    }
                }
            );
        }
    };

    const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
        const address = prediction.description;
        onChange(address); // Optimistically set the address
        setShowDropdown(false);
        setPredictions([]);

        if (placesService.current) {
            placesService.current.getDetails(
                {
                    placeId: prediction.place_id,
                    fields: ['geometry', 'formatted_address', 'name', 'types']
                },
                (place, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && place && place.geometry?.location) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        const finalAddress = place.formatted_address || place.name || address;
                        
                        console.log('📍 Selected:', finalAddress);
                        onChange(finalAddress, lat, lng);

                        if (window.gtag) {
                            window.gtag('event', 'place_selected', {
                                place_name: place.name,
                                place_type: place.types?.[0] || 'unknown'
                            });
                        }
                    }
                }
            );
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
                type="text"
                value={value}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
                placeholder={error || (isReady ? placeholder : 'Loading...')}
                className={`pl-10 ${className}`}
                disabled={!isReady && !error}
            />
            
            {!isReady && !error && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
            )}

            {showDropdown && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 overflow-hidden">
                    <ul className="max-h-60 overflow-y-auto">
                        {predictions.map((prediction) => (
                            <li 
                                key={prediction.place_id}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-800 dark:text-gray-200 transition-colors"
                                onClick={() => handleSelect(prediction)}
                            >
                                {prediction.description}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
