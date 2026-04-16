import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';
import { format } from 'date-fns';

interface FinancialEntry {
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
interface Client { id: string; full_name: string; }

const paymentMethods = [
  { value: 'pix', label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartao Credito' },
  { value: 'cartao_debito', label: 'Cartao Debito' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'outro', label: 'Outro' },
];

export default function DailyCash() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'receita' as string, category_id: '', amount: '', description: '',
    payment_method: 'pix', client_id: '', entry_date: today,
  });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: ent } = await supabase
      .from('financial_entries')
      .select('*, financial_categories(name), clients(full_name)')
      .eq('entry_date', today)
      .order('created_at', { ascending: false });
    if (ent) setEntries(ent as unknown as FinancialEntry[]);

    const { data: cats } = await supabase.from('financial_categories').select('*').eq('active', true).order('name');
    if (cats) setCategories(cats as Category[]);

    const { data: cl } = await supabase.from('clients').select('id, full_name').order('full_name');
    if (cl) setClients(cl as Client[]);
  };

  const handleSave = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: 'Valor obrigatorio', variant: 'destructive' }); return;
    }
    await supabase.from('financial_entries').insert({
      entry_date: form.entry_date,
      type: form.type,
      category_id: form.category_id || null,
      amount: parseFloat(form.amount),
      description: form.description || null,
      payment_method: form.payment_method,
      client_id: form.client_id || null,
    });
    toast({ title: 'Lancamento registrado' });
    setOpen(false);
    setForm({ type: 'receita', category_id: '', amount: '', description: '', payment_method: 'pix', client_id: '', entry_date: today });
    fetchData();
  };

  const revenue = entries.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0);
  const expenses = entries.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0);
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const filteredCategories = categories.filter(c => c.type === form.type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Caixa Diario</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Novo Lancamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">Novo Lancamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" className="flex-1" variant={form.type === 'receita' ? 'default' : 'outline'}
                  onClick={() => setForm({ ...form, type: 'receita', category_id: '' })}>Receita</Button>
                <Button type="button" className="flex-1" variant={form.type === 'despesa' ? 'destructive' : 'outline'}
                  onClick={() => setForm({ ...form, type: 'despesa', category_id: '' })}>Despesa</Button>
              </div>
              <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
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
              <div><Label>Descricao</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">Lancar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-primary/10">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-lg font-bold text-emerald-600">{formatCurrency(revenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(expenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="text-lg font-bold">{formatCurrency(revenue - expenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Entries */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Lancamentos de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Nenhum lancamento hoje.</p>
          ) : (
            <div className="space-y-2">
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{e.description || e.financial_categories?.name || 'Sem descricao'}</p>
                    <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
                      {e.financial_categories?.name && <span>{e.financial_categories.name}</span>}
                      {e.payment_method && <span>• {e.payment_method}</span>}
                      {e.clients?.full_name && <span>• {e.clients.full_name}</span>}
                    </div>
                  </div>
                  <span className={`font-semibold ${e.type === 'receita' ? 'text-emerald-600' : 'text-destructive'}`}>
                    {e.type === 'receita' ? '+' : '-'}{formatCurrency(Number(e.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
