import React, { useState, useEffect, useMemo } from 'react';
import { 
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Client, Seller, DAYS, DayOfWeek, WeekOfMonth, WEEKS, Frequency } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Users, 
  UserSquare2, 
  Map as MapIcon, 
  History,
  LogOut,
  Save,
  Wand2,
  GripVertical,
  Clock,
  Repeat,
  MapPin,
  Navigation,
  Calendar,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { mapsService, simulationService } from '../services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

import ImportData from './ImportData';

interface SortableClientProps {
  client: Client;
  isOverlay?: boolean;
}

const SortableClient: React.FC<SortableClientProps> = ({ client, isOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: client.id,
    data: {
      type: 'client',
      client
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 p-2 mb-2 bg-card border rounded-md shadow-sm hover:border-primary/50 transition-all",
        isOverlay && "shadow-xl border-primary ring-2 ring-primary/20 scale-105 rotate-2"
      )}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-primary transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[11px] font-bold truncate uppercase tracking-tight">{client.name}</p>
          {client.frequency && (
            <Badge variant="outline" className="text-[8px] h-3 px-1 bg-primary/5 border-primary/20">
              {client.frequency.charAt(0)}
            </Badge>
          )}
        </div>
        <p className="text-[9px] text-muted-foreground truncate">{client.address}</p>
      </div>
    </div>
  );
};

interface DayColumnProps {
  day: DayOfWeek;
  clients: Client[];
  stats: { distance: number; duration: number };
  isActive: boolean;
  onSelect: () => void;
}

