import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, Pencil, Trash2, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { formatBRL, formatDate } from '@/lib/format';

interface Entry {
  id: string;
  entry_date: string;
  type: string;
  amount: number;
  description: string | null;
  payment_method: string | null;
  category_id: string | null;
  client_id: string | null;
  financial_categories: { name: string } | null;
  clients: { full_name: string } | null;
}

interface Category { id: string; name: string; type: string; }
interface Client { id: string; full_name: string; }

const paymentMethods = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão Crédito' },
  { value: 'cartao_debito', label: 'Cartão Débito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outro', label: 'Outro' },
];

const today = () => format(new Date(), 'yyyy-MM-dd');

const emptyForm = {
  entry_date: today(),
  type: 'receita' as 'receita' | 'despesa',
  amount: '',
  description: '',
  payment_method: 'pix',
  category_id: '',
  client_id: '',
};

export default function FinancialEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, [dateFrom, dateTo, filterType]);

  const fetchData = async () => {
    let q = supabase
      .from('financial_entries')
      .select('*, financial_categories(name), clients(full_name)')
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date', { ascending: false });

    if (filterType !== 'all') q = q.eq('type', filterType);

    const { data, error } = await q;
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    if (data) setEntries(data as unknown as Entry[]);

    const { data: cats } = await supabase.from('financial_categories').select('*').eq('active', true);
    if (cats) setCategories(cats as Category[]);

    const { data: cl } = await supabase.from('clients').select('id, full_name').order('full_name');
    if (cl) setClients(cl as Client[]);
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (e: Entry) => {
    setEditId(e.id);
    setForm({
      entry_date: e.entry_date,
      type: e.type as 'receita' | 'despesa',
      amount: String(e.amount),
      description: e.description || '',
      payment_method: e.payment_method || 'pix',
      category_id: e.category_id || '',
      client_id: e.client_id || '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: 'Valor inválido', variant: 'destructive' }); return;
    }
    if (!form.entry_date) {
      toast({ title: 'Data obrigatória', variant: 'destructive' }); return;
    }
    setSaving(true);
    const payload = {
      entry_date: form.entry_date,
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description || null,
      payment_method: form.payment_method,
      category_id: form.category_id || null,
      client_id: form.client_id || null,
    };
    const { error } = editId
      ? await supabase.from('financial_entries').update(payload).eq('id', editId)
      : await supabase.from('financial_entries').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editId ? 'Lançamento atualizado' : 'Lançamento registrado' });
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('financial_entries').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lançamento removido' });
    fetchData();
  };

  const filtered = entries.filter(e =>
    !search ||
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.financial_categories?.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.clients?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = filtered.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = filtered.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0);
  const filteredCategories = categories.filter(c => c.type === form.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Lançamentos Financeiros
          </h1>
          <p className="text-muted-foreground text-sm">Planilha principal de receitas e despesas</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Lançamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? 'Editar Lançamento' : 'Novo Lançamento'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" className="flex-1" variant={form.type === 'receita' ? 'default' : 'outline'}
                  onClick={() => setForm({ ...form, type: 'receita', category_id: '' })}>Receita</Button>
                <Button type="button" className="flex-1" variant={form.type === 'despesa' ? 'destructive' : 'outline'}
                  onClick={() => setForm({ ...form, type: 'despesa', category_id: '' })}>Despesa</Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} />
                </div>
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cliente (opcional)</Label>
                <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? 'Salvando...' : (editId ? 'Salvar' : 'Lançar')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-primary/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Receitas</p><p className="font-bold text-emerald-600">{formatBRL(totalRevenue)}</p></CardContent></Card>
        <Card className="border-primary/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Despesas</p><p className="font-bold text-destructive">{formatBRL(totalExpenses)}</p></CardContent></Card>
        <Card className="border-primary/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Saldo</p><p className="font-bold">{formatBRL(totalRevenue - totalExpenses)}</p></CardContent></Card>
      </div>

      {/* Table */}
      <Card className="border-primary/10">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento no período.</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{formatDate(e.entry_date, 'dd/MM/yy')}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.type === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                      {e.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{e.financial_categories?.name || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{e.description || '-'}</TableCell>
                  <TableCell className="text-sm">{e.clients?.full_name || '-'}</TableCell>
                  <TableCell className={`text-right font-medium ${e.type === 'receita' ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatBRL(Number(e.amount))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(e.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
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
