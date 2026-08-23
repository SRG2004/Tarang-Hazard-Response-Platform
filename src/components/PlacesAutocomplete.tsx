import { useEffect, useState, useRef } from 'react';
import { Input } from './ui/input';
import { MapPin } from 'lucide-react';

interface PlacesAutocompleteProps {
    value: string;
    onChange: (value: string, lat?: number, lng?: number) => void;
    placeholder?: string;
    className?: string;
}

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

export function PlacesAutocomplete({
    value,
    onChange,
    placeholder = 'Search for a location...',
    className = ''
}: PlacesAutocompleteProps) {
    const [isReady, setIsReady] = useState(true);
    const [error, setError] = useState<string>('');
    const [predictions, setPredictions] = useState<NominatimResult[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const searchNominatim = async (query: string) => {
        try {
            // Add viewbox for India to prioritize local results
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`,
                {
                    headers: {
                        'Accept-Language': 'en'
                    }
                }
            );
            
            if (!response.ok) throw new Error('Network error');
            
            const data: NominatimResult[] = await response.json();
            setPredictions(data);
            setShowDropdown(data.length > 0);
        } catch (err) {
            console.error('Nominatim search error:', err);
            setPredictions([]);
            setShowDropdown(false);
        }
    };

    const handleInputChange = (inputValue: string) => {
        onChange(inputValue); // Update the input value in parent
        
        if (!inputValue.trim() || inputValue.trim().length < 3) {
            setPredictions([]);
            setShowDropdown(false);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            return;
        }

        // Debounce search to avoid hitting the free API too hard
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        searchTimeoutRef.current = setTimeout(() => {
            searchNominatim(inputValue);
        }, 500);
    };

    const handleSelect = (prediction: NominatimResult) => {
        const address = prediction.display_name;
        const lat = parseFloat(prediction.lat);
        const lng = parseFloat(prediction.lon);
        
        onChange(address, lat, lng);
        setShowDropdown(false);
        setPredictions([]);
        
        console.log('📍 Selected:', address);
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

            {showDropdown && predictions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 overflow-hidden">
                    <ul className="max-h-60 overflow-y-auto">
                        {predictions.map((prediction) => (
                            <li 
                                key={prediction.place_id}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-800 dark:text-gray-200 transition-colors"
                                onClick={() => handleSelect(prediction)}
                            >
                                {prediction.display_name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
