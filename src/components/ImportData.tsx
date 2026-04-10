import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileType, CheckCircle2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { clientService, sellerService, mapsService } from '../services/api';
import { toast } from 'sonner';

interface ImportDataProps {
  type: 'clients' | 'sellers' | 'routes';
  onComplete: (data?: any[]) => void;
}

const ImportData: React.FC<ImportDataProps> = ({ type, onComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const processData = async (data: any[]) => {
    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    if (type === 'routes') {
      // For routes, we just return the data to the caller (RoutePlanner)
      // because it's a complex assignment that might need validation against existing clients/sellers
      onComplete(data);
      setLoading(false);
      toast.success(`Importação de rotas: ${data.length} registros lidos.`);
      return;
    }

    for (const row of data) {
      try {
        const id = row.id || row.ID || row.codigo || row.Código;
        const name = row.name || row.Name || row.nome || row.Nome;
        const address = row.address || row.Address || row.endereco || row.Endereço;
        let lat = parseFloat(row.lat || row.latitude);
        let lng = parseFloat(row.lng || row.longitude);

        if (!id || !name || !address) continue;

        if (isNaN(lat) || isNaN(lng)) {
          const coords = await mapsService.geocode(address);
          lat = coords.lat;
          lng = coords.lng;
        }

        const item = {
          id: String(id),
          name,
          address,
          lat,
          lng,
          createdAt: new Date().toISOString()
        };

        if (type === 'clients') {
          await clientService.add(item);
        } else {
          await sellerService.add(item);
        }
        successCount++;
      } catch (error) {
        console.error("Error processing row:", error);
        errorCount++;
      }
    }

    toast.success(`Importação concluída: ${successCount} sucessos, ${errorCount} falhas.`);
    setLoading(false);
    onComplete();
  };

  const handleUpload = () => {
    if (!file) return;

    const reader = new FileReader();
    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        complete: (results) => processData(results.data)
      });
    } else {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        processData(json);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="w-4 h-4" />
          {type === 'clients' ? 'Importar Clientes' : type === 'sellers' ? 'Importar Vendedores' : 'Importar Rotas'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar {type === 'clients' ? 'Clientes' : type === 'sellers' ? 'Vendedores' : 'Rotas'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-2 border-muted-foreground/25">
            <FileType className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Arraste ou selecione um arquivo CSV ou Excel (.xlsx)
            </p>
            <Input type="file" accept=".csv, .xlsx" onChange={handleFileChange} className="max-w-[250px]" />
          </div>
          {file && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              {file.name} selecionado
            </div>
          )}
          <Button onClick={handleUpload} disabled={!file || loading} className="w-full">
            {loading ? "Processando..." : "Iniciar Importação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportData;
