import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import RoutePlanner from './components/RoutePlanner';
import ImportData from './components/ImportData';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Client, Seller, DayOfWeek, WeekOfMonth, DAYS, WEEKS, Frequency } from './types';
import { clientService, sellerService, mapsService, simulationService } from './services/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, UserSquare2, TrendingUp, Database, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RoutingControls from './components/RoutingControls';
import EntityForm from './components/EntityForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('planner');
  const [clients, setClients] = useState<Client[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSellers, setSelectedSellers] = useState<Seller[]>([]);
  const [activeSeller, setActiveSeller] = useState<Seller | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeekOfMonth>(1);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("Segunda");
  const [currentFrequency, setCurrentFrequency] = useState<Frequency>("Semanal");
  
  const [monthlyPlans, setMonthlyPlans] = useState<Record<string, Record<WeekOfMonth, Record<DayOfWeek, Client[]>>>>({});
  const [routeStats, setRouteStats] = useState<Record<string, { distance: number; duration: number }>>({});

  const [recalculateTrigger, setRecalculateTrigger] = useState(0);
  const [editingEntity, setEditingEntity] = useState<{ type: 'client' | 'seller', entity?: Client | Seller | null, coords?: { lat: number, lng: number } } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleRecalculate = (sellerId?: string) => {
    setRecalculateTrigger(prev => prev + 1);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle standard dnd-kit dragging (from lists)
    if (!activeSeller) return;
    const sellerId = activeSeller.id;
    const currentPlan = monthlyPlans[sellerId] || {
      1: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
      2: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
      3: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
      4: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
    };

    let sourceDay: DayOfWeek | 'available' | null = null;
    // Check if it's in currentPlan[selectedWeek]
    for (const d of DAYS) {
      if (currentPlan[selectedWeek][d].find(c => c.id === activeId)) {
        sourceDay = d;
        break;
      }
    }
    // If not found, check if it's an available client
    if (!sourceDay) sourceDay = 'available';

    let targetDay: DayOfWeek | null = null;
    if (DAYS.includes(overId as DayOfWeek)) targetDay = overId as DayOfWeek;
    else {
      // Check if over a client in a day list
      for (const d of DAYS) {
        if (currentPlan[selectedWeek][d].find(c => c.id === overId)) {
          targetDay = d;
          break;
        }
      }
    }

    if (!targetDay || !sourceDay) return;

    const client = clients.find(c => c.id === activeId);
    if (!client) return;

    if (sourceDay === targetDay) {
      // Reorder
      const oldIndex = currentPlan[selectedWeek][targetDay].findIndex(c => c.id === activeId);
      const newIndex = currentPlan[selectedWeek][targetDay].findIndex(c => c.id === overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        setMonthlyPlans(prev => {
          const newPlan = JSON.parse(JSON.stringify(prev[sellerId]));
          newPlan[selectedWeek][targetDay!] = arrayMove(newPlan[selectedWeek][targetDay!], oldIndex, newIndex);
          return { ...prev, [sellerId]: newPlan };
        });
      }
    } else {
      // Move
      setMonthlyPlans(prev => {
        const newPlan = JSON.parse(JSON.stringify(prev[sellerId] || currentPlan));
        
        const targetWeeks: WeekOfMonth[] = [selectedWeek];
        if (sourceDay === 'available') {
          const freq = currentFrequency;
          if (freq === 'Semanal') targetWeeks.push(1, 2, 3, 4);
          else if (freq === 'Quinzenal') {
            if (selectedWeek === 1 || selectedWeek === 3) targetWeeks.push(1, 3);
            else targetWeeks.push(2, 4);
          }
        }

        Array.from(new Set(targetWeeks)).forEach(w => {
          if (sourceDay !== 'available' && w === selectedWeek) {
            newPlan[w][sourceDay as DayOfWeek] = newPlan[w][sourceDay as DayOfWeek].filter((c: Client) => c.id !== activeId);
          }
          if (!newPlan[w][targetDay!].find((c: Client) => c.id === activeId)) {
            newPlan[w][targetDay!] = [...newPlan[w][targetDay!], { ...client, frequency: sourceDay === 'available' ? currentFrequency : client.frequency }];
          }
        });

        return { ...prev, [sellerId]: newPlan };
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubClients = clientService.subscribe(setClients);
    const unsubSellers = sellerService.subscribe((newSellers) => {
      setSellers(newSellers);
      if (newSellers.length > 0 && !activeSeller) {
        setActiveSeller(newSellers[0]);
      }
    });
    return () => {
      unsubClients();
      unsubSellers();
    };
  }, [user, activeSeller]);

  useEffect(() => {
    if (!user || selectedSellers.length === 0) {
      setRouteStats({});
      return;
    }

    const calculateAllStats = async () => {
      const stats: Record<string, { distance: number; duration: number }> = {};
      
      for (const seller of selectedSellers) {
        const dayClients = monthlyPlans[seller.id]?.[selectedWeek]?.[selectedDay] || [];
        if (dayClients.length === 0) {
          stats[seller.id] = { distance: 0, duration: 0 };
          continue;
        }

        try {
          const origin = { lat: seller.lat, lng: seller.lng };
          const waypoints = dayClients.map(c => ({ location: { lat: c.lat, lng: c.lng } }));
          const data = await mapsService.getDirections(origin, origin, waypoints);
          
          if (data.routes && data.routes[0]) {
            const route = data.routes[0];
            let totalDist = 0;
            let totalDur = 0;
            route.legs.forEach((leg: any) => {
              totalDist += leg.distance.value;
              totalDur += leg.duration.value;
            });
            stats[seller.id] = { 
              distance: Math.round(totalDist / 1000), 
              duration: Math.round(totalDur / 60) 
            };
          }
        } catch (error) {
          console.error(`Error calculating stats for ${seller.name}:`, error);
        }
      }
      setRouteStats(stats);
    };

    calculateAllStats();
  }, [user, selectedSellers, monthlyPlans, selectedWeek, selectedDay]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erro ao fazer login.");
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast.success("Sessão encerrada.");
    } catch (error) {
      toast.error("Erro ao sair.");
    }
  };

  const loadSampleData = async () => {
    const sampleSeller: Seller = {
      id: "V001",
      name: "João Vendedor",
      address: "Av. Paulista, 1000, São Paulo, SP",
      lat: -23.5611,
      lng: -46.6559,
      createdAt: new Date().toISOString()
    };

    const sampleClients: Client[] = [
      { id: "C001", name: "Mercado Central", address: "Rua Augusta, 500, São Paulo, SP", lat: -23.5511, lng: -46.6511, sellerId: "V001", createdAt: new Date().toISOString() },
      { id: "C002", name: "Padaria Real", address: "Rua Oscar Freire, 200, São Paulo, SP", lat: -23.5666, lng: -46.6666, sellerId: "V001", createdAt: new Date().toISOString() },
      { id: "C003", name: "Farmácia Vida", address: "Av. Brigadeiro Faria Lima, 1500, São Paulo, SP", lat: -23.5855, lng: -46.6811, sellerId: "V001", createdAt: new Date().toISOString() },
      { id: "C004", name: "Lanchonete Top", address: "Rua da Consolação, 1200, São Paulo, SP", lat: -23.5488, lng: -46.6488, sellerId: "V001", createdAt: new Date().toISOString() },
    ];

    try {
      await sellerService.add(sampleSeller);
      for (const c of sampleClients) {
        await clientService.add(c);
      }
      toast.success("Dados de exemplo carregados!");
    } catch (error) {
      toast.error("Erro ao carregar dados de exemplo.");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground text-3xl font-bold">
              R
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">RoadPlanner</h1>
            <p className="text-muted-foreground">Sistema de Roteirização e Logística</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Bem-vindo</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={handleLogin} className="w-full gap-2" size="lg">
                <Users className="w-5 h-5" />
                Entrar com Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleImportRoutes = (data: any[]) => {
    if (!activeSeller) {
      toast.error("Selecione um vendedor antes de importar rotas.");
      return;
    }

    setMonthlyPlans(prev => {
      const sellerId = activeSeller.id;
      const currentPlan = prev[sellerId] || {
        1: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
        2: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
        3: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
        4: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
      };

      const newPlan = JSON.parse(JSON.stringify(currentPlan));
      let count = 0;

      data.forEach((row: any) => {
        const clientId = row.clientId || row.Cliente || row.cliente;
        const dayNum = parseInt(row.day || row.Dia || row.dia);
        const weekNum = parseInt(row.week || row.Semana || row.semana);
        const sellerCode = row.sellerId || row.Vendedor || row.vendedor;

        if (sellerCode && String(sellerCode) !== sellerId) return;

        const client = clients.find(c => c.id === String(clientId));
        const dayName = DAYS[dayNum - 2];

        if (client && dayName && WEEKS.includes(weekNum as WeekOfMonth)) {
          if (!newPlan[weekNum as WeekOfMonth][dayName].find((c: Client) => c.id === client.id)) {
            newPlan[weekNum as WeekOfMonth][dayName].push(client);
            count++;
          }
        }
      });

      if (count > 0) toast.success(`${count} atribuições de rota importadas.`);
      return { ...prev, [sellerId]: newPlan };
    });
  };

  const handleOptimizeDay = async () => {
    if (!activeSeller) return;
    const dayClients = monthlyPlans[activeSeller.id]?.[selectedWeek]?.[selectedDay] || [];
    if (dayClients.length < 2) return;

    toast.promise(
      (async () => {
        const origin = { lat: activeSeller.lat, lng: activeSeller.lng };
        const waypoints = dayClients.map(c => ({ location: { lat: c.lat, lng: c.lng } }));
        const data = await mapsService.getDirections(origin, origin, waypoints);
        
        if (data.routes && data.routes[0]) {
          const order = data.routes[0].waypoint_order;
          const optimized = order.map((idx: number) => dayClients[idx]);
          setMonthlyPlans(prev => {
            const newPlan = JSON.parse(JSON.stringify(prev[activeSeller.id]));
            newPlan[selectedWeek][selectedDay] = optimized;
            return { ...prev, [activeSeller.id]: newPlan };
          });
        }
      })(),
      {
        loading: `Otimizando rota de ${selectedDay}...`,
        success: `Rota de ${selectedDay} otimizada!`,
        error: `Erro ao otimizar rota.`
      }
    );
  };

  const handleOptimizeAll = async () => {
    if (!activeSeller) return;
    
    toast.promise(
      (async () => {
        const sellerId = activeSeller.id;
        const currentPlan = monthlyPlans[sellerId];
        if (!currentPlan) return;

        const newPlan = JSON.parse(JSON.stringify(currentPlan));
        for (const w of WEEKS) {
          for (const d of DAYS) {
            const dayClients = newPlan[w][d];
            if (dayClients.length < 2) continue;
            
            const origin = { lat: activeSeller.lat, lng: activeSeller.lng };
            const waypoints = dayClients.map((c: Client) => ({ location: { lat: c.lat, lng: c.lng } }));
            const data = await mapsService.getDirections(origin, origin, waypoints);
            
            if (data.routes && data.routes[0]) {
              const order = data.routes[0].waypoint_order;
              newPlan[w][d] = order.map((idx: number) => dayClients[idx]);
            }
          }
        }
        setMonthlyPlans(prev => ({ ...prev, [sellerId]: newPlan }));
      })(),
      {
        loading: 'Otimizando setor completo...',
        success: 'Setor otimizado com sucesso!',
        error: 'Erro ao otimizar setor.'
      }
    );
  };

  const handleClearSector = () => {
    if (!activeSeller) return;
    if (confirm(`Tem certeza que deseja limpar todo o planejamento do vendedor ${activeSeller.name}?`)) {
      setMonthlyPlans(prev => ({
        ...prev,
        [activeSeller.id]: {
          1: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
          2: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
          3: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
          4: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
        }
      }));
      toast.success("Setor limpo com sucesso.");
    }
  };

  const handleClearDay = () => {
    if (!activeSeller) return;
    if (confirm(`Deseja limpar o planejamento de ${selectedDay} (Semana ${selectedWeek})?`)) {
      setMonthlyPlans(prev => {
        const sellerId = activeSeller.id;
        const currentPlan = prev[sellerId];
        if (!currentPlan) return prev;

        const newPlan = JSON.parse(JSON.stringify(currentPlan));
        newPlan[selectedWeek][selectedDay] = [];
        return { ...prev, [sellerId]: newPlan };
      });
      toast.success(`Planejamento de ${selectedDay} limpo.`);
    }
  };

  const handleSaveAll = async () => {
    if (!activeSeller) return;
    
    const simulationsToSave: any[] = [];
    // We save for ALL selected sellers or just the active one?
    // The button says "Salvar Tudo", usually implies the current plan being edited.
    // But since we have multi-seller view, maybe save all selected?
    // Let's stick to the active seller for now as it's the one being edited.
    
    const sellersToSave = selectedSellers.length > 0 ? selectedSellers : [activeSeller];

    sellersToSave.forEach(seller => {
      const plan = monthlyPlans[seller.id];
      if (!plan) return;

      WEEKS.forEach(w => {
        DAYS.forEach(d => {
          if (plan[w][d].length > 0) {
            simulationsToSave.push({
              name: `Simulação ${seller.name} - S${w} ${d}`,
              sellerId: seller.id,
              week: w,
              day: d,
              route: plan[w][d].map(c => c.id),
              distance: routeStats[seller.id]?.distance || 0,
              duration: routeStats[seller.id]?.duration || 0,
              createdAt: new Date().toISOString()
            });
          }
        });
      });
    });

    if (simulationsToSave.length === 0) {
      toast.error("Nenhuma rota planejada para salvar.");
      return;
    }

    toast.promise(
      Promise.all(simulationsToSave.map(s => simulationService.save(s))),
      {
        loading: 'Salvando planejamento...',
        success: 'Planejamento salvo com sucesso!',
        error: 'Erro ao salvar planejamento.'
      }
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Dashboard</h2>
              <Button onClick={loadSampleData} variant="outline" className="gap-2">
                <Database className="w-4 h-4" />
                Carregar Dados de Exemplo
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clients.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
                  <UserSquare2 className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sellers.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Rotas Ativas</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Km Rodados (Mês)</CardTitle>
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1.240</div>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Últimos Clientes Cadastrados</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.slice(0, 5).map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.id}</TableCell>
                        <TableCell>{client.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{client.address}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">Ativo</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case 'clients':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gerenciamento de Clientes</h2>
              <div className="flex gap-2">
                <Button onClick={() => setEditingEntity({ type: 'client' })} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Cliente
                </Button>
                <ImportData type="clients" onComplete={() => {}} />
              </div>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Coordenadas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-mono text-[10px]">{client.id}</TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell className="text-xs">{client.address}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {client.lat.toFixed(4)}, {client.lng.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingEntity({ type: 'client', entity: client })}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case 'sellers':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Gerenciamento de Vendedores</h2>
              <div className="flex gap-2">
                <Button onClick={() => setEditingEntity({ type: 'seller' })} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Vendedor
                </Button>
                <ImportData type="sellers" onComplete={() => {}} />
              </div>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Base/Residência</TableHead>
                      <TableHead>Coordenadas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-mono text-[10px]">{seller.id}</TableCell>
                        <TableCell className="font-medium">{seller.name}</TableCell>
                        <TableCell className="text-xs">{seller.address}</TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {seller.lat.toFixed(4)}, {seller.lng.toFixed(4)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingEntity({ type: 'seller', entity: seller })}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );
      case 'planner':
        return (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-120px)] lg:h-[calc(100vh-120px)]">
              <div className="lg:col-span-4 overflow-hidden h-full">
                <RoutePlanner 
                  sellers={sellers} 
                  clients={clients} 
                  monthlyPlan={activeSeller ? (monthlyPlans[activeSeller.id] || {
                    1: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                    2: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                    3: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                    4: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                  }) : {
                    1: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                    2: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                    3: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                    4: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                  }}
                  setMonthlyPlan={(newPlanOrFn) => {
                    if (!activeSeller) return;
                    setMonthlyPlans(prev => {
                      const sellerId = activeSeller.id;
                      const currentPlan = prev[sellerId] || {
                        1: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                        2: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                        3: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                        4: { "Segunda": [], "Terça": [], "Quarta": [], "Quinta": [], "Sexta": [], "Sábado": [], "Domingo": [] },
                      };
                      const nextPlan = typeof newPlanOrFn === 'function' ? newPlanOrFn(currentPlan) : newPlanOrFn;
                      return { ...prev, [sellerId]: nextPlan };
                    });
                  }}
                  selectedWeek={selectedWeek}
                  setSelectedWeek={setSelectedWeek}
                  selectedDay={selectedDay}
                  setSelectedDay={setSelectedDay}
                  selectedSellers={selectedSellers}
                  setSelectedSellers={setSelectedSellers}
                  activeSeller={activeSeller}
                  setActiveSeller={setActiveSeller}
                  currentFrequency={currentFrequency}
                  setCurrentFrequency={setCurrentFrequency}
                  recalculateTrigger={recalculateTrigger}
                  dayStats={activeSeller ? (routeStats[activeSeller.id] || { distance: 0, duration: 0 }) : { distance: 0, duration: 0 }}
                  onOptimizeDay={handleOptimizeDay}
                  onOptimizeAll={handleOptimizeAll}
                  onClearDay={handleClearDay}
                  onClearSector={handleClearSector}
                  onSaveAll={handleSaveAll}
                  onImportRoutes={handleImportRoutes}
                />
              </div>
              <div className="lg:col-span-8 rounded-xl border overflow-hidden bg-card shadow-sm relative h-[500px] lg:h-full">
                <Map 
                  clients={clients} 
                  sellers={selectedSellers.length > 0 ? selectedSellers : (activeSeller ? [activeSeller] : sellers.slice(0, 5))}
                  activeRoutes={Object.fromEntries(
                    selectedSellers.map(s => [s.id, monthlyPlans[s.id]?.[selectedWeek]?.[selectedDay] || []])
                  )}
                  routeStats={routeStats}
                  onClientClick={(client) => {
                    // No-op or different logic if needed
                  }}
                  onRecalculate={handleRecalculate}
                  onSellerClick={(seller) => setEditingEntity({ type: 'seller', entity: seller })}
                  onMapClick={(coords) => setEditingEntity({ type: 'client', coords })}
                  controls={
                    <RoutingControls 
                      sellers={sellers}
                      selectedSellers={selectedSellers}
                      setSelectedSellers={setSelectedSellers}
                      activeSeller={activeSeller}
                      setActiveSeller={setActiveSeller}
                      currentFrequency={currentFrequency}
                      setCurrentFrequency={setCurrentFrequency}
                      selectedWeek={selectedWeek}
                      setSelectedWeek={setSelectedWeek}
                      selectedDay={selectedDay}
                      setSelectedDay={setSelectedDay}
                      onOptimizeDay={handleOptimizeDay}
                      onOptimizeAll={handleOptimizeAll}
                      onClearDay={handleClearDay}
                      onClearSector={handleClearSector}
                      onSaveAll={handleSaveAll}
                      onImportRoutes={handleImportRoutes}
                      dayClientCount={activeSeller ? (monthlyPlans[activeSeller.id]?.[selectedWeek]?.[selectedDay]?.length || 0) : 0}
                      isOverlay
                    />
                  }
                />
              </div>
            </div>
          </DndContext>
        );
      default:
        return <div>Em breve...</div>;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pt-20 lg:pt-8">
          {renderContent()}
        </main>
        <Toaster position="top-right" />
        
        <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
          <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-md">
            {editingEntity && (
              <EntityForm 
                type={editingEntity.type}
                entity={editingEntity.entity}
                initialCoords={editingEntity.coords}
                onClose={() => setEditingEntity(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
