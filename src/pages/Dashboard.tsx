import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarPlus, Wallet, UserPlus, FileText,
  TrendingUp, TrendingDown, DollarSign, Clock
} from 'lucide-react';

interface DaySummary {
  revenue: number;
  expenses: number;
}

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number;
  clients: { full_name: string } | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), 'yyyy-MM-dd');

  const [daySummary, setDaySummary] = useState<DaySummary>({ revenue: 0, expenses: 0 });
  const [monthSummary, setMonthSummary] = useState<DaySummary>({ revenue: 0, expenses: 0 });
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [overdueBills, setOverdueBills] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Day financial summary
    const { data: dayEntries } = await supabase
      .from('financial_entries')
      .select('type, amount')
      .eq('entry_date', today);

    if (dayEntries) {
      const rev = dayEntries.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0);
      const exp = dayEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0);
      setDaySummary({ revenue: rev, expenses: exp });
    }

    // Month financial summary
    const { data: monthEntries } = await supabase
      .from('financial_entries')
      .select('type, amount')
      .gte('entry_date', monthStart)
      .lte('entry_date', monthEnd);

    if (monthEntries) {
      const rev = monthEntries.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0);
      const exp = monthEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0);
      setMonthSummary({ revenue: rev, expenses: exp });
    }

    // Today's appointments
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status, total_price, clients(full_name)')
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .order('start_time');

    if (appts) setTodayAppointments(appts as unknown as Appointment[]);

    // Overdue bills
    const { count } = await supabase
      .from('bills_to_pay')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente')
      .lt('due_date', today);

    setOverdueBills(count || 0);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const statusColors: Record<string, string> = {
    agendado: 'bg-blue-100 text-blue-700',
    confirmado: 'bg-primary/10 text-primary',
    concluido: 'bg-green-100 text-green-700',
    cancelado: 'bg-destructive/10 text-destructive',
    nao_compareceu: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {overdueBills > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex items-center gap-2">
          <span className="font-medium">Atencao:</span> {overdueBills} conta(s) vencida(s)!
          <Button size="sm" variant="outline" onClick={() => navigate('/contas-a-pagar')} className="ml-auto border-destructive/30 text-destructive">
            Ver contas
          </Button>
        </div>
      )}

      {/* Financial Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" /> Receita Dia
            </div>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(daySummary.revenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" /> Despesa Dia
            </div>
            <p className="text-lg font-semibold text-destructive">{formatCurrency(daySummary.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" /> Saldo Dia
            </div>
            <p className="text-lg font-semibold">{formatCurrency(daySummary.revenue - daySummary.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" /> Receita Mes
            </div>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(monthSummary.revenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" /> Despesa Mes
            </div>
            <p className="text-lg font-semibold text-destructive">{formatCurrency(monthSummary.expenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" /> Saldo Mes
            </div>
            <p className="text-lg font-semibold">{formatCurrency(monthSummary.revenue - monthSummary.expenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 border-primary/20 hover:bg-primary/5"
          onClick={() => navigate('/agenda?new=true')}>
          <CalendarPlus className="h-5 w-5 text-primary" />
          <span className="text-xs">Novo Agendamento</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 border-primary/20 hover:bg-primary/5"
          onClick={() => navigate('/caixa-diario?new=true')}>
          <Wallet className="h-5 w-5 text-primary" />
          <span className="text-xs">Lancar no Caixa</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 border-primary/20 hover:bg-primary/5"
          onClick={() => navigate('/clientes?new=true')}>
          <UserPlus className="h-5 w-5 text-primary" />
          <span className="text-xs">Cadastrar Cliente</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex flex-col gap-1 border-primary/20 hover:bg-primary/5"
          onClick={() => navigate('/relatorio')}>
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs">Relatorio Mensal</span>
        </Button>
      </div>

      {/* Today's Appointments */}
      <Card className="border-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Agenda de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum atendimento agendado para hoje.</p>
          ) : (
            <div className="space-y-2">
              {todayAppointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-primary">
                      {format(new Date(appt.start_time), 'HH:mm')}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{appt.clients?.full_name || 'Cliente'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(appt.start_time), 'HH:mm')} - {format(new Date(appt.end_time), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatCurrency(Number(appt.total_price))}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[appt.status] || ''}`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
