import React from 'react';
import { Seller, WeekOfMonth, DayOfWeek, Frequency, WEEKS, DAYS } from '../types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Navigation, Wand2, Trash2, Save } from 'lucide-react';
import ImportData from './ImportData';
import { cn } from '@/lib/utils';

interface RoutingControlsProps {
  sellers: Seller[];
  selectedSellers: Seller[];
  setSelectedSellers: (sellers: Seller[]) => void;
  activeSeller: Seller | null;
  setActiveSeller: (seller: Seller | null) => void;
  currentFrequency: Frequency;
  setCurrentFrequency: (freq: Frequency) => void;
  selectedWeek: WeekOfMonth;
  setSelectedWeek: (week: WeekOfMonth) => void;
  selectedDay: DayOfWeek;
  setSelectedDay: (day: DayOfWeek) => void;
  onOptimizeDay: () => void;
  onOptimizeAll: () => void;
  onClearDay: () => void;
  onClearSector: () => void;
  onSaveAll: () => void;
  onImportRoutes: (data: any[]) => void;
  dayClientCount: number;
  className?: string;
  isOverlay?: boolean;
}

const RoutingControls: React.FC<RoutingControlsProps> = ({
  sellers,
  selectedSellers,
  setSelectedSellers,
  activeSeller,
  setActiveSeller,
  currentFrequency,
  setCurrentFrequency,
  selectedWeek,
  setSelectedWeek,
  selectedDay,
  setSelectedDay,
  onOptimizeDay,
  onOptimizeAll,
  onClearDay,
  onClearSector,
  onSaveAll,
  onImportRoutes,
  dayClientCount,
  className,
  isOverlay
}) => {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn(
        "flex flex-col bg-card p-3 rounded-lg border shadow-sm gap-3",
        isOverlay && "bg-card/95 backdrop-blur shadow-2xl border-primary/20"
      )}>
        <div className="flex flex-wrap items-center gap-2 lg:gap-4">
          {/* Active Seller (Editing) */}
          <div className="flex flex-col gap-1 flex-1 min-w-[120px] lg:min-w-[150px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Vendedor Ativo</label>
            <Select onValueChange={(val) => setActiveSeller(sellers.find(s => s.id === val) || null)} value={activeSeller?.id ?? ""}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {sellers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Multi-Seller Selector (Map View) */}
          <div className="flex flex-col gap-1 flex-1 min-w-[120px] lg:min-w-[150px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Ver no Mapa</label>
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" size="sm" className="h-8 text-xs justify-between w-full">
                  {selectedSellers.length === 0 ? "Nenhum" : `${selectedSellers.length} setores`}
                  <Users className="w-3 h-3 ml-2 opacity-50" />
                </Button>
              } />
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
          <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Frequência</label>
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

          <div className="flex flex-col gap-1 flex-1 min-w-[80px]">
            <label className="text-[9px] font-bold uppercase text-muted-foreground">Semana</label>
            <Select value={String(selectedWeek)} onValueChange={(val) => setSelectedWeek(Number(val) as WeekOfMonth)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKS.map(w => <SelectItem key={w} value={String(w)}>S{w}</SelectItem>)}
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
      <div className={cn(
        "flex gap-1 bg-muted/30 p-1 rounded-lg border overflow-x-auto no-scrollbar",
        isOverlay && "bg-card/95 backdrop-blur"
      )}>
        {DAYS.map(day => (
          <Button
            key={day}
            variant={selectedDay === day ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDay(day)}
            className={cn(
              "flex-1 h-12 flex flex-col items-center justify-center gap-0 px-1 transition-all",
              selectedDay === day && "shadow-md scale-105 z-10"
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-tighter">{day.substring(0, 3)}</span>
            <span className={cn("text-[9px] opacity-70", selectedDay === day ? "text-primary-foreground" : "text-muted-foreground")}>
              {day === selectedDay ? dayClientCount : '?'} cli
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default RoutingControls;
