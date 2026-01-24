// Animation configuration and reusable animation variants
export const animations = {
    // Page transitions
    pageTransition: {
        initial: { opacity: 0, x: -20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
        transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
    },

    // Fade in from bottom
    fadeInUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }
    },

    // Fade in from top
    fadeInDown: {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }
    },

    // Scale in
    scaleIn: {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
    },

    // Stagger children
    staggerContainer: {
        animate: {
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    },

    // Card hover
    cardHover: {
        rest: { scale: 1, y: 0 },
        hover: {
            scale: 1.02,
            y: -4,
            transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }
        }
    },

    // Button press
    buttonTap: {
        scale: 0.95,
        transition: { duration: 0.1 }
    },

    // Slide in from right
    slideInRight: {
        initial: { x: '100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '100%', opacity: 0 },
        transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
    },

    // Slide in from left
    slideInLeft: {
        initial: { x: '-100%', opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: '-100%', opacity: 0 },
        transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
    },

    // Wizard step transition
    wizardStep: {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
        transition: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }
    },

    // Icon selection
    iconSelect: {
        rest: { scale: 1, borderColor: 'transparent' },
        hover: { scale: 1.05 },
        selected: {
            scale: 1.1,
            borderColor: '#4F46E5',
            transition: { duration: 0.2 }
        }
    }
};

// Easing curves
export const easings = {
    easeInOut: [0.4, 0.0, 0.2, 1],
    easeOut: [0.0, 0.0, 0.2, 1],
    easeIn: [0.4, 0.0, 1, 1],
    sharp: [0.4, 0.0, 0.6, 1]
};

// Duration standards
export const durations = {
    fast: 0.2,
    normal: 0.3,
    slow: 0.4,
    slower: 0.6
};
