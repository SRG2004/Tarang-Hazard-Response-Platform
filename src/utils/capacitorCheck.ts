/**
 * Check if running in Capacitor (native app)
 */
export const isCapacitor = (): boolean => {
  return typeof window !== 'undefined' && 
         (window as any).Capacitor !== undefined;
};

/**
 * Get the Capacitor platform (ios, android, web)
 */
export const getCapacitorPlatform = (): string => {
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return (window as any).Capacitor.getPlatform() || 'web';
  }
  return 'web';
};

/**
 * Check if running in a mobile WebView (Android/iOS WebView, webtonative.com, etc.)
 */
export const isMobileWebView = (): boolean => {
  if (typeof window === 'undefined' || !navigator) {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';

  // Check for Capacitor
  if (isCapacitor()) {
    return true;
  }

  // Check for Android WebView
  const isAndroidWebView = /wv|WebView/i.test(userAgent);
  
  // Check for iOS WebView (WKWebView or UIWebView)
  const isIOSWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(userAgent) ||
                       /(iPhone|iPod|iPad).*Version\/.*Safari/i.test(userAgent) && !/Safari/i.test(userAgent);

  // Check for common WebView indicators
  const hasWebViewIndicator = /Android.*Version\/\d/i.test(userAgent) && !/Chrome/i.test(userAgent);

  // Check for mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // If it's mobile and has WebView indicators, or explicitly a WebView
  return isAndroidWebView || isIOSWebView || hasWebViewIndicator || (isMobile && !/Chrome|Safari|Firefox/i.test(userAgent));
};

/**
 * Check if we should use redirect instead of popup for authentication
 */
export const shouldUseRedirect = (): boolean => {
  return isCapacitor() || isMobileWebView();
};

