import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Scissors } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  default_price: number;
  average_duration: number;
  active: boolean;
}

const emptyForm = { name: '', default_price: '', average_duration: '60', active: true };

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchServices(); }, []);

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').order('name');
    if (data) setServices(data as Service[]);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: 'Nome obrigatorio', variant: 'destructive' }); return; }
    const payload = {
      name: form.name,
      default_price: parseFloat(form.default_price) || 0,
      average_duration: parseInt(form.average_duration) || 60,
      active: form.active,
    };
    if (editId) {
      await supabase.from('services').update(payload).eq('id', editId);
      toast({ title: 'Servico atualizado' });
    } else {
      await supabase.from('services').insert(payload);
      toast({ title: 'Servico cadastrado' });
    }
    setOpen(false); setForm(emptyForm); setEditId(null); fetchServices();
  };

  const handleEdit = (s: Service) => {
    setForm({ name: s.name, default_price: String(s.default_price), average_duration: String(s.average_duration), active: s.active });
    setEditId(s.id); setOpen(true);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Servicos</h1>
          <p className="text-muted-foreground text-sm">{services.length} servicos cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo Servico</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">{editId ? 'Editar Servico' : 'Novo Servico'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preco Padrao (R$)</Label><Input type="number" step="0.01" value={form.default_price} onChange={e => setForm({ ...form, default_price: e.target.value })} /></div>
                <div><Label>Duracao (min)</Label><Input type="number" value={form.average_duration} onChange={e => setForm({ ...form, average_duration: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                <Label>Ativo</Label>
              </div>
              <Button onClick={handleSave} className="w-full">{editId ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Scissors className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum servico cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {services.map(s => (
            <Card key={s.id} className={`border-primary/10 ${!s.active ? 'opacity-50' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-lg font-semibold text-primary mt-1">{formatCurrency(s.default_price)}</p>
                    <p className="text-xs text-muted-foreground">{s.average_duration} min</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!s.active && <span className="text-xs bg-muted px-2 py-0.5 rounded-full">Inativo</span>}
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
