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
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameDay, isSameMonth, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  total_price: number;
  status: string;
  notes: string | null;
  clients: { full_name: string } | null;
}

interface Client { id: string; full_name: string; }
interface Service { id: string; name: string; default_price: number; average_duration: number; }

type ViewMode = 'month' | 'week' | 'day';

export default function Schedule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: '', service_ids: [] as string[], date: '', start_time: '09:00', total_price: '', notes: '', status: 'agendado' });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, [currentDate, viewMode]);

  const fetchData = async () => {
    let start: Date, end: Date;
    if (viewMode === 'month') {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    } else if (viewMode === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = new Date(currentDate); start.setHours(0, 0, 0, 0);
      end = new Date(currentDate); end.setHours(23, 59, 59, 999);
    }

    const { data: appts } = await supabase
      .from('appointments')
      .select('*, clients(full_name)')
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString())
      .order('start_time');
    if (appts) setAppointments(appts as unknown as Appointment[]);

    const { data: cl } = await supabase.from('clients').select('id, full_name').eq('active', true).order('full_name');
    if (cl) setClients(cl as Client[]);

    const { data: sv } = await supabase.from('services').select('id, name, default_price, average_duration').eq('active', true).order('name');
    if (sv) setServices(sv as Service[]);
  };

  const handleSave = async () => {
    if (!form.client_id || !form.date || !form.start_time) {
      toast({ title: 'Preencha os campos obrigatorios', variant: 'destructive' });
      return;
    }
    const totalDuration = form.service_ids.reduce((sum, sid) => {
      const s = services.find(sv => sv.id === sid);
      return sum + (s?.average_duration || 60);
    }, 0) || 60;

    const startDt = new Date(`${form.date}T${form.start_time}:00`);
    const endDt = new Date(startDt.getTime() + totalDuration * 60000);

    // Check conflicts
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .neq('status', 'cancelado')
      .lt('start_time', endDt.toISOString())
      .gt('end_time', startDt.toISOString());

    if (conflicts && conflicts.length > 0) {
      toast({ title: 'Conflito de horario!', description: 'Ja existe um agendamento nesse horario.', variant: 'destructive' });
      return;
    }

    const totalPrice = parseFloat(form.total_price) || form.service_ids.reduce((sum, sid) => {
      const s = services.find(sv => sv.id === sid);
      return sum + (s?.default_price || 0);
    }, 0);

    const { data: appt, error } = await supabase.from('appointments').insert({
      client_id: form.client_id,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      total_price: totalPrice,
      status: form.status,
      notes: form.notes || null,
    }).select().single();

    if (error) { toast({ title: 'Erro ao salvar', variant: 'destructive' }); return; }

    if (appt && form.service_ids.length > 0) {
      const apptServices = form.service_ids.map(sid => ({
        appointment_id: appt.id,
        service_id: sid,
        price: services.find(s => s.id === sid)?.default_price || 0,
      }));
      await supabase.from('appointment_services').insert(apptServices);
    }

    toast({ title: 'Agendamento criado' });
    setOpen(false);
    setForm({ client_id: '', service_ids: [], date: '', start_time: '09:00', total_price: '', notes: '', status: 'agendado' });
    fetchData();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    if (status === 'concluido') {
      const appt = appointments.find(a => a.id === id);
      if (appt) {
        const { data: cats } = await supabase.from('financial_categories').select('id').eq('name', 'Servicos').eq('type', 'receita').single();
        await supabase.from('financial_entries').insert({
          entry_date: format(new Date(appt.start_time), 'yyyy-MM-dd'),
          type: 'receita',
          category_id: cats?.id || null,
          amount: appt.total_price,
          description: `Atendimento - ${appt.clients?.full_name || 'Cliente'}`,
          payment_method: 'pix',
          client_id: appt.client_id,
          appointment_id: appt.id,
        });
        toast({ title: 'Concluido! Receita lancada automaticamente.' });
      }
    } else {
      toast({ title: `Status atualizado para ${status}` });
    }
    fetchData();
  };

  const navigate = (dir: number) => {
    if (viewMode === 'month') setCurrentDate(dir > 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, dir * 7));
    else setCurrentDate(addDays(currentDate, dir));
  };

  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 }),
  });

  const statusColors: Record<string, string> = {
    agendado: 'bg-blue-100 text-blue-700',
    confirmado: 'bg-primary/10 text-primary',
    concluido: 'bg-emerald-100 text-emerald-700',
    cancelado: 'bg-destructive/10 text-destructive',
    nao_compareceu: 'bg-muted text-muted-foreground',
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const toggleService = (sid: string) => {
    const ids = form.service_ids.includes(sid)
      ? form.service_ids.filter(id => id !== sid)
      : [...form.service_ids, sid];
    setForm({ ...form, service_ids: ids, total_price: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-serif font-bold text-foreground">Agenda</h1>
        <div className="flex items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {(['month', 'week', 'day'] as ViewMode[]).map(m => (
              <Button key={m} size="sm" variant={viewMode === m ? 'default' : 'ghost'} onClick={() => setViewMode(m)} className="text-xs">
                {m === 'month' ? 'Mes' : m === 'week' ? 'Semana' : 'Dia'}
              </Button>
            ))}
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-serif">Novo Agendamento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Cliente *</Label>
                  <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Servicos</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {services.map(s => (
                      <Button key={s.id} size="sm" type="button"
                        variant={form.service_ids.includes(s.id) ? 'default' : 'outline'}
                        onClick={() => toggleService(s.id)}
                        className="text-xs"
                      >
                        {s.name} ({formatCurrency(s.default_price)})
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Data *</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
                  <div><Label>Horario *</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                </div>
                <div>
                  <Label>Valor Total (R$)</Label>
                  <Input type="number" step="0.01" value={form.total_price} onChange={e => setForm({ ...form, total_price: e.target.value })}
                    placeholder={formatCurrency(form.service_ids.reduce((s, id) => s + (services.find(sv => sv.id === id)?.default_price || 0), 0))} />
                </div>
                <div><Label>Observacoes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full">Agendar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-5 w-5" /></Button>
        <h2 className="text-lg font-serif font-semibold">
          {viewMode === 'month' ? format(currentDate, "MMMM 'de' yyyy", { locale: ptBR }) :
           viewMode === 'week' ? `Semana de ${format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'dd/MM')}` :
           format(currentDate, "dd 'de' MMMM", { locale: ptBR })}
        </h2>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map(d => (
            <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {monthDays.map(day => {
            const dayAppts = appointments.filter(a => isSameDay(new Date(a.start_time), day));
            return (
              <div key={day.toISOString()}
                className={`bg-background p-1.5 min-h-[80px] cursor-pointer hover:bg-muted/50 transition-colors ${!isSameMonth(day, currentDate) ? 'opacity-40' : ''} ${isSameDay(day, new Date()) ? 'ring-1 ring-primary' : ''}`}
                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
              >
                <span className={`text-xs font-medium ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </span>
                {dayAppts.slice(0, 2).map(a => (
                  <div key={a.id} className={`text-[10px] px-1 py-0.5 rounded mt-0.5 truncate ${statusColors[a.status] || 'bg-muted'}`}>
                    {format(new Date(a.start_time), 'HH:mm')} {a.clients?.full_name?.split(' ')[0]}
                  </div>
                ))}
                {dayAppts.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayAppts.length - 2}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="space-y-2">
          {appointments.filter(a => isSameDay(new Date(a.start_time), currentDate)).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum atendimento neste dia.</p>
          ) : (
            appointments.filter(a => isSameDay(new Date(a.start_time), currentDate)).map(a => (
              <Card key={a.id} className="border-primary/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.clients?.full_name || 'Cliente'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(a.start_time), 'HH:mm')} - {format(new Date(a.end_time), 'HH:mm')}
                      </p>
                      <p className="text-sm font-semibold text-primary mt-1">{formatCurrency(Number(a.total_price))}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[a.status] || ''}`}>{a.status}</span>
                      <div className="flex gap-1 mt-1">
                        {a.status === 'agendado' && <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, 'confirmado')} className="text-xs h-7">Confirmar</Button>}
                        {(a.status === 'agendado' || a.status === 'confirmado') && (
                          <>
                            <Button size="sm" onClick={() => updateStatus(a.id, 'concluido')} className="text-xs h-7">Concluir</Button>
                            <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, 'cancelado')} className="text-xs h-7 text-destructive">Cancelar</Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-7 gap-2">
          {eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) }).map(day => {
            const dayAppts = appointments.filter(a => isSameDay(new Date(a.start_time), day));
            return (
              <div key={day.toISOString()} className={`space-y-1 ${isSameDay(day, new Date()) ? 'ring-1 ring-primary rounded-lg p-1' : 'p-1'}`}>
                <p className="text-xs font-medium text-center">{format(day, 'EEE dd', { locale: ptBR })}</p>
                {dayAppts.map(a => (
                  <div key={a.id} className={`text-[10px] p-1 rounded ${statusColors[a.status] || 'bg-muted'} cursor-pointer`}
                    onClick={() => { setCurrentDate(day); setViewMode('day'); }}>
                    <p className="font-medium">{format(new Date(a.start_time), 'HH:mm')}</p>
                    <p className="truncate">{a.clients?.full_name?.split(' ')[0]}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
