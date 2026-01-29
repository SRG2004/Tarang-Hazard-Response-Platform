
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GeoMapBackgroundProps {
    children?: React.ReactNode;
    className?: string;
}

export const GeoMapBackground: React.FC<GeoMapBackgroundProps> = ({ children, className = '' }) => {
    const [hotspots, setHotspots] = useState<{ x: number; y: number; delay: number }[]>([]);

    useEffect(() => {
        // Aligned hotspots for the new realistic map projection
        const points = [
            { x: 18, y: 32, delay: 0 },    // North America (US/Canada)
            { x: 26, y: 65, delay: 1.5 },  // South America (Brazil)
            { x: 50, y: 28, delay: 0.5 },  // Europe
            { x: 53, y: 52, delay: 2 },    // Africa (Central)
            { x: 72, y: 32, delay: 1 },    // Asia (India/China)
            { x: 80, y: 72, delay: 2.5 },  // Australia
            { x: 85, y: 25, delay: 3 },    // East Asia/Russia
            { x: 30, y: 20, delay: 1.2 },  // Atlantic
        ];
        setHotspots(points);
    }, []);

    return (
        <div className={`relative min-h-screen w-full overflow-hidden bg-white dark:bg-[#0b1121] transition-colors duration-500 ${className}`}>

            {/* World Map Layer - Realism Update */}
            <div className="absolute inset-0 z-0 opacity-[0.5] dark:opacity-[0.2] pointer-events-none flex items-center justify-center p-4">
                {/* 
                High-Fidelity World Map SVG
                Scaled to fit nicely without distortion, centered.
             */}
                <svg
                    viewBox="0 0 1009.6727 665.96301"
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full text-gray-300 dark:text-slate-600 fill-current"
                >
                    {/* North America */}
                    <path d="M 166.3 75.3 L 169.5 78.4 L 162.1 85.8 L 162.1 91.1 L 180.1 98.6 L 185.3 115.5 L 180.1 120.8 L 180.1 127.1 L 187.5 130.3 L 189.6 138.8 L 168.4 159.9 L 162.1 155.7 L 158.9 159.9 L 140.9 146.2 L 132.4 146.2 L 129.2 150.4 L 122.9 142.0 L 118.6 145.1 L 113.3 138.8 L 100.6 138.8 L 94.3 132.5 L 90.0 120.8 L 95.3 109.2 L 84.7 94.3 L 73.1 94.3 L 64.6 92.2 L 59.3 84.8 L 59.3 72.1 L 33.9 66.8 L 29.6 61.5 L 29.6 57.3 L 42.4 51.0 L 48.7 54.1 L 61.4 51.0 L 61.4 44.6 L 68.8 44.6 L 73.1 36.1 L 82.6 30.8 L 95.3 35.1 L 122.9 31.9 L 131.3 36.1 L 157.8 7.5 L 175.8 7.5 L 221.4 20.2 L 235.1 7.5 L 273.3 22.3 L 280.7 13.8 L 297.6 17.0 L 297.6 30.8 L 305.1 40.3 L 286.0 48.8 L 286.0 55.1 L 276.4 52.0 L 253.1 58.3 L 244.7 72.1 L 235.1 72.1 L 230.9 83.7 L 219.2 81.6 L 219.2 103.8 L 212.9 110.2 L 203.3 110.2 L 198.0 102.8 L 183.2 102.8 L 184.3 90.1 L 174.7 82.7 L 166.3 75.3 Z" />

                    {/* South America */}
                    <path d="M 230.9 203.3 L 230.9 217.1 L 219.2 245.7 L 219.2 284.9 L 211.8 300.8 L 211.8 332.5 L 224.5 352.7 L 224.5 359.0 L 236.2 367.5 L 239.3 356.9 L 243.6 362.2 L 249.9 356.9 L 246.8 349.5 L 254.2 342.1 L 254.2 329.3 L 261.6 322.0 L 258.4 316.7 L 261.6 306.1 L 275.4 300.8 L 278.5 293.4 L 298.7 274.3 L 306.1 270.1 L 306.1 257.3 L 294.4 249.9 L 294.4 246.8 L 306.1 240.4 L 298.7 236.2 L 291.3 238.3 L 278.5 229.8 L 265.8 229.8 L 258.4 220.3 L 250.0 220.3 L 246.8 213.9 L 241.5 213.9 L 236.2 203.3 L 230.9 203.3 Z" />

                    {/* Europe/Africa/Asia (Afro-Eurasia) */}
                    <path d="M 526.4 28.7 L 542.3 28.7 L 548.7 37.2 L 548.7 44.6 L 543.4 47.7 L 543.4 60.5 L 535.9 57.3 L 531.7 61.5 L 512.6 61.5 L 507.3 54.1 L 499.9 59.4 L 496.7 47.7 L 499.9 44.6 L 496.7 36.1 L 485.1 41.4 L 478.7 36.1 L 472.3 36.1 L 469.2 26.6 L 452.2 26.6 L 455.4 38.2 L 444.8 45.6 L 424.7 45.6 L 413.0 57.3 L 416.2 62.6 L 415.1 76.3 L 418.3 78.4 L 429.9 73.1 L 444.8 77.4 L 452.2 73.1 L 455.4 62.6 L 461.7 62.6 L 460.7 71.0 L 416.2 92.2 L 404.5 106.0 L 398.2 108.1 L 392.9 122.9 L 410.9 127.1 L 409.8 135.6 L 397.1 135.6 L 397.1 144.1 L 387.6 150.4 L 387.6 168.4 L 377.0 171.6 L 377.0 188.5 L 390.8 193.8 L 399.2 188.5 L 409.8 199.1 L 421.5 190.7 L 427.8 193.8 L 442.7 184.3 L 451.1 184.3 L 458.5 200.2 L 467.0 200.2 L 467.0 213.9 L 461.7 217.1 L 461.7 236.2 L 472.3 236.2 L 472.3 252.1 L 478.7 258.4 L 475.5 273.3 L 485.1 278.6 L 494.6 270.1 L 500.9 288.1 L 517.9 288.1 L 521.1 273.3 L 526.4 273.3 L 536.9 261.6 L 532.7 251.0 L 536.9 240.4 L 546.5 240.4 L 553.9 216.1 L 553.9 203.3 L 569.8 193.8 L 569.8 174.7 L 559.2 166.3 L 559.2 153.5 L 567.6 153.5 L 561.3 145.1 L 574.0 132.4 L 567.6 123.9 L 581.4 123.9 L 581.4 135.6 L 602.6 135.6 L 602.6 156.8 L 619.5 168.4 L 626.9 164.2 L 629.0 169.5 L 634.3 162.1 L 634.3 150.4 L 642.8 147.2 L 640.7 170.5 L 650.2 173.7 L 650.2 184.3 L 640.7 197.0 L 638.6 209.7 L 653.4 213.9 L 661.9 203.3 L 661.9 216.1 L 682.0 216.1 L 688.3 226.7 L 682.0 236.2 L 702.1 248.9 L 710.6 238.3 L 710.6 211.8 L 725.4 199.1 L 734.9 199.1 L 733.9 173.7 L 722.2 165.2 L 726.5 158.9 L 738.1 157.8 L 744.5 165.2 L 755.1 154.6 L 755.1 144.1 L 766.7 140.9 L 778.4 140.9 L 797.4 119.7 L 782.6 103.8 L 795.3 103.8 L 795.3 90.1 L 761.4 82.7 L 761.4 72.1 L 748.7 72.1 L 738.1 82.7 L 736.0 77.4 L 718.0 77.4 L 710.6 90.1 L 679.9 90.1 L 690.4 78.4 L 690.4 66.8 L 676.7 63.6 L 664.0 63.6 L 642.8 54.1 L 642.8 45.6 L 621.6 45.6 L 621.6 57.3 L 611.0 57.3 L 602.6 48.8 L 587.7 48.8 L 577.1 38.2 L 569.8 55.1 L 546.5 59.4 L 543.4 54.1 L 543.4 46.7 L 548.7 44.6 L 548.7 37.2 L 542.3 28.7 L 526.4 28.7 Z" />

                    {/* Australia */}
                    <path d="M 753.0 327.3 L 753.0 342.1 L 762.5 352.7 L 751.9 366.4 L 764.6 373.8 L 786.9 367.5 L 796.4 337.8 L 796.4 316.7 L 781.6 316.7 L 775.2 293.4 L 757.2 293.4 L 733.9 316.7 L 740.3 322.0 L 746.6 318.8 L 753.0 327.3 Z" />
                </svg>
            </div>

            {/* Watermark */}
            <div className="absolute bottom-4 right-4 text-xs font-mono text-gray-400 dark:text-gray-600 opacity-50 z-0 pointer-events-none">
                Global Monitor V6 (Realism)
            </div>

            {/* Hotspots over the map */}
            {hotspots.map((point, i) => (
                <div
                    key={i}
                    className="absolute w-12 h-12 z-0 pointer-events-none flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                    {/* Center Dot - Subtle Orange/Grey mix */}
                    <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm relative z-10" />

                    {/* Very Subtle Slow Pulse */}
                    <motion.div
                        className="absolute inset-0 rounded-full bg-orange-500"
                        animate={{
                            scale: [0.5, 3],
                            opacity: [0.3, 0]
                        }}
                        transition={{
                            duration: 5,     // Very slow
                            repeat: Infinity,
                            ease: "easeOut",
                            delay: point.delay
                        }}
                    />
                </div>
            ))}

            {/* Content Overlay */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
};
