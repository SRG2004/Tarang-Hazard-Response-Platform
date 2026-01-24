// Google Analytics 4 Enhanced Tracking

/**
 * Track page view
 */
export function trackPageView(pageName: string, pageTitle: string) {
    if (window.gtag) {
        window.gtag('event', 'page_view', {
            page_title: pageTitle,
            page_location: window.location.href,
            page_path: window.location.pathname
        });
    }
}

/**
 * Track hazard report submission
 */
export function trackHazardReport(hazardType: string, severity: string, hasPhoto: boolean) {
    if (window.gtag) {
        window.gtag('event', 'hazard_reported', {
            hazard_type: hazardType,
            severity: severity,
            has_photo: hasPhoto,
            event_category: 'engagement',
            event_label: `${hazardType}_${severity}`
        });
    }
}

/**
 * Track donation
 */
export function trackDonation(amount: number, campaignId: string, transactionId: string) {
    if (window.gtag) {
        window.gtag('event', 'purchase', {
            transaction_id: transactionId,
            value: amount,
            currency: 'INR',
            items: [{
                item_id: campaignId,
                item_name: 'Disaster Relief Donation',
                item_category: 'Donation',
                price: amount,
                quantity: 1
            }]
        });

        // Also track as conversion
        window.gtag('event', 'donation_completed', {
            campaign_id: campaignId,
            amount: amount,
            currency: 'INR'
        });
    }
}

/**
 * Track volunteer registration
 */
export function trackVolunteerRegistration(skills: string[]) {
    if (window.gtag) {
        window.gtag('event', 'volunteer_registered', {
            skills: skills.join(','),
            event_category: 'engagement',
            event_label: 'volunteer_signup'
        });
    }
}

/**
 * Track alert view
 */
export function trackAlertView(alertType: string, severity: string) {
    if (window.gtag) {
        window.gtag('event', 'alert_viewed', {
            alert_type: alertType,
            severity: severity,
            event_category: 'engagement'
        });
    }
}

/**
 * Track map interaction
 */
export function trackMapInteraction(action: string, hazardType?: string) {
    if (window.gtag) {
        window.gtag('event', 'map_interaction', {
            action: action,
            hazard_type: hazardType || 'all',
            event_category: 'engagement'
        });
    }
}

/**
 * Track search
 */
export function trackSearch(searchTerm: string, resultCount: number) {
    if (window.gtag) {
        window.gtag('event', 'search', {
            search_term: searchTerm,
            result_count: resultCount
        });
    }
}

/**
 * Track user engagement
 */
export function trackEngagement(action: string, category: string, label?: string) {
    if (window.gtag) {
        window.gtag('event', action, {
            event_category: category,
            event_label: label || action
        });
    }
}

/**
 * Track error
 */
export function trackError(errorMessage: string, errorLocation: string) {
    if (window.gtag) {
        window.gtag('event', 'exception', {
            description: errorMessage,
            fatal: false,
            location: errorLocation
        });
    }
}

/**
 * Set user properties
 */
export function setUserProperties(userId: string, userRole: string) {
    if (window.gtag) {
        window.gtag('set', 'user_properties', {
            user_id: userId,
            user_role: userRole
        });
    }
}
