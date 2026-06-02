export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export const pageview = (url: string) => {
  if (!GA_TRACKING_ID || typeof window === 'undefined' || !(window as any).gtag) {
    return;
  }

  (window as any).gtag('config', GA_TRACKING_ID, {
    page_path: url,
  });
};

type GtagEventParams = Record<string, string | number | boolean | undefined>;

const trackEvent = (action: string, params?: GtagEventParams) => {
  if (!GA_TRACKING_ID || typeof window === 'undefined' || !(window as any).gtag) {
    return;
  }

  (window as any).gtag('event', action, params || {});
};

export const trackEventCreated = () =>
  trackEvent('create_event', { event_category: 'engagement' });

export const trackEventViewed = (eventId?: string) =>
  trackEvent('view_event', { event_category: 'engagement', event_id: eventId });

export const trackJoinClick = (eventId?: string) =>
  trackEvent('join_click', { event_category: 'engagement', event_id: eventId });

export const trackLocationPermissionAccepted = () =>
  trackEvent('location_permission_accepted', { event_category: 'engagement' });
