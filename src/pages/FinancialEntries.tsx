import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileText, Pencil, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Entry {
  id: string;
  entry_date: string;
  type: string;
  amount: number;
  description: string | null;
  payment_method: string | null;
  financial_categories: { name: string } | null;
  clients: { full_name: string } | null;
}

interface Category { id: string; name: string; type: string; }

export default function FinancialEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', description: '', type: '', category_id: '' });
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

    const { data } = await q;
    if (data) setEntries(data as unknown as Entry[]);

    const { data: cats } = await supabase.from('financial_categories').select('*').eq('active', true);
    if (cats) setCategories(cats as Category[]);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('financial_entries').delete().eq('id', id);
    toast({ title: 'Lancamento removido' });
    fetchData();
  };

  const handleEditSave = async () => {
    if (!editEntry) return;
    await supabase.from('financial_entries').update({
      amount: parseFloat(editForm.amount),
      description: editForm.description || null,
    }).eq('id', editEntry.id);
    toast({ title: 'Lancamento atualizado' });
    setEditEntry(null);
    fetchData();
  };

  const filtered = entries.filter(e =>
    (e.description?.toLowerCase().includes(search.toLowerCase()) ||
     e.financial_categories?.name?.toLowerCase().includes(search.toLowerCase()) ||
     e.clients?.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRevenue = filtered.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = filtered.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0);
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" /> Lancamentos Financeiros
        </h1>
        <p className="text-muted-foreground text-sm">Planilha principal de receitas e despesas</p>
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
        <Card className="border-primary/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Receitas</p><p className="font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p></CardContent></Card>
        <Card className="border-primary/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Despesas</p><p className="font-bold text-destructive">{formatCurrency(totalExpenses)}</p></CardContent></Card>
        <Card className="border-primary/10"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Saldo</p><p className="font-bold">{formatCurrency(totalRevenue - totalExpenses)}</p></CardContent></Card>
      </div>

      {/* Table */}
      <Card className="border-primary/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm">{format(new Date(e.entry_date + 'T12:00:00'), 'dd/MM/yy')}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${e.type === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-destructive/10 text-destructive'}`}>
                      {e.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{e.financial_categories?.name || '-'}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{e.description || '-'}</TableCell>
                  <TableCell className="text-sm">{e.clients?.full_name || '-'}</TableCell>
                  <TableCell className={`text-right font-medium ${e.type === 'receita' ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatCurrency(Number(e.amount))}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        setEditEntry(e);
                        setEditForm({ amount: String(e.amount), description: e.description || '', type: e.type, category_id: '' });
                      }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(e.id)}>
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

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">Editar Lancamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm({ ...editForm, amount: e.target.value })} /></div>
            <div><Label>Descricao</Label><Textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <Button onClick={handleEditSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
