import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Entry {
  entry_date: string;
  type: string;
  amount: number;
  description: string | null;
  financial_categories: { name: string } | null;
}

export default function MonthlyReport() {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => { fetchData(); }, [month, year]);

  const fetchData = async () => {
    const m = month.padStart(2, '0');
    const daysInMonth = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1));
    const dateFrom = `${year}-${m}-01`;
    const dateTo = `${year}-${m}-${daysInMonth}`;

    const { data } = await supabase
      .from('financial_entries')
      .select('entry_date, type, amount, description, financial_categories(name)')
      .gte('entry_date', dateFrom)
      .lte('entry_date', dateTo)
      .order('entry_date');

    if (data) setEntries(data as unknown as Entry[]);
  };

  const totalRevenue = entries.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = entries.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalRevenue - totalExpenses;
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  // Category breakdown
  const categoryMap: Record<string, { revenue: number; expenses: number }> = {};
  entries.forEach(e => {
    const cat = e.financial_categories?.name || 'Sem Categoria';
    if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, expenses: 0 };
    if (e.type === 'receita') categoryMap[cat].revenue += Number(e.amount);
    else categoryMap[cat].expenses += Number(e.amount);
  });

  // Daily chart data
  const daysInMonth = getDaysInMonth(new Date(parseInt(year), parseInt(month) - 1));
  const dailyData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const date = `${year}-${month.padStart(2, '0')}-${day}`;
    const dayEntries = entries.filter(e => e.entry_date === date);
    return {
      day: i + 1,
      receita: dayEntries.filter(e => e.type === 'receita').reduce((s, e) => s + Number(e.amount), 0),
      despesa: dayEntries.filter(e => e.type === 'despesa').reduce((s, e) => s + Number(e.amount), 0),
    };
  });

  const exportCSV = () => {
    const header = 'Data,Tipo,Categoria,Valor,Descricao\n';
    const rows = entries.map(e =>
      `${e.entry_date},${e.type},${e.financial_categories?.name || ''},${e.amount},"${e.description || ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${year}_${month}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const monthName = format(new Date(parseInt(year), parseInt(month) - 1), 'MMMM yyyy', { locale: ptBR });

    // Header
    doc.setFontSize(18);
    doc.text('Estudio Giovanna Nails', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Relatorio Financeiro - ${monthName}`, 105, 30, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // Summary
    doc.setFontSize(11);
    doc.text(`Total Receitas: ${formatCurrency(totalRevenue)}`, 20, 45);
    doc.text(`Total Despesas: ${formatCurrency(totalExpenses)}`, 20, 52);
    doc.setFontSize(12);
    doc.text(`Saldo Final: ${formatCurrency(balance)}`, 20, 62);
    doc.line(20, 66, 190, 66);

    // Category breakdown
    doc.setFontSize(11);
    doc.text('Detalhamento por Categoria:', 20, 76);
    const catRows = Object.entries(categoryMap).map(([cat, vals]) => [
      cat,
      formatCurrency(vals.revenue),
      formatCurrency(vals.expenses),
      formatCurrency(vals.revenue - vals.expenses),
    ]);

    autoTable(doc, {
      startY: 80,
      head: [['Categoria', 'Receitas', 'Despesas', 'Saldo']],
      body: catRows,
      theme: 'grid',
      headStyles: { fillColor: [201, 168, 76] },
      margin: { left: 20, right: 20 },
    });

    // Entries table
    const lastY = (doc as any).lastAutoTable?.finalY || 120;
    doc.text('Lancamentos:', 20, lastY + 10);

    autoTable(doc, {
      startY: lastY + 14,
      head: [['Data', 'Tipo', 'Categoria', 'Valor', 'Descricao']],
      body: entries.map(e => [
        format(new Date(e.entry_date + 'T12:00:00'), 'dd/MM/yyyy'),
        e.type,
        e.financial_categories?.name || '-',
        formatCurrency(Number(e.amount)),
        (e.description || '-').substring(0, 40),
      ]),
      theme: 'grid',
      headStyles: { fillColor: [201, 168, 76] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 8 },
    });

    doc.save(`relatorio_${year}_${month}.pdf`);
  };

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: format(new Date(2024, i), 'MMMM', { locale: ptBR }),
  }));

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 2 + i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Relatorio Mensal
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> CSV</Button>
          <Button onClick={exportPDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-primary/10">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4 text-center">
            <TrendingDown className="h-6 w-6 mx-auto text-destructive mb-2" />
            <p className="text-xs text-muted-foreground">Despesas</p>
            <p className="text-xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 mx-auto text-primary mb-2" />
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatCurrency(balance)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart */}
      <Card className="border-primary/10">
        <CardHeader className="pb-2"><CardTitle className="text-lg font-serif">Evolucao Diaria</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="receita" fill="#10b981" name="Receitas" radius={[2, 2, 0, 0]} />
                <Bar dataKey="despesa" fill="#ef4444" name="Despesas" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="border-primary/10">
        <CardHeader className="pb-2"><CardTitle className="text-lg font-serif">Por Categoria</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(categoryMap).map(([cat, vals]) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{cat}</span>
                <div className="flex gap-4 text-sm">
                  {vals.revenue > 0 && <span className="text-emerald-600">+{formatCurrency(vals.revenue)}</span>}
                  {vals.expenses > 0 && <span className="text-destructive">-{formatCurrency(vals.expenses)}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
