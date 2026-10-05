import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Compass } from 'lucide-react';
import { DEMO_PLACES } from '../data/demoPlaces';
import { CategoryPills } from './CategoryPills';
import { PlaceCard } from './PlaceCard';
import { CategoryId, Place, SortOption } from '../types/travel';

interface ExploreViewProps {
  onViewDetails: (place: Place) => void;
  savedPlaceIds: string[];
  onToggleSave: (placeId: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  onViewDetails,
  savedPlaceIds,
  onToggleSave,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');

  // Filter and Sort places
  const processedPlaces = useMemo(() => {
    let result = DEMO_PLACES.filter((place) => {
      const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory;
      const matchesSearch = 
        searchQuery.trim() === '' ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    if (sortBy === 'distance') {
      result = [...result].sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'rating') {
      result = [...result].sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
            Destination Directory
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Explore All Local Destinations
          </h1>
          <p className="text-sm text-slate-500">
            Browse verified landmarks, temples, eateries, and scenic views around Hyderabad. Filter by interest or sort by distance.
          </p>
        </div>

        {/* Search Bar & Sort Row */}
        <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 flex items-center shadow-2xs rounded-xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all p-1">
            <div className="pl-3 text-slate-400">
              <Search className="w-4 h-4 text-sky-600" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, cuisine, monument, or keyword..."
              className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort destinations by"
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="recommended">Recommended</option>
                <option value="distance">Closest Distance</option>
                <option value="rating">Highest Rating</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{processedPlaces.length}</strong> of {DEMO_PLACES.length} places
        </span>
        {sortBy !== 'recommended' && (
          <span className="text-xs text-sky-700 font-semibold bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
            Sorted by {sortBy === 'distance' ? 'Distance (Nearest First)' : 'Rating (Highest First)'}
          </span>
        )}
      </div>

      {/* Places Grid */}
      {processedPlaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSaved={savedPlaceIds.includes(place.id)}
              onToggleSave={onToggleSave}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No destinations found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find any places matching "{searchQuery}". Try selecting another category or resetting the search.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

    </div>
  );
};
