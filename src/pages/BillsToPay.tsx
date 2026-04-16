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
import { Plus, CreditCard, AlertTriangle, CheckCircle, Clock, Pencil, Trash2 } from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';

interface Bill {
  id: string;
  due_date: string;
  description: string;
  amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  category_id: string | null;
  financial_categories: { name: string } | null;
}

interface Category { id: string; name: string; }

export default function BillsToPay() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ due_date: '', description: '', amount: '', category_id: '', notes: '' });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  // Sound alert for due today
  useEffect(() => {
    const dueToday = bills.filter(b => b.status === 'pendente' && isToday(new Date(b.due_date + 'T12:00:00')));
    if (dueToday.length > 0) {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczI0Bqq+DXtHYuHjNfm9fMrnAjDiZPeLPTwJZeNydQgMjKo2c0Ij1bi7m9nWs5JUBvqtbFi1w0HlCGurq5m2Q9IERA');
        audio.play().catch(() => {});
      } catch {}
      toast({ title: `${dueToday.length} conta(s) vencem hoje!`, variant: 'destructive' });
    }
  }, [bills]);

  const fetchData = async () => {
    const { data } = await supabase.from('bills_to_pay').select('*, financial_categories(name)').order('due_date');
    if (data) setBills(data as unknown as Bill[]);

    const { data: cats } = await supabase.from('financial_categories').select('id, name').eq('type', 'despesa').eq('active', true);
    if (cats) setCategories(cats as Category[]);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.due_date) {
      toast({ title: 'Preencha os campos obrigatorios', variant: 'destructive' }); return;
    }
    const payload = {
      due_date: form.due_date,
      description: form.description,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      notes: form.notes || null,
    };
    if (editId) {
      await supabase.from('bills_to_pay').update(payload).eq('id', editId);
      toast({ title: 'Conta atualizada' });
    } else {
      await supabase.from('bills_to_pay').insert(payload);
      toast({ title: 'Conta registrada' });
    }
    setOpen(false); setForm({ due_date: '', description: '', amount: '', category_id: '', notes: '' }); setEditId(null);
    fetchData();
  };

  const markPaid = async (bill: Bill) => {
    await supabase.from('bills_to_pay').update({ status: 'pago', paid_at: format(new Date(), 'yyyy-MM-dd') }).eq('id', bill.id);
    // Auto-create expense entry
    await supabase.from('financial_entries').insert({
      entry_date: format(new Date(), 'yyyy-MM-dd'),
      type: 'despesa',
      category_id: bill.category_id,
      amount: bill.amount,
      description: `Conta paga: ${bill.description}`,
      payment_method: 'pix',
    });
    toast({ title: 'Conta marcada como paga e despesa lancada' });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('bills_to_pay').delete().eq('id', id);
    toast({ title: 'Conta removida' }); fetchData();
  };

  const handleEdit = (b: Bill) => {
    setForm({ due_date: b.due_date, description: b.description, amount: String(b.amount), category_id: b.category_id || '', notes: b.notes || '' });
    setEditId(b.id); setOpen(true);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const pendingBills = bills.filter(b => b.status === 'pendente' || b.status === 'vencido');
  const paidBills = bills.filter(b => b.status === 'pago');
  const overdue = pendingBills.filter(b => isPast(new Date(b.due_date + 'T23:59:59')) && !isToday(new Date(b.due_date + 'T12:00:00')));
  const dueSoon = pendingBills.filter(b => {
    const d = new Date(b.due_date + 'T12:00:00');
    return !isPast(d) || isToday(d);
  });

  const getStatusBadge = (b: Bill) => {
    const d = new Date(b.due_date + 'T12:00:00');
    if (b.status === 'pago') return <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" />Pago</span>;
    if (isPast(d) && !isToday(d)) return <span className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"><AlertTriangle className="h-3 w-3" />Vencida</span>;
    if (isToday(d)) return <span className="flex items-center gap-1 text-xs text-warning bg-amber-50 px-2 py-0.5 rounded-full"><Clock className="h-3 w-3" />Vence Hoje</span>;
    return <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><Clock className="h-3 w-3" />Pendente</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" /> Contas a Pagar
          </h1>
          <p className="text-muted-foreground text-sm">{overdue.length} vencida(s) • {dueSoon.length} pendente(s)</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm({ due_date: '', description: '', amount: '', category_id: '', notes: '' }); setEditId(null); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">{editId ? 'Editar Conta' : 'Nova Conta'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Descricao *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Vencimento *</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Observacoes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSave} className="w-full">{editId ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Bills */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pendentes / Vencidas</h2>
        {pendingBills.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conta pendente.</p>
        ) : (
          pendingBills.map(b => (
            <Card key={b.id} className={`border-l-4 ${isPast(new Date(b.due_date + 'T23:59:59')) && !isToday(new Date(b.due_date + 'T12:00:00')) ? 'border-l-destructive' : isToday(new Date(b.due_date + 'T12:00:00')) ? 'border-l-warning' : 'border-l-primary/30'}`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{b.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(b)}
                    <span className="text-xs text-muted-foreground">{format(new Date(b.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                    {b.financial_categories?.name && <span className="text-xs text-muted-foreground">• {b.financial_categories.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-destructive">{formatCurrency(b.amount)}</p>
                  <Button size="sm" onClick={() => markPaid(b)} className="text-xs h-7">Pagar</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(b)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Paid Bills */}
      {paidBills.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pagas</h2>
          {paidBills.slice(0, 10).map(b => (
            <Card key={b.id} className="border-l-4 border-l-emerald-300 opacity-70">
              <CardContent className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{b.description}</p>
                  <span className="text-xs text-muted-foreground">{format(new Date(b.due_date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{formatCurrency(b.amount)}</p>
                  {getStatusBadge(b)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
