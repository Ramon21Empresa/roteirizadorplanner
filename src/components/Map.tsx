import React, { useCallback, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Client, Seller } from '../types';
import { 
  Maximize2, 
  Minimize2, 
  MousePointer2, 
  Scissors, 
  ZoomIn, 
  ZoomOut, 
  Ruler, 
  Layers, 
  Crosshair,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Building,
  UserSquare2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';

interface MapProps {
  clients: Client[];
  sellers: Seller[];
  activeRoutes: Record<string, Client[]>; // sellerId -> route
  routeStats?: Record<string, { distance: number; duration: number }>;
  onClientClick?: (client: Client) => void;
  onSellerClick?: (seller: Seller) => void;
  onMapClick?: (coords: { lat: number, lng: number }) => void;
  onRecalculate?: (sellerId?: string) => void;
  controls?: React.ReactNode;
}

const SELLER_COLORS = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
];

const containerStyle = {
  width: '100%',
  height: '100%'
};

const MapToolbar: React.FC<{ 
  isExpanded: boolean; 
  onToggleExpand: () => void;
  showPath: boolean;
  onTogglePath: () => void;
  onRecalculate: () => void;
  onAddEntity?: (type: 'client' | 'seller') => void;
}> = ({ isExpanded, onToggleExpand, showPath, onTogglePath, onRecalculate, onAddEntity }) => {
  return (
    <div className="absolute top-2 right-2 lg:top-4 lg:right-4 z-[110] flex flex-col gap-1 lg:gap-2">
      <div className="bg-card/95 backdrop-blur border rounded-lg shadow-xl p-0.5 lg:p-1 flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8" onClick={onToggleExpand}>
              {isExpanded ? <Minimize2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> : <Maximize2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">{isExpanded ? 'Recolher' : 'Expandir'}</TooltipContent>
        </Tooltip>
      </div>

      <div className="bg-card/95 backdrop-blur border rounded-lg shadow-xl p-0.5 lg:p-1 flex flex-col gap-1">
        <MapTool icon={MousePointer2} label="Selecionar" active />
        <MapTool icon={Scissors} label="Recortar Rota" />
        <div className="h-px bg-border my-0.5 lg:my-1" />
        <MapTool icon={ZoomIn} label="Aproximar" />
        <MapTool icon={ZoomOut} label="Afastar" />
        <MapTool icon={Crosshair} label="Centralizar" />
        <div className="h-px bg-border my-0.5 lg:my-1" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8 text-blue-500" onClick={() => onAddEntity?.('client')}>
              <Building className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Novo Cliente</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8 text-green-500" onClick={() => onAddEntity?.('seller')}>
              <UserSquare2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Novo Vendedor</TooltipContent>
        </Tooltip>

        <div className="h-px bg-border my-0.5 lg:my-1" />
        <MapTool icon={Ruler} label="Medir Distância" />
        <MapTool icon={Layers} label="Camadas" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle size="sm" pressed={showPath} onClick={onTogglePath} className="h-7 w-7 lg:h-8 lg:w-8 p-0">
              {showPath ? <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> : <EyeOff className="h-3.5 w-3.5 lg:h-4 lg:w-4" />}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="left">{showPath ? 'Ocultar Traçado' : 'Mostrar Traçado'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 lg:h-8 lg:w-8 text-yellow-500 hover:text-yellow-600" onClick={onRecalculate}>
              <Zap className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Recalcular Rota Eficiente</TooltipContent>
        </Tooltip>

        <MapTool icon={Trash2} label="Limpar Seleção" className="text-destructive hover:text-destructive" />
      </div>
    </div>
  );
};

const MapTool: React.FC<{ icon: any; label: string; active?: boolean; className?: string }> = ({ icon: Icon, label, active, className }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Toggle size="sm" pressed={active} className={cn("h-7 w-7 lg:h-8 lg:w-8 p-0", className)}>
        <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
      </Toggle>
    </TooltipTrigger>
    <TooltipContent side="left">{label}</TooltipContent>
  </Tooltip>
);

const MockMap: React.FC<MapProps & { 
  isExpanded: boolean; 
  onToggleExpand: () => void;
  showPath: boolean;
  onTogglePath: () => void;
}> = ({ clients, sellers, activeRoutes, routeStats = {}, isExpanded, onToggleExpand, showPath, onTogglePath, onRecalculate, onClientClick, onSellerClick, onMapClick, controls }) => {
  const [hoveredEntity, setHoveredEntity] = useState<{ type: 'client' | 'seller', data: any } | null>(null);
  const mapRef = React.useRef<HTMLDivElement>(null);

  const allPoints = useMemo(() => {
    const points = [...clients.map(c => ({ lat: c.lat, lng: c.lng, type: 'client' }))];
    sellers.forEach(s => points.push({ lat: s.lat, lng: s.lng, type: 'seller' }));
    return points;
  }, [clients, sellers]);

  const bounds = useMemo(() => {
    if (allPoints.length === 0) return { minLat: -23.6, maxLat: -23.5, minLng: -46.7, maxLng: -46.6 };
    let minLat = Math.min(...allPoints.map(p => p.lat));
    let maxLat = Math.max(...allPoints.map(p => p.lat));
    let minLng = Math.min(...allPoints.map(p => p.lng));
    let maxLng = Math.max(...allPoints.map(p => p.lng));
    
    const latRange = maxLat - minLat || 0.05;
    const lngRange = maxLng - minLng || 0.05;
    const latPad = latRange * 0.2;
    const lngPad = lngRange * 0.2;
    
    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLng: minLng - lngPad,
      maxLng: maxLng + lngPad
    };
  }, [allPoints]);

  const project = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // No-op for selection box
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // No-op for selection box
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!mapRef.current) return;
    
    const rect = mapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Inverse projection to get lat/lng
    const lng = bounds.minLng + (x / rect.width) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.minLat + (1 - (y / rect.height)) * (bounds.maxLat - bounds.minLat);
    
    onMapClick?.({ lat, lng });
  };

  const routePaths = useMemo(() => {
    if (!showPath) return [];
    return Object.entries(activeRoutes).map(([sellerId, route], index) => {
      const seller = sellers.find(s => s.id === sellerId);
      const clientsRoute = route as Client[];
      if (!seller || clientsRoute.length === 0) return null;
      
      const points = [seller, ...clientsRoute, seller];
      const d = points.map((p, i) => {
        const { x, y } = project(p.lat, p.lng);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(" ");
      
      return {
        d,
        color: SELLER_COLORS[index % SELLER_COLORS.length],
        sellerName: seller.name,
        sellerId
      };
    }).filter(Boolean);
  }, [activeRoutes, sellers, bounds, showPath]);

  return (
    <div 
      ref={mapRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={cn(
        "w-full h-full bg-[#0f172a] relative overflow-hidden flex flex-col transition-all duration-500 cursor-crosshair",
        isExpanded ? "fixed inset-0 z-[100] bg-background" : "relative"
      )}
    >
      <MapToolbar 
        isExpanded={isExpanded} 
        onToggleExpand={onToggleExpand} 
        showPath={showPath} 
        onTogglePath={onTogglePath}
        onRecalculate={onRecalculate || (() => {})}
        onAddEntity={(type) => onMapClick?.({ lat: (bounds.minLat + bounds.maxLat) / 2, lng: (bounds.minLng + bounds.maxLng) / 2 })}
      />

      {isExpanded && controls && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110] w-full max-w-4xl px-4 pointer-events-auto">
          {controls}
        </div>
      )}
      
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">
          Modo de Simulação
        </div>
        {sellers.length > 0 && (
          <div className="bg-card/95 backdrop-blur border rounded-lg shadow-xl p-2 flex flex-col gap-1 pointer-events-auto">
            <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Legenda</p>
            {sellers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SELLER_COLORS[i % SELLER_COLORS.length] }} />
                <div className="flex flex-col">
                  <span className="text-[10px] truncate max-w-[100px]">{s.name}</span>
                  {routeStats[s.id] && (
                    <span className="text-[8px] font-mono font-bold text-primary">{routeStats[s.id].distance} KM</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 relative p-12 pointer-events-none">
        <svg className="w-full h-full overflow-visible">
          {/* Grid lines */}
          {[...Array(11)].map((_, i) => (
            <React.Fragment key={i}>
              <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </React.Fragment>
          ))}
          
          {/* Route Lines */}
          {routePaths.map((path, i) => (
            <path
              key={i}
              d={path!.d}
              fill="none"
              stroke={path!.color}
              strokeWidth="3"
              strokeDasharray="8,4"
              className="opacity-80"
              style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}
            />
          ))}

          {/* Client Markers */}
          {clients.map(c => {
            const { x, y } = project(c.lat, c.lng);
            return (
              <g 
                key={c.id} 
                className="pointer-events-auto cursor-pointer" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onClientClick?.(c); 
                  setHoveredEntity({ type: 'client', data: c });
                }}
              >
                <circle 
                  cx={x} cy={y} r="5" 
                  fill="#ef4444" 
                  className="drop-shadow-lg transition-all"
                />
                <text x={x} y={y} dy="-10" textAnchor="middle" fill="#94a3b8" fontSize="8" className="pointer-events-none font-medium">
                  {c.name}
                </text>
              </g>
            );
          })}

          {/* Seller Markers */}
          {sellers.map((s, i) => {
            const { x, y } = project(s.lat, s.lng);
            const color = SELLER_COLORS[i % SELLER_COLORS.length];
            return (
              <g 
                key={s.id} 
                className="pointer-events-auto cursor-pointer" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onSellerClick?.(s); 
                  setHoveredEntity({ type: 'seller', data: s });
                }}
              >
                <circle cx={x} cy={y} r={8} fill={color} stroke="#fff" strokeWidth="2" className="drop-shadow-xl" />
                <text x={x} y={y} dy="-15" textAnchor="middle" fill={color} fontSize="10" fontWeight="bold" className="drop-shadow-sm">
                  {s.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {hoveredEntity && (
        <div 
          className="absolute z-[120] bg-card border shadow-2xl rounded-lg p-3 min-w-[200px]"
          style={{
            left: project(hoveredEntity.data.lat, hoveredEntity.data.lng).x,
            top: project(hoveredEntity.data.lat, hoveredEntity.data.lng).y,
            transform: 'translate(-50%, -120%)'
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold flex items-center gap-2">
              {hoveredEntity.type === 'client' ? <Building className="w-3 h-3 text-blue-500" /> : <UserSquare2 className="w-3 h-3 text-green-500" />}
              {hoveredEntity.data.name}
            </h3>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => {
                  onSellerClick?.(hoveredEntity.data);
                  setHoveredEntity(null);
                }}
              >
                <Edit2 className="h-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setHoveredEntity(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {hoveredEntity.data.address}
            </p>
            {hoveredEntity.data.phone && (
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Phone className="w-2.5 h-2.5" />
                {hoveredEntity.data.phone}
              </p>
            )}
          </div>
        </div>
      )}
      <div className="p-3 bg-black/60 border-t border-white/5 text-[10px] text-muted-foreground flex justify-between items-center backdrop-blur-sm pointer-events-none">
        <span>Visualização Logística - Coordenadas Reais</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Cliente</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Vendedor</span>
        </div>
      </div>
    </div>
  );
};

const Map: React.FC<MapProps> = ({ clients, sellers, activeRoutes, routeStats = {}, onClientClick, onSellerClick, onMapClick, onRecalculate, controls }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPath, setShowPath] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<{ type: 'client' | 'seller', data: any } | null>(null);
  
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const hasValidKey = apiKey && apiKey !== "undefined" && apiKey !== "";
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: hasValidKey ? apiKey : ""
  });

  const center = useMemo(() => {
    if (sellers.length > 0) return { lat: sellers[0].lat, lng: sellers[0].lng };
    if (clients.length > 0) return { lat: clients[0].lat, lng: clients[0].lng };
    return { lat: -23.5505, lng: -46.6333 }; // São Paulo default
  }, [sellers, clients]);

  const toggleExpand = useCallback(() => setIsExpanded(prev => !prev), []);
  const togglePath = useCallback(() => setShowPath(prev => !prev), []);

  if (!hasValidKey || loadError) {
    return (
      <MockMap 
        clients={clients} 
        sellers={sellers} 
        activeRoutes={activeRoutes} 
        routeStats={routeStats}
        onClientClick={onClientClick} 
        onSellerClick={onSellerClick}
        onMapClick={onMapClick}
        isExpanded={isExpanded} 
        onToggleExpand={toggleExpand}
        showPath={showPath}
        onTogglePath={togglePath}
        onRecalculate={onRecalculate}
        controls={controls}
      />
    );
  }

  if (!isLoaded) return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground font-medium">Carregando Mapa...</p>
    </div>
  );

  return (
    <div className={cn(
      "w-full h-full relative transition-all duration-500",
      isExpanded ? "fixed inset-0 z-[100] bg-background" : "relative"
    )}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onClick={(e) => {
          if (e.latLng) {
            onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          }
        }}
        options={{
          disableDefaultUI: isExpanded ? false : true,
          styles: [
            {
              featureType: "all",
              elementType: "geometry",
              stylers: [{ color: "#242f3e" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#242f3e" }]
            },
            {
              featureType: "all",
              elementType: "labels.text.fill",
              stylers: [{ color: "#746855" }]
            }
          ]
        }}
      >
        {sellers.map((seller, index) => (
          <Marker
            key={seller.id}
            position={{ lat: seller.lat, lng: seller.lng }}
            icon={`https://maps.google.com/mapfiles/ms/icons/${['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'orange'][index % 7]}-dot.png`}
            title={`Vendedor: ${seller.name}`}
            onClick={() => setSelectedMarker({ type: 'seller', data: seller })}
          />
        ))}

        {clients.map(client => (
          <Marker
            key={client.id}
            position={{ lat: client.lat, lng: client.lng }}
            onClick={() => {
              onClientClick?.(client);
              setSelectedMarker({ type: 'client', data: client });
            }}
            title={client.name}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.data.lat, lng: selectedMarker.data.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 min-w-[200px] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  {selectedMarker.type === 'client' ? <Building className="w-4 h-4 text-blue-500" /> : <UserSquare2 className="w-4 h-4 text-green-500" />}
                  {selectedMarker.data.name}
                </h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => {
                    onSellerClick?.(selectedMarker.data);
                    setSelectedMarker(null);
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {selectedMarker.data.address}
              </p>
              {(selectedMarker.data as any).phone && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {(selectedMarker.data as any).phone}
                </p>
              )}
              {(selectedMarker.data as any).email && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {(selectedMarker.data as any).email}
                </p>
              )}
              <div className="flex justify-end mt-2">
                <Button size="xs" variant="outline" className="text-[10px] h-6" onClick={() => setSelectedMarker(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </InfoWindow>
        )}

        {showPath && Object.entries(activeRoutes).map(([sellerId, route], index) => {
          const seller = sellers.find(s => s.id === sellerId);
          const clientsRoute = route as Client[];
          if (!seller || clientsRoute.length === 0) return null;
          
          const pathPoints = [
            { lat: seller.lat, lng: seller.lng },
            ...clientsRoute.map(c => ({ lat: c.lat, lng: c.lng })),
            { lat: seller.lat, lng: seller.lng }
          ];

            return (
              <Polyline
                key={sellerId}
                path={pathPoints}
                options={{
                  strokeColor: SELLER_COLORS[index % SELLER_COLORS.length],
                  strokeOpacity: 0.8,
                  strokeWeight: 3,
                }}
              />
            );
          })}
        </GoogleMap>

      <MapToolbar 
        isExpanded={isExpanded} 
        onToggleExpand={toggleExpand} 
        showPath={showPath} 
        onTogglePath={togglePath}
        onRecalculate={() => onRecalculate?.()}
        onAddEntity={(type) => onMapClick?.(center)}
      />

      {isExpanded && controls && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[110] w-full max-w-4xl px-4 pointer-events-auto">
          {controls}
        </div>
      )}

      {/* Legend and Stats Overlay */}
      <div className="absolute top-4 left-4 z-[110] flex flex-col gap-2 pointer-events-none">
        {sellers.length > 0 && (
          <div className="bg-card/95 backdrop-blur border rounded-lg shadow-xl p-2 flex flex-col gap-1 pointer-events-auto">
            <p className="text-[9px] font-bold uppercase text-muted-foreground mb-1">Legenda e KM</p>
            {sellers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SELLER_COLORS[i % SELLER_COLORS.length] }} />
                <div className="flex flex-col">
                  <span className="text-[10px] truncate max-w-[100px]">{s.name}</span>
                  {routeStats[s.id] && (
                    <span className="text-[8px] font-mono font-bold text-primary">{routeStats[s.id].distance} KM</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(Map);
