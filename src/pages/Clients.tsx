import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';

interface Client {
  id: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  birth_date: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

const emptyClient = { full_name: '', phone: '', whatsapp: '', instagram: '', birth_date: '', notes: '' };

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyClient);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('full_name');
    if (data) setClients(data as Client[]);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: 'Nome obrigatorio', variant: 'destructive' });
      return;
    }
    const payload = {
      full_name: form.full_name,
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      instagram: form.instagram || null,
      birth_date: form.birth_date || null,
      notes: form.notes || null,
    };

    if (editId) {
      await supabase.from('clients').update(payload).eq('id', editId);
      toast({ title: 'Cliente atualizado' });
    } else {
      await supabase.from('clients').insert(payload);
      toast({ title: 'Cliente cadastrado' });
    }
    setOpen(false);
    setForm(emptyClient);
    setEditId(null);
    fetchClients();
  };

  const handleEdit = (c: Client) => {
    setForm({
      full_name: c.full_name,
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      instagram: c.instagram || '',
      birth_date: c.birth_date || '',
      notes: c.notes || '',
    });
    setEditId(c.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id);
    toast({ title: 'Cliente removido' });
    fetchClients();
  };

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.whatsapp?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground text-sm">{clients.length} clientes cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyClient); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">{editId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome Completo *</Label>
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Instagram</Label><Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" /></div>
                <div><Label>Data de Nascimento</Label><Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} /></div>
              </div>
              <div><Label>Observacoes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">{editId ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => (
            <Card key={c.id} className="border-primary/10 hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.full_name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    {c.phone && <span>{c.phone}</span>}
                    {c.whatsapp && <span>WhatsApp: {c.whatsapp}</span>}
                    {c.instagram && <span>{c.instagram}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
