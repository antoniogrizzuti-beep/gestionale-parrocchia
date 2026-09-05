'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MessageSquare, Info } from 'lucide-react';

const customIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `<div style="background-color: #2563eb; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2); border: 2px solid white;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

interface Parrocchia {
  id: string;
  nome_parrocchia: string;
  diocesi: string;
  codice: string;
  paese?: string;
  indirizzo?: string;
  citta?: string;
  referente_nome?: string;
  lat?: number;
  lng?: number;
}

interface LumenMapProps {
  parrocchie: Parrocchia[];
  currentUserParrocchiaId: string | null;
  onOpenChat: (parrocchia: Parrocchia) => void;
  onOpenInfo: (parrocchia: Parrocchia) => void;
}

export default function LumenMap({ parrocchie, currentUserParrocchiaId, onOpenChat, onOpenInfo }: LumenMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[400px] rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-400 shadow-sm">
        Caricamento mappa in corso...
      </div>
    );
  }

  const defaultCenter: [number, number] = [40.1200, 9.0129];

  return (
    <div className="w-full h-[400px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm z-0 relative">
      <MapContainer
        center={defaultCenter}
        zoom={8}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {parrocchie
          .filter((p) => p.lat && p.lng)
          .map((p) => {
            const isCurrent = p.id === currentUserParrocchiaId;
            return (
              <Marker key={p.id} position={[p.lat!, p.lng!]} icon={customIcon}>
                <Popup>
                  <div className="p-1 space-y-2 text-slate-800 min-w-[180px]">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                          {p.codice}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
                            La tua
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold font-serif mt-1">{p.nome_parrocchia}</h4>
                      <p className="text-[10px] text-blue-600 font-semibold uppercase">{p.diocesi}</p>
                    </div>

                    <div className="flex items-center gap-1 pt-1">
                      <button
                        onClick={() => onOpenInfo(p)}
                        className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        title="Informazioni parrocchia"
                      >
                        <Info className="w-3.5 h-3.5" /> Info
                      </button>

                      {!isCurrent && (
                        <button
                          onClick={() => onOpenChat(p)}
                          className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Chat
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}