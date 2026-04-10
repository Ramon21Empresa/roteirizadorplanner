import React, { useState, useEffect } from 'react';
import { Client, Seller } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { clientService, sellerService, mapsService } from '../services/api';
import { toast } from 'sonner';
import { MapPin, User, Building, Phone, Mail, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EntityFormProps {
  type: 'client' | 'seller';
  entity?: Client | Seller | null;
  onClose: () => void;
  onSave?: () => void;
  initialCoords?: { lat: number; lng: number };
}

const EntityForm: React.FC<EntityFormProps> = ({ type, entity, onClose, onSave, initialCoords }) => {
  const [formData, setFormData] = useState<Partial<Client & Seller>>({
    id: '',
    name: '',
    address: '',
    lat: initialCoords?.lat || 0,
    lng: initialCoords?.lng || 0,
    phone: '',
    email: '',
    sellerId: '',
  });
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (entity) {
      setFormData({
        ...entity,
        phone: entity.phone || '',
        email: entity.email || '',
        sellerId: (entity as Client).sellerId || '',
      });
    } else if (initialCoords) {
      setFormData((prev) => ({ ...prev, lat: initialCoords.lat, lng: initialCoords.lng }));
    }
  }, [entity, initialCoords]);

  const handleGeocode = async () => {
    if (!formData.address) {
      toast.error("Por favor, insira um endereço.");
      return;
    }
    setGeocoding(true);
    try {
      const coords = await mapsService.geocode(formData.address);
      setFormData((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
      toast.success("Endereço geocodificado com sucesso!");
    } catch (error) {
      toast.error("Erro ao buscar coordenadas para este endereço.");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name || !formData.address) {
      toast.error("Por favor, preencha os campos obrigatórios (Código, Nome, Endereço).");
      return;
    }

    setLoading(true);
    try {
      const data = {
        ...formData,
        createdAt: entity?.createdAt || new Date().toISOString(),
      } as Client | Seller;

      if (type === 'client') {
        await clientService.add(data as Client);
      } else {
        await sellerService.add(data as Seller);
      }

      toast.success(`${type === 'client' ? 'Cliente' : 'Vendedor'} salvo com sucesso!`);
      onSave?.();
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!entity) return;
    if (!confirm(`Tem certeza que deseja excluir este ${type === 'client' ? 'cliente' : 'vendedor'}?`)) return;

    setLoading(true);
    try {
      if (type === 'client') {
        await clientService.delete(entity.id);
      } else {
        await sellerService.delete(entity.id);
      }
      toast.success("Excluído com sucesso!");
      onSave?.();
      onClose();
    } catch (error) {
      toast.error("Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/95 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2 uppercase tracking-tight">
          {type === 'client' ? <Building className="w-5 h-5 text-blue-500" /> : <User className="w-5 h-5 text-green-500" />}
          {entity ? 'Editar' : 'Novo'} {type === 'client' ? 'Cliente' : 'Vendedor'}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="id" className="text-[10px] uppercase font-bold text-muted-foreground">Código / ID *</Label>
              <Input 
                id="id" 
                value={formData.id} 
                onChange={e => setFormData({ ...formData, id: e.target.value })} 
                placeholder="Ex: C001"
                disabled={!!entity}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name" className="text-[10px] uppercase font-bold text-muted-foreground">Nome *</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="Nome completo"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address" className="text-[10px] uppercase font-bold text-muted-foreground">Endereço Completo *</Label>
            <div className="flex gap-2">
              <Input 
                id="address" 
                value={formData.address} 
                onChange={e => setFormData({ ...formData, address: e.target.value })} 
                placeholder="Rua, Número, Cidade, Estado"
                className="h-8 text-xs flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 shrink-0" 
                onClick={handleGeocode}
                disabled={geocoding}
              >
                <MapPin className={cn("h-4 w-4", geocoding && "animate-pulse text-primary")} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Latitude</Label>
              <Input 
                value={formData.lat} 
                onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })} 
                type="number" 
                step="any"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Longitude</Label>
              <Input 
                value={formData.lng} 
                onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) })} 
                type="number" 
                step="any"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-[10px] uppercase font-bold text-muted-foreground">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  className="h-8 text-xs pl-8"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-[10px] uppercase font-bold text-muted-foreground">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  className="h-8 text-xs pl-8"
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
          </div>

          {type === 'client' && (
            <div className="space-y-1">
              <Label htmlFor="sellerId" className="text-[10px] uppercase font-bold text-muted-foreground">Vendedor Responsável</Label>
              <Input 
                id="sellerId" 
                value={formData.sellerId} 
                onChange={e => setFormData({ ...formData, sellerId: e.target.value })} 
                className="h-8 text-xs"
                placeholder="ID do Vendedor"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          {entity && (
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          )}
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="mr-2">
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default EntityForm;
