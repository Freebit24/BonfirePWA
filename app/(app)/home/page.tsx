"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ----- Common UI -----
import { Header } from "@/components/common/header";
import { BottomNav } from "@/components/common/bottom-nav";
import { EventCard } from "@/components/common/event-card";
import { MapSideMenu } from "@/components/map/map-side-menu";
const ClusteredFlameMap = dynamic(
  () => import("@/components/map/ClusteredFlameMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] w-full rounded-lg bg-muted/20 animate-pulse" />
    ),
  }
);
import { SearchInput } from "@/components/common/search-input";
import { CategoryFilter } from "@/components/common/category-filter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// ----- State stores -----
import { useAuthStore } from "@/store/authStore";
import { useEventStore } from "@/store/eventStore";

// ----- Libs -----
import { toast } from "sonner";
import { Map, List, Filter, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserLocation {
  latitude: number;
  longitude: number;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, initialize } = useAuthStore();
  const {
    loading,
    searchQuery,
    selectedCategory,
    viewMode,
    fetchInitialEvents,
    fetchMoreEvents,
    setSearchQuery,
    setSelectedCategory,
    setViewMode,
    joinEvent,
    leaveEvent,
    hasJoinedEvent,
    hasJoinedMap,
    filteredEvents,
    events,
    selectedTags,
    setSelectedTags,
    dateSort,
    setDateSort,
    isPaginating,
    hasMore,
  } = useEventStore();

  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<"granted" | "denied" | "prompt" | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showMapSideMenu, setShowMapSideMenu] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [visibleMapEvents, setVisibleMapEvents] = useState<any[]>([]);
  const visibleEventsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [eventToLeave, setEventToLeave] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [radiusKm, setRadiusKm] = useState("");
  const [regionLocation, setRegionLocation] = useState<UserLocation | null>(null);
  const locationToastShownRef = useRef(false);

  const handleVisibleEventsChange = useCallback((events: any[]) => {
    if (visibleEventsDebounceRef.current) {
      clearTimeout(visibleEventsDebounceRef.current);
    }
    visibleEventsDebounceRef.current = setTimeout(() => {
      setVisibleMapEvents(events);
    }, 100);
  }, []);

  const checkLocationPermission = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      try {
        const permissionStatus = await navigator.permissions.query({
          name: "geolocation" as PermissionName,
        });
        setLocationPermission(permissionStatus.state);

        if (permissionStatus.state === "granted") {
          getCurrentLocation();
        } else if (permissionStatus.state === "prompt") {
          setShowLocationPrompt(true);
        }

        permissionStatus.addEventListener("change", () => {
          setLocationPermission(permissionStatus.state as any);
          if (permissionStatus.state === "granted") {
            getCurrentLocation();
            setShowLocationPrompt(false);
          }
        });
      } catch {
        setShowLocationPrompt(true);
      }
    } else {
      setShowLocationPrompt(true);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => setShowMapSideMenu(event.matches);

    setShowMapSideMenu(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      // Fetch only the initial page of events for list view
      fetchInitialEvents();
      checkLocationPermission();
    }
  }, [user, fetchInitialEvents, checkLocationPermission]);

  // hydrate joined-state from backend when events or user change
  useEffect(() => {
    if (!user || events.length === 0) return;
    events.forEach(event => {
      hasJoinedEvent(event.id, user.id);
    });
  }, [user, events, hasJoinedEvent]);

  // Warm the clustered map chunk so it’s ready when we render it
  useEffect(() => {
    import("@/components/map/ClusteredFlameMap");
  }, []);

  // Infinite scroll sentinel using Intersection Observer
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (viewMode !== "list") return; // paginate only in list view
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loading && !isPaginating && hasMore) {
          fetchMoreEvents();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 } // prefetch slightly before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [viewMode, loading, isPaginating, hasMore, fetchMoreEvents]);

  const getCurrentLocation = () => {
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(location);
        setLocationLoading(false);
        setShowLocationPrompt(false);
        if (!locationToastShownRef.current) {
          locationToastShownRef.current = true;
          toast.success("Location access granted! Map centred on your area.", { duration: 2000, id: 'location-granted' });
        }
      },
      (error) => {
        setLocationLoading(false);
        setShowLocationPrompt(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationPermission("denied");
            toast.error("Location access denied.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.");
            break;
          default:
            toast.error("Unknown error while getting location.");
            break;
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 600000,
      }
    );
  };

  const handleRequestLocation = () => getCurrentLocation();
  const handleDismissLocationPrompt = () => {
    setShowLocationPrompt(false);
    setLocationPermission("denied");
  };

  const handleEventClick = (event: any) => {
    // Navigate to event details page
    router.push(`/event/${event.id}`, { scroll: false });
  };

  const handleEventSelectForZoom = (event: any) => {
    // Trigger map zoom/popup interaction without navigation
    window.dispatchEvent(new CustomEvent('zoomToEvent', { detail: event }));
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;

    // Find the event from the currently displayed list
    const event = displayedEvents.find(e => e.id === eventId);

    // 1. Check for event capacity
    if (event?.max_attendees && event.attendees_count >= event.max_attendees) {
      toast.error("This event has reached maximum capacity");
      return;
    }

    // 2. Check for private event approval requirement
    if (event?.is_private && event?.require_approval) {
      toast.info("This is a private event. Please visit the event page to request to join.");
      return;
    }
    
    try {
      const ok = await joinEvent(eventId, user.id);
      if (ok) {
        toast.success("Successfully joined the event!");
      } else {
        // Re-check capacity in case of a race condition
        const updatedEvent = displayedEvents.find(e => e.id === eventId);
        if (updatedEvent?.max_attendees && updatedEvent.attendees_count >= updatedEvent.max_attendees) {
          toast.error("This event has reached maximum capacity");
        } else {
          toast.error("Unable to join event");
        }
      }
    } catch {
      toast.error("Failed to join event");
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    setEventToLeave(eventId);
    setShowLeaveDialog(true);
  };

  const confirmLeave = async () => {
    if (!user || !eventToLeave) return;
    try {
      const ok = await leaveEvent(eventToLeave, user.id);
      if (ok) {
        toast.success("You have left the event");
      } else {
        toast.error("Failed to leave event");
      }
    } catch {
      toast.error("Failed to leave event");
    } finally {
      setShowLeaveDialog(false);
      setEventToLeave(null);
    }
  };

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const displayedEvents = filteredEvents()
    .filter((event) => {
      // Home page should only show public events for exploration
      // (Private events are shown on organizer/profile pages)
      if (event.is_private && event.organizer_id !== user?.id) {
        return false;
      }

      const region = regionFilter.trim().toLowerCase();
      if (region && !event.location.toLowerCase().includes(region)) {
        return false;
      }

      const radiusValue = parseFloat(radiusKm);
      const shouldApplyRadius = !Number.isNaN(radiusValue) && radiusValue > 0;
      const origin = regionLocation || userLocation;
      if (shouldApplyRadius && origin) {
        const distance = getDistanceKm(
          origin.latitude,
          origin.longitude,
          event.latitude,
          event.longitude
        );
        return distance <= radiusValue;
      }

      return true;
    });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-transparent">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
          <div className="h-12 bg-muted/20 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-10 bg-muted/20 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-xl bg-muted/20 animate-pulse" />
                ))}
              </div>
            </div>
            <div className="h-full min-h-[500px] rounded-xl bg-muted/20 animate-pulse" />
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-transparent overflow-x-clip">
      <Header />

      {showLocationPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 sm:p-4 shadow-lg"
        >
          <div className="container mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <div>
                <p className="font-medium text-sm sm:text-base">Enable Location Access</p>
                <p className="text-xs sm:text-sm opacity-90">
                  Allow access to discover nearby events and centre the map on
                  you.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                onClick={handleRequestLocation}
                disabled={locationLoading}
                className="bg-white text-orange-600 hover:bg-gray-100 font-medium min-h-10 px-3"
                size="sm"
              >
                {locationLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  "Allow Location"
                )}
              </Button>
              <Button
                onClick={handleDismissLocationPrompt}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 min-h-10 px-3"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 md:pb-6">
        {/* Toolbar: Segmented Control */}
        <div className="flex items-center gap-3 w-full mb-8">
          {/* Search Input */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search events..."
            className="flex-1"
            inputClassName="bg-slate-900/50 border border-white/10 rounded-lg h-11 text-sm text-slate-300 placeholder-slate-500 focus:border-orange-500/50 transition-all"
          />

          {/* Filter Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-11 px-4 flex items-center gap-2 bg-slate-900/50 border border-white/10 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 text-sm font-medium"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>

          {/* View Toggle - Segmented Control */}
          <div className="h-11 p-1 flex items-center bg-slate-900/50 border border-white/10 rounded-lg">
            <button
              onClick={() => setViewMode("map")}
              className={cn(
                "h-full px-3 flex items-center justify-center transition-all",
                viewMode === "map"
                  ? "bg-slate-700 text-white shadow-sm rounded-md"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Map className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "h-full px-3 flex items-center justify-center transition-all",
                viewMode === "list"
                  ? "bg-slate-700 text-white shadow-sm rounded-md"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="w-full bg-slate-900/30 backdrop-blur-md border-b border-white/5 p-4 mb-6 flex flex-col gap-4 rounded-b-2xl lg:p-6 lg:mb-8 lg:gap-6">
                
                {/* ROW 1: LOCATION INPUTS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                  {/* City Input - spans 3 columns on desktop */}
                  <div className="md:col-span-3 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider md:tracking-widest">
                      Region / City
                    </label>
                    <LocationAutocomplete
                      value={regionFilter}
                      onChange={(value) => {
                        setRegionFilter(value);
                        setRegionLocation(null);
                      }}
                      onLocationSelect={(loc) => {
                        setRegionFilter(loc.name || loc.address);
                        setRegionLocation({ latitude: loc.latitude, longitude: loc.longitude });
                      }}
                      placeholder="Search city..."
                      types={['(cities)']}
                    />
                  </div>

                  {/* Radius Input - spans 1 column on desktop */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider md:tracking-widest">
                      Radius (km)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(e.target.value)}
                      placeholder="e.g., 10"
                      className="h-11 w-full bg-white/5 border border-white/10 focus:bg-slate-800 focus:border-orange-500 text-white text-sm placeholder-slate-500 rounded-lg"
                    />
                  </div>
                </div>

                {/* ROW 2: CATEGORY CHIPS */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 lg:gap-3">
                  <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    dateSort={dateSort}
                    onDateSortChange={setDateSort}
                  />
                </div>

                {/* ROW 3: FOOTER */}
                <div className="flex flex-col gap-3 pt-3 border-t border-white/5 md:flex-row md:items-center md:justify-between md:pt-4">
                  {/* Left: Reset Button */}
                  <button
                    onClick={() => {
                      setRegionFilter("");
                      setRegionLocation(null);
                      setRadiusKm("");
                      setSelectedCategory(null);
                      setSelectedTags([]);
                      setDateSort('newest');
                    }}
                    className="text-slate-400 hover:text-red-400 text-sm font-medium transition-colors text-left min-h-[44px] flex items-center md:min-h-0"
                  >
                    Reset Filters
                  </button>

                  {/* Right: Sort Control - Segmented */}
                  <div className="inline-flex bg-white/5 p-1 rounded-lg border border-white/10 w-full md:w-auto">
                    <button
                      onClick={() => setDateSort('newest')}
                      className={cn(
                        "flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-medium transition-all md:px-3 md:py-1",
                        dateSort === 'newest'
                          ? "bg-slate-700 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Newest
                    </button>
                    <button
                      onClick={() => setDateSort('oldest')}
                      className={cn(
                        "flex-1 md:flex-none px-4 py-2 rounded-md text-xs font-medium transition-all md:px-3 md:py-1",
                        dateSort === 'oldest'
                          ? "bg-slate-700 text-white shadow-sm"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      Oldest
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        {viewMode === "map" ? (
          <div className="relative z-0 h-[60vh] sm:h-[500px] lg:h-[600px] rounded-none sm:rounded-lg overflow-hidden shadow-lg max-w-full">
            <ClusteredFlameMap
              events={displayedEvents}
              onEventClick={handleEventClick}
              userLocation={userLocation}
              onVisibleEventsChange={handleVisibleEventsChange}
            />
            <MapSideMenu
              events={visibleMapEvents}
              onEventClick={handleEventClick}
              onEventSelect={handleEventSelectForZoom}
              isOpen={showMapSideMenu}
              onToggle={setShowMapSideMenu}
            />
            {loading && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm animate-pulse pointer-events-none" />
            )}
          </div>
        ) : (
          <>
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 sm:h-48 rounded-lg bg-muted/20 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loading && displayedEvents.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl sm:text-6xl mb-4">🔥</div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No events found</h3>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                  Try adjusting your search or filters to find more events
                </p>
                <Button
                  onClick={() => router.push("/organizer/create")}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white min-h-10 px-4"
                >
                  Create Your Own Event
                </Button>
              </div>
            )}

            {!loading && displayedEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                {displayedEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleEventClick(event)}
                    className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl"
                  >
                    <EventCard
                      event={event}
                      isJoined={!!hasJoinedMap[event.id]}
                      onJoin={() => handleJoinEvent(event.id)}
                      onLeave={() => handleLeaveEvent(event.id)}
                      onShare={() => {
                        navigator.share?.({
                          title: event.title,
                          text: event.description,
                          url: `${window.location.origin}/event/${event.id}`,
                        });
                      }}
                      showOrganizerActions={false}
                    />
                  </motion.div>
                ))}
                {/* Sentinel element for Intersection Observer */}
                <div ref={sentinelRef} className="col-span-full h-2" />
              </div>
            )}
            {/* Subtle skeleton only when loading more pages */}
            {isPaginating && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-40 sm:h-48 rounded-lg bg-muted/20 animate-pulse" />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this event? You can always join again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLeave}>
              Leave Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}