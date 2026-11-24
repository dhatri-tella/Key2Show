import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMapView,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { MapPin, Sparkles, ExternalLink, AlertTriangle, Navigation } from 'lucide-react';
import type { CatalogTheatre } from '../types/platform';
import { api } from '../utils/api';

interface TheatreMapExplorerProps {
  theatres: CatalogTheatre[];
  selectedCity: string;
  onSelectTheatre?: (theatreId: string) => void;
}

export const TheatreMapExplorer: React.FC<TheatreMapExplorerProps> = ({
  theatres,
  selectedCity,
  onSelectTheatre,
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';
  const [selectedId, setSelectedId] = useState<string | null>(theatres[0]?.id ?? null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [mapsLinks, setMapsLinks] = useState<{ title: string; uri: string; snippet?: string }[]>([]);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const activeTheatre = theatres.find((t) => t.id === selectedId) ?? theatres[0] ?? null;
  const center = activeTheatre
    ? { lat: Number(activeTheatre.lat) || 17.4239, lng: Number(activeTheatre.lng) || 78.4738 }
    : { lat: 17.4239, lng: 78.4738 };

  const handleExploreNearby = async () => {
    if (!activeTheatre) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await api.aiMapsGrounding({
        venueName: `${activeTheatre.name} ${activeTheatre.location}`,
        city: activeTheatre.city || selectedCity,
        latLng: { latitude: center.lat, longitude: center.lng },
      });
      setAiSummary(res.text);
      setMapsLinks(res.mapsSources || []);
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const mapUnavailable = !apiKey || apiKey.startsWith('MY_') || quotaExceeded;

  return (
    <div className="rounded-2xl bg-[#101015] border border-white/10 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF3B43] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>Interactive Cinema Map · {selectedCity}</span>
          </p>
          <h3 className="font-display text-lg font-bold text-white mt-0.5">
            {activeTheatre ? `${activeTheatre.name} (${activeTheatre.location})` : 'Nearby Theatres'}
          </h3>
        </div>
        <button
          type="button"
          onClick={handleExploreNearby}
          disabled={aiLoading || !activeTheatre}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1014] border border-[#FF1822]/50 hover:bg-[#E50914] text-xs font-bold text-white transition-colors cursor-pointer min-h-[40px]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{aiLoading ? 'Finding Nearby Dining & Transit...' : 'Explore Nearby with Maps AI'}</span>
        </button>
      </div>

      {/* Tier 2 Interactive Map OR Quota/Key Fallback */}
      {mapUnavailable ? (
        <div className="rounded-xl bg-[#0b0b0f] border border-amber-500/30 p-4 space-y-3">
          <div className="flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {quotaExceeded
                ? 'Interactive Google Maps tile quota was temporarily exceeded. Showing curated cinema locations & coordinates below.'
                : 'Google Maps browser key is not configured for this preview. Showing curated cinema locations & coordinates below.'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {theatres.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedId(t.id);
                  onSelectTheatre?.(t.id);
                }}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  activeTheatre?.id === t.id
                    ? 'bg-[#221014] border-[#FF1822]'
                    : 'bg-[#14141a] border-white/10 hover:border-white/25'
                }`}
              >
                <p className="text-xs font-bold text-white">{t.name}</p>
                <p className="text-[11px] text-white/60 mt-0.5">{t.address}</p>
                <p className="text-[10.5px] font-mono text-white/45 mt-1">
                  {Number(t.lat).toFixed(4)}, {Number(t.lng).toFixed(4)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-[360px] w-full rounded-2xl overflow-hidden border border-white/15">
          <APIProvider apiKey={apiKey}>
            <GoogleMapView
              defaultCenter={center}
              center={center}
              defaultZoom={12}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              {theatres.map((t) => (
                <AdvancedMarker
                  key={t.id}
                  position={{ lat: Number(t.lat), lng: Number(t.lng) }}
                  onClick={() => setSelectedId(t.id)}
                >
                  <Pin
                    background={activeTheatre?.id === t.id ? '#E50914' : '#18181f'}
                    borderColor="#ffffff"
                    glyphColor="#ffffff"
                  />
                </AdvancedMarker>
              ))}

              {activeTheatre && (
                <InfoWindow
                  position={{ lat: Number(activeTheatre.lat), lng: Number(activeTheatre.lng) }}
                  onCloseClick={() => setSelectedId(null)}
                >
                  <div className="text-[#0b0b0e] p-1 max-w-[220px]">
                    <p className="font-bold text-xs">{activeTheatre.name}</p>
                    <p className="text-[11px] text-neutral-600 mt-0.5">{activeTheatre.location} · ★ {activeTheatre.rating}</p>
                    {onSelectTheatre && (
                      <button
                        type="button"
                        onClick={() => onSelectTheatre(activeTheatre.id)}
                        className="mt-1.5 px-2.5 py-1 rounded bg-[#E50914] text-white text-[11px] font-bold cursor-pointer"
                      >
                        View Showtimes
                      </button>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMapView>
          </APIProvider>
        </div>
      )}

      {/* Nearby Maps AI Grounding Output */}
      {aiError && (
        <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/50 px-3.5 py-2.5 text-xs text-[#FF8A8F]">
          {aiError}
        </div>
      )}
      {aiSummary && (
        <div className="rounded-xl bg-[#15151b] border border-white/10 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Navigation className="w-3.5 h-3.5 text-[#FF252E]" />
            <span>Dining, Parking & Metro Around {activeTheatre?.name}</span>
          </div>
          <p className="text-xs text-white/80 whitespace-pre-line leading-relaxed">{aiSummary}</p>
          {mapsLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {mapsLinks.map((src, idx) => (
                <a
                  key={`${src.uri}-${idx}`}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1d1215] border border-[#FF1822]/40 text-[11px] font-semibold text-white hover:bg-[#E50914] transition-colors"
                >
                  <span>{src.title}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