const DayColumn: React.FC<DayColumnProps> = ({ day, clients, stats, isActive, onSelect }) => {
  const { setNodeRef } = useSortable({
    id: day,
    data: {
      type: 'day',
      day
    }
  });

  return (
    <div 
      ref={setNodeRef}
      onClick={onSelect}
      className={cn(
        "flex flex-col h-full min-w-[180px] rounded-lg border transition-all duration-300",
        isActive ? "bg-accent/20 border-primary ring-1 ring-primary/20 shadow-lg scale-[1.02]" : "bg-card/50 border-border hover:border-primary/30"
      )}
    >
      <div className="p-3 border-b flex items-center justify-between bg-muted/30">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider">{day}</h3>
          <p className="text-[9px] text-muted-foreground">{clients.length} clientes</p>
        </div>
        {clients.length > 0 && (
          <div className="text-right">
            <p className="text-[10px] font-mono font-bold">{stats.distance}km</p>
            <p className="text-[8px] text-muted-foreground">{stats.duration}m</p>
          </div>
        )}
      </div>
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {clients.map(client => (
            <SortableClient key={client.id} client={client} />
          ))}
        </SortableContext>
        {clients.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-md opacity-30">
            <MapPin className="w-6 h-6 mb-1" />
            <span className="text-[8px] uppercase font-bold">Vazio</span>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

interface RoutePlannerProps {
  sellers: Seller[];
  clients: Client[];
  monthlyPlan: Record<WeekOfMonth, Record<DayOfWeek, Client[]>>;
  setMonthlyPlan: React.Dispatch<React.SetStateAction<Record<WeekOfMonth, Record<DayOfWeek, Client[]>>>>;
  selectedWeek: WeekOfMonth;
  setSelectedWeek: (week: WeekOfMonth) => void;
  selectedDay: DayOfWeek;
  setSelectedDay: (day: DayOfWeek) => void;
  selectedSellers: Seller[];
  setSelectedSellers: (sellers: Seller[]) => void;
  activeSeller: Seller | null;
  setActiveSeller: (seller: Seller | null) => void;
  currentFrequency: Frequency;
  setCurrentFrequency: (freq: Frequency) => void;
  recalculateTrigger?: number;
  dayStats: { distance: number; duration: number };
  onOptimizeDay: () => void;
  onOptimizeAll: () => void;
  onClearDay: () => void;
  onClearSector: () => void;
  onSaveAll: () => void;
  onImportRoutes: (data: any[]) => void;
}

const DayButton: React.FC<{ 
  day: DayOfWeek; 
  isActive: boolean; 
  onClick: () => void;
  clientCount: number;
}> = ({ day, isActive, onClick, clientCount }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: day,
    data: { type: 'day', day }
  });

  return (
    <Button
      ref={setNodeRef}
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "flex-1 h-12 flex flex-col items-center justify-center gap-0 px-1 transition-all",
        isOver && "ring-2 ring-primary bg-primary/10",
        isActive && "shadow-md scale-105 z-10"
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-tighter">{day.substring(0, 3)}</span>
      <span className={cn("text-[9px] opacity-70", isActive ? "text-primary-foreground" : "text-muted-foreground")}>
        {clientCount} cli
      </span>
    </Button>
  );
};

const AvailableList: React.FC<{ clients: Client[]; onFrequencyChange: (client: Client, freq: Frequency) => void }> = ({ clients, onFrequencyChange }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'available',
    data: { type: 'available' }
  });

  return (
    <Card ref={setNodeRef} className={cn("w-full lg:w-64 flex flex-col border-dashed bg-muted/10 shrink-0 transition-colors h-[300px] lg:h-full", isOver && "bg-primary/5 border-primary")}>
      <CardHeader className="p-2 border-b bg-muted/20">
        <CardTitle className="text-[10px] uppercase tracking-widest flex items-center gap-2">
          <Users className="w-3 h-3" />
          Disponíveis
        </CardTitle>
      </CardHeader>
      <CardContent className="p-1 flex-1 overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
          <div className="p-1">
            <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
              {clients.map(client => (
                <div key={client.id} className="relative group">
                  <SortableClient client={client} />
                  <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Select 
                      onValueChange={(val) => onFrequencyChange(client, val as Frequency)}
                    >
                      <SelectTrigger className="h-4 w-4 p-0 border-none bg-primary/10 hover:bg-primary/20 cursor-pointer [&_svg]:size-2">
                        <Repeat className="text-primary" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Semanal">Semanal</SelectItem>
                        <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </SortableContext>
            {clients.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-[9px] uppercase font-bold opacity-30">Vazio</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
const RoutePlanner: React.FC<RoutePlannerProps> = ({ 
  sellers, 
  clients, 
  monthlyPlan,
  setMonthlyPlan,
  selectedWeek,
  setSelectedWeek,
  selectedDay,
  setSelectedDay,
  selectedSellers,
  setSelectedSellers,
  activeSeller,
  setActiveSeller,
  currentFrequency,
  setCurrentFrequency,
  recalculateTrigger,
  dayStats,
  onOptimizeDay,
  onOptimizeAll,
  onClearDay,
  onClearSector,
  onSaveAll,
  onImportRoutes
}) => {
  const [availableClients, setAvailableClients] = useState<Client[]>([]);

  // Keyboard shortcut for resequence
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onOptimizeDay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOptimizeDay]);

  useEffect(() => {
    if (recalculateTrigger && recalculateTrigger > 0) {
      onOptimizeDay();
    }
  }, [recalculateTrigger, onOptimizeDay]);

  useEffect(() => {
    if (activeSeller) {
      const sellerClients = clients.filter(c => c.sellerId === activeSeller.id || !c.sellerId);
      const plannedIds = new Set((Object.values(monthlyPlan[selectedWeek]).flat() as Client[]).map(c => c.id));
      setAvailableClients(sellerClients.filter(c => !plannedIds.has(c.id)));
    }
  }, [activeSeller, clients, monthlyPlan, selectedWeek]);

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      {/* Configuration Bar */}
      <div className="flex flex-col bg-card p-3 rounded-lg border shadow-sm gap-3">
        <div className="flex flex-wrap items-center gap-4">
          {/* Active Seller (Editing) */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Vendedor Ativo (Edição)</label>
            <Select onValueChange={(val) => setActiveSeller(sellers.find(s => s.id === val) || null)} value={activeSeller?.id ?? ""}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-Seller Selector (Map View) */}
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Ver no Mapa (Setores)</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs justify-between w-full">
                  {selectedSellers.length === 0 ? "Nenhum setor" : `${selectedSellers.length} setores`}
                  <Users className="w-3 h-3 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Selecionar Setores</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setSelectedSellers(sellers)}
                        className="text-[9px] text-primary hover:underline font-medium"
                      >
                        Todos
                      </button>
                      <button 
                        onClick={() => setSelectedSellers([])}
                        className="text-[9px] text-muted-foreground hover:underline font-medium"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <ScrollArea className="h-48">
                    {sellers.map(s => (
                      <div key={s.id} className="flex items-center space-x-2 p-1 hover:bg-muted rounded-md transition-colors">
                        <Checkbox 
                          id={`seller-${s.id}`} 
                          checked={selectedSellers.some(sel => sel.id === s.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedSellers([...selectedSellers, s]);
                            else setSelectedSellers(selectedSellers.filter(sel => sel.id !== s.id));
                          }}
                        />
                        <label htmlFor={`seller-${s.id}`} className="text-xs cursor-pointer flex-1 truncate">{s.name}</label>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Frequency Selector */}
          <div className="flex flex-col gap-1 min-w-[100px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Frequência de Ajuste</label>
            <Select value={currentFrequency} onValueChange={(val) => setCurrentFrequency(val as Frequency)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semanal">Semanal</SelectItem>
                <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                <SelectItem value="Mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-[100px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Semana</label>
            <Select value={String(selectedWeek)} onValueChange={(val) => setSelectedWeek(Number(val) as WeekOfMonth)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKS.map(w => <SelectItem key={w} value={String(w)}>Semana {w}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <ImportData type="routes" onComplete={onImportRoutes} />
          <Button variant="outline" size="xs" onClick={onOptimizeDay} disabled={!activeSeller} className="h-8 text-[10px]">
            <Navigation className="w-3 h-3 mr-1" />
            Otimizar Rota
          </Button>
          <Button variant="outline" size="xs" onClick={onOptimizeAll} disabled={!activeSeller} className="h-8 text-[10px]">
            <Wand2 className="w-3 h-3 mr-1" />
            Otimizar Setor
          </Button>
          <Button variant="ghost" size="xs" onClick={onClearDay} disabled={!activeSeller} className="h-8 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3 h-3 mr-1" />
            Limpar Rota
          </Button>
          <Button variant="ghost" size="xs" onClick={onClearSector} disabled={!activeSeller} className="h-8 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="w-3 h-3 mr-1" />
            Limpar Setor
          </Button>
          <div className="flex-1" />
          <Button size="xs" onClick={onSaveAll} disabled={!activeSeller} className="h-8 text-[10px]">
            <Save className="w-3 h-3 mr-1" />
            Salvar Tudo
          </Button>
        </div>
      </div>

      {/* Day Selector Buttons */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-lg border overflow-x-auto no-scrollbar">
        {DAYS.map(day => (
          <DayButton 
            key={day}
            day={day}
            isActive={selectedDay === day}
            onClick={() => setSelectedDay(day)}
            clientCount={monthlyPlan[selectedWeek][day].length}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
        {/* Selected Day List (Left on Desktop) */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-[400px]">
          <DayColumn 
            day={selectedDay} 
            clients={monthlyPlan[selectedWeek][selectedDay]} 
            stats={dayStats}
            isActive={true}
            onSelect={() => {}}
          />
        </div>

        {/* Available Clients Sidebar (Right on Desktop) */}
        <AvailableList 
          clients={availableClients} 
          onFrequencyChange={(client, freq) => {
            client.frequency = freq;
            setAvailableClients([...availableClients]);
          }} 
        />
      </div>
    </div>
  );
};

export default RoutePlanner;
