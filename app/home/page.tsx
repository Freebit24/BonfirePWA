"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// ----- Common UI -----
import { Header } from "@/components/common/header";
import { BottomNav } from "@/components/common/bottom-nav";
import { EventCard } from "@/components/common/event-card";
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
    fetchEvents,
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
  } = useEventStore();

  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationPermission, setLocationPermission] =
    useState<"granted" | "denied" | "prompt" | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchEvents();
      checkLocationPermission();
    }
  }, [user, fetchEvents]);

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

  const checkLocationPermission = async () => {
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
  };

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
        toast.success("Location access granted! Map centred on your area.");
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

  const handleEventClick = (event: any) => router.push(`/event/${event.id}`);

  const handleJoinEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const ok = await joinEvent(eventId, user.id);
      if (ok) {
        toast.success("Successfully joined the event!");
      } else {
        toast.error("You have already joined this event");
      }
    } catch {
      toast.error("Failed to join event");
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;
    try {
      const ok = await leaveEvent(eventId, user.id);
      if (ok) {
        toast.success("You have left the event");
      } else {
        toast.error("Failed to leave event");
      }
    } catch {
      toast.error("Failed to leave event");
    }
  };

  const displayedEvents = filteredEvents();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {showLocationPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg"
        >
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <div>
                <p className="font-medium">Enable Location Access</p>
                <p className="text-sm opacity-90">
                  Allow access to discover nearby events and centre the map on
                  you.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRequestLocation}
                disabled={locationLoading}
                className="bg-white text-orange-600 hover:bg-gray-100 font-medium"
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
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {/* Search & Filter Glass Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border dark:border-gray-700 rounded-xl shadow-md p-4 md:p-6 mb-8 space-y-5">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search events..."
            className="w-full"
          />

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>

              <div className="flex items-center gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 border dark:border-gray-700">
                <Button
                  variant={viewMode === "map" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("map")}
                  className={cn(
                    "h-8 px-3 rounded-md",
                    viewMode === "map" &&
                      "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow"
                  )}
                >
                  <Map className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "h-8 px-3 rounded-md",
                    viewMode === "list" &&
                      "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow"
                  )}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {viewMode === "map" && (
                <div className="flex items-center gap-2 text-sm">
                  {locationLoading ? (
                    <div className="flex items-center gap-2 text-orange-600">
                      <LoadingSpinner size="sm" />
                      <span>Getting location...</span>
                    </div>
                  ) : userLocation ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <MapPin className="h-4 w-4" />
                      <span>Location enabled</span>
                    </div>
                  ) : locationPermission === "denied" ? (
                    <Button
                      onClick={handleRequestLocation}
                      size="sm"
                      variant="outline"
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                    >
                      <MapPin className="h-4 w-4 mr-1" />
                      Enable Location
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {displayedEvents.length} event
              {displayedEvents.length !== 1 && "s"} found
            </div>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                tagsList={Array.from(new Set(events.flatMap(e => e.tags))).slice(
                  0,
                  50
                )}
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                dateSort={dateSort}
                onDateSortChange={setDateSort}
              />
            </motion.div>
          )}
        </div>

        {viewMode === "map" ? (
          <div className="relative z-0 h-[600px] rounded-lg overflow-hidden shadow-lg">
            <ClusteredFlameMap
              events={displayedEvents}
              onEventClick={handleEventClick}
              userLocation={userLocation}
            />
            {loading && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-sm animate-pulse pointer-events-none" />
            )}
          </div>
        ) : (
          <>
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-48 rounded-lg bg-muted/20 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loading && displayedEvents.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔥</div>
                <h3 className="text-xl font-semibold mb-2">No events found</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Try adjusting your search or filters to find more events
                </p>
                <Button
                  onClick={() => router.push("/organizer/create")}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  Create Your Own Event
                </Button>
              </div>
            )}

            {!loading && displayedEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleEventClick(event)}
                    className="cursor-pointer"
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
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}