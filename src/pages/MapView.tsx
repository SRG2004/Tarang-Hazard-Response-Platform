import React, { useState } from 'react';
import { PageContainer } from '../components/ui-redesign/PageLayouts';
import { MultiHazardMap } from '../components/map/MultiHazardMap';
import { Layers, MapPin, Filter, X, Map as MapIcon, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { HAZARDS } from '../config/hazards';
import { HazardType } from '../types';

export function MapView() {
  const [activeLayers, setActiveLayers] = useState({
    hazards: true,
    resources: true,
    satellite: false,
  });

  const [selectedSeverity, setSelectedSeverity] = useState<string[]>(['all']);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['all']);

  // Dropdown states
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);
  const [showSeverityDropdown, setShowSeverityDropdown] = useState(false);
  const [showTypesDropdown, setShowTypesDropdown] = useState(false);

  // Click outside listener
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLayersDropdown(false);
        setShowSeverityDropdown(false);
        setShowTypesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const severityColors = {
    critical: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
    high: { bg: '#FED7AA', border: '#EA580C', text: '#9A3412' },
    medium: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
    low: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' }
  };

  const hazardTypes = Object.keys(HAZARDS);

  const handleSeverityToggle = (severity: string) => {
    if (severity === 'all') {
      setSelectedSeverity(['all']);
    } else {
      setSelectedSeverity(prev => {
        const newSelection = prev.includes(severity)
          ? prev.filter(s => s !== severity)
          : [...prev.filter(s => s !== 'all'), severity];
        return newSelection.length === 0 ? ['all'] : newSelection;
      });
    }
  };

  const handleTypeToggle = (type: string) => {
    if (type === 'all') {
      setSelectedTypes(['all']);
    } else {
      setSelectedTypes(prev => {
        const newSelection = prev.includes(type)
          ? prev.filter(t => t !== type)
          : [...prev.filter(t => t !== 'all'), type];
        return newSelection.length === 0 ? ['all'] : newSelection;
      });
    }
  };

  const clearFilters = () => {
    setSelectedSeverity(['all']);
    setSelectedTypes(['all']);
  };

  return (
    <PageContainer className="!p-0">
      <div className="h-screen w-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <MapIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hazard Map</h1>
                <p className="text-sm text-gray-600">Real-time disaster locations and alerts</p>
              </div>
            </div>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        </div>

        {/* Horizontal Taskbar with Dropdown Filters */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="flex items-center gap-4" ref={dropdownRef}>
            {/* Map Layers Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLayersDropdown(!showLayersDropdown);
                  setShowSeverityDropdown(false);
                  setShowTypesDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
              >
                <Layers className="w-4 h-4" />
                <span>Layers</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showLayersDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showLayersDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    <label className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <span className="text-sm text-gray-700">Active Hazards</span>
                      <input
                        type="checkbox"
                        checked={activeLayers.hazards}
                        onChange={(e) => setActiveLayers(prev => ({ ...prev, hazards: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                    <label className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <span className="text-sm text-gray-700">Emergency Resources</span>
                      <input
                        type="checkbox"
                        checked={activeLayers.resources}
                        onChange={(e) => setActiveLayers(prev => ({ ...prev, resources: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                    <label className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer">
                      <span className="text-sm text-gray-700">Satellite View</span>
                      <input
                        type="checkbox"
                        checked={activeLayers.satellite}
                        onChange={(e) => setActiveLayers(prev => ({ ...prev, satellite: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Severity Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSeverityDropdown(!showSeverityDropdown);
                  setShowLayersDropdown(false);
                  setShowTypesDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
              >
                <Filter className="w-4 h-4" />
                <span>Severity</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showSeverityDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showSeverityDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                  >
                    {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
                      <button
                        key={severity}
                        onClick={() => handleSeverityToggle(severity)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSeverity.includes(severity)}
                          onChange={() => { }}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {severity !== 'all' && (
                          <div
                            className="w-3 h-3 rounded-full border-2"
                            style={{
                              backgroundColor: severityColors[severity as keyof typeof severityColors]?.bg,
                              borderColor: severityColors[severity as keyof typeof severityColors]?.border
                            }}
                          />
                        )}
                        <span className="text-sm text-gray-700 capitalize">{severity}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Hazard Types Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTypesDropdown(!showTypesDropdown);
                  setShowLayersDropdown(false);
                  setShowSeverityDropdown(false);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700"
              >
                <MapPin className="w-4 h-4" />
                <span>Hazard Types</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showTypesDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showTypesDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto"
                  >
                    <button
                      onClick={() => handleTypeToggle('all')}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('all')}
                        onChange={() => { }}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">All Types</span>
                    </button>
                    <div className="border-t border-gray-100 my-1"></div>
                    {hazardTypes.map((type) => {
                      const hazard = HAZARDS[type as HazardType];
                      if (!hazard) return null;
                      const Icon = hazard.icon;
                      return (
                        <button
                          key={type}
                          onClick={() => handleTypeToggle(type)}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type)}
                            onChange={() => { }}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `${hazard.color}20` }}
                          >
                            <Icon className="w-4 h-4" style={{ color: hazard.color }} />
                          </div>
                          <span className="text-sm text-gray-700 capitalize">{hazard.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Active Filters Display */}
            <div className="flex-1 flex items-center gap-2 ml-4">
              {selectedSeverity.length > 0 && !selectedSeverity.includes('all') && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Severity:</span>
                  {selectedSeverity.map(s => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: severityColors[s as keyof typeof severityColors]?.border }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {selectedTypes.length > 0 && !selectedTypes.includes('all') && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Types:</span>
                  <span className="text-xs font-medium text-gray-700">
                    {selectedTypes.length} selected
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Map Container with Border */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="h-full w-full bg-white rounded-2xl shadow-lg border-4 border-gray-200 overflow-hidden">
            <MultiHazardMap
              activeLayers={activeLayers}
              selectedSeverity={selectedSeverity}
              selectedTypes={selectedTypes}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
