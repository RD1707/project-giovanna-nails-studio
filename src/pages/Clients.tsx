import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, Users, ClipboardList, FileText } from 'lucide-react';
import { formatCPF, isValidCPF, formatPhone, formatDate } from '@/lib/format';
import type { AnamnesisData } from '@/lib/validations';

interface Client {
  id: string;
  full_name: string;
  cpf: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  birth_date: string | null;
  client_since: string | null;
  notes: string | null;
  anamnesis: AnamnesisData | null;
  anamnesis_updated_at: string | null;
  active: boolean;
  created_at: string;
}

const today = () => new Date().toISOString().slice(0, 10);

const emptyAnamnesis: AnamnesisData = {
  previous_extension: false,
  preferred_type: '',
  allergies: '',
  diabetes: false,
  circulation_issues: false,
  has_micose: false,
  has_onicofagia: false,
  has_psoriasis: false,
  continuous_medication: '',
  pregnant_lactating: false,
  intense_activities: '',
  designer_notes: '',
  consent: false,
};

const emptyClient = {
  full_name: '',
  cpf: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  birth_date: '',
  client_since: today(),
  notes: '',
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyClient);
  const [anamnesis, setAnamnesis] = useState<AnamnesisData>(emptyAnamnesis);
  const [editId, setEditId] = useState<string | null>(null);
  const [editAnamnesisUpdatedAt, setEditAnamnesisUpdatedAt] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from('clients').select('*').order('full_name');
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      if (data) setClients(data as unknown as Client[]);
    } catch (err: any) {
      toast({ title: 'Erro Inesperado', description: err.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setForm(emptyClient);
    setAnamnesis(emptyAnamnesis);
    setEditId(null);
    setEditAnamnesisUpdatedAt(null);
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' }); return;
    }
    if (form.cpf && form.cpf.replace(/\D/g, '').length > 0 && !isValidCPF(form.cpf)) {
      toast({ title: 'CPF inválido', variant: 'destructive' }); return;
    }

    setSaving(true);

    try {
      // Detect if anamnesis was filled/changed
      const hasAnamnesisData = Object.entries(anamnesis).some(([k, v]) => {
        if (k === 'consent') return false;
        if (typeof v === 'boolean') return v === true;
        return typeof v === 'string' && v.trim().length > 0;
      });

      const anamnesisUpdatedAt = hasAnamnesisData
        ? new Date().toISOString()
        : editAnamnesisUpdatedAt;

      const payload = {
        full_name: form.full_name.trim(),
        cpf: form.cpf ? form.cpf.replace(/\D/g, '') : null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        instagram: form.instagram || null,
        birth_date: form.birth_date || null,
        client_since: form.client_since || null,
        notes: form.notes || null,
        anamnesis: hasAnamnesisData ? anamnesis : null,
        anamnesis_updated_at: anamnesisUpdatedAt,
      };

      const { error } = editId
        ? await supabase.from('clients').update(payload).eq('id', editId)
        : await supabase.from('clients').insert(payload);

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: editId ? 'Cliente atualizado' : 'Cliente cadastrado' });
        setOpen(false);
        resetForm();
        fetchClients();
      }
    } catch (err: any) {
      toast({ title: 'Erro Inesperado', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Client) => {
    setForm({
      full_name: c.full_name,
      cpf: c.cpf ? formatCPF(c.cpf) : '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      instagram: c.instagram || '',
      birth_date: c.birth_date || '',
      client_since: c.client_since || today(),
      notes: c.notes || '',
    });
    setAnamnesis({ ...emptyAnamnesis, ...(c.anamnesis || {}) });
    setEditId(c.id);
    setEditAnamnesisUpdatedAt(c.anamnesis_updated_at);
    setOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteId);
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Cliente removido' });
        fetchClients();
      }
    } catch (err: any) {
      toast({ title: 'Erro Inesperado', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = clients.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf?.includes(search.replace(/\D/g, '')) ||
    c.phone?.includes(search) ||
    c.whatsapp?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Clientes
          </h1>
          <p className="text-muted-foreground text-sm">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}><Plus className="h-4 w-4 mr-1" /> Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados"><Users className="h-4 w-4 mr-1" /> Dados Pessoais</TabsTrigger>
                <TabsTrigger value="anamnese"><ClipboardList className="h-4 w-4 mr-1" /> Ficha de Anamnese</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-3 mt-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={form.cpf}
                      onChange={e => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                  <div>
                    <Label>Cliente desde</Label>
                    <Input type="date" value={form.client_since} onChange={e => setForm({ ...form, client_since: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="(00) 0000-0000" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: formatPhone(e.target.value) })} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Instagram</Label>
                    <Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" />
                  </div>
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} />
                </div>
              </TabsContent>

              <TabsContent value="anamnese" className="space-y-4 mt-4">
                <p className="text-xs text-muted-foreground">
                  Ficha opcional para alongamento de unhas. Preencha o que for relevante.
                  {editAnamnesisUpdatedAt && (
                    <span className="block mt-1">Última atualização: {formatDate(editAnamnesisUpdatedAt, 'dd/MM/yyyy HH:mm')}</span>
                  )}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Já fez alongamento antes?</Label>
                    <Select
                      value={anamnesis.previous_extension ? 'sim' : 'nao'}
                      onValueChange={v => setAnamnesis({ ...anamnesis, previous_extension: v === 'sim' })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo preferido</Label>
                    <Select
                      value={anamnesis.preferred_type || ''}
                      onValueChange={v => setAnamnesis({ ...anamnesis, preferred_type: v as AnamnesisData['preferred_type'] })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gel">Gel</SelectItem>
                        <SelectItem value="fibra">Fibra</SelectItem>
                        <SelectItem value="acrigel">Acrigel</SelectItem>
                        <SelectItem value="porcelana">Porcelana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Alergias conhecidas</Label>
                  <Textarea
                    value={anamnesis.allergies || ''}
                    onChange={e => setAnamnesis({ ...anamnesis, allergies: e.target.value })}
                    placeholder="Ex: acrilato, formol, esmaltes específicos..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Condições de saúde</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { k: 'diabetes', label: 'Diabetes' },
                      { k: 'circulation_issues', label: 'Problemas circulatórios' },
                      { k: 'has_micose', label: 'Micose' },
                      { k: 'has_onicofagia', label: 'Onicofagia (roer unhas)' },
                      { k: 'has_psoriasis', label: 'Psoríase ungueal' },
                      { k: 'pregnant_lactating', label: 'Gestante / Lactante' },
                    ].map(({ k, label }) => (
                      <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={Boolean((anamnesis as any)[k])}
                          onCheckedChange={(c) => setAnamnesis({ ...anamnesis, [k]: Boolean(c) })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Medicamento contínuo</Label>
                  <Input
                    value={anamnesis.continuous_medication || ''}
                    onChange={e => setAnamnesis({ ...anamnesis, continuous_medication: e.target.value })}
                    placeholder="Quais?"
                  />
                </div>

                <div>
                  <Label>Esportes / atividade manual intensa</Label>
                  <Input
                    value={anamnesis.intense_activities || ''}
                    onChange={e => setAnamnesis({ ...anamnesis, intense_activities: e.target.value })}
                    placeholder="Ex: musculação, jardinagem..."
                  />
                </div>

                <div>
                  <Label>Observações da designer</Label>
                  <Textarea
                    value={anamnesis.designer_notes || ''}
                    onChange={e => setAnamnesis({ ...anamnesis, designer_notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <label className="flex items-start gap-2 text-sm cursor-pointer rounded-lg border border-primary/20 p-3 bg-muted/30">
                  <Checkbox
                    checked={Boolean(anamnesis.consent)}
                    onCheckedChange={(c) => setAnamnesis({ ...anamnesis, consent: Boolean(c) })}
                    className="mt-0.5"
                  />
                  <span>Declaro que as informações fornecidas são verdadeiras e autorizo o procedimento.</span>
                </label>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Salvando...' : (editId ? 'Salvar alterações' : 'Cadastrar cliente')}
              </Button>
              {editId && (
                <Button variant="outline" onClick={() => navigate(`/cliente/${editId}/relatorio`)}>
                  <FileText className="h-4 w-4 mr-2" /> Relatório
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, CPF, telefone..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-lg">{c.full_name}</p>
                    {c.anamnesis && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                        <ClipboardList className="h-2.5 w-2.5" /> Anamnese
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                    {c.cpf && <span>CPF: {formatCPF(c.cpf)}</span>}
                    {c.phone && <span>{c.phone}</span>}
                    {c.whatsapp && <span>WhatsApp: {c.whatsapp}</span>}
                    {c.instagram && <span>{c.instagram}</span>}
                    {c.client_since && <span>Cliente desde: {formatDate(c.client_since, 'MM/yyyy')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                  <Button size="sm" variant="secondary" className="gap-1" onClick={() => navigate(`/cliente/${c.id}/relatorio`)}>
                    <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Relatório</span>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setDeleteId(c.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os agendamentos vinculados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
