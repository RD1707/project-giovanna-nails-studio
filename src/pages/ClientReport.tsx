import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, ArrowLeft } from 'lucide-react';
import { formatCPF, formatPhone, formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
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
  created_at: string;
}

interface Appointment {
  id: string;
  start_time: string;
  status: string;
  total_price: number;
}

export default function ClientReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (clientError || !clientData) {
      toast({ title: 'Erro ao buscar cliente', description: clientError?.message || 'Cliente não encontrado', variant: 'destructive' });
      navigate('/clientes');
      return;
    }
    setClient(clientData as unknown as Client);

    // Fetch Appointments History
    const { data: apptData, error: apptError } = await supabase
      .from('appointments')
      .select('id, start_time, status, total_price')
      .eq('client_id', id)
      .order('start_time', { ascending: false })
      .limit(10); // Last 10 appointments

    if (!apptError && apptData) {
      setAppointments(apptData);
    }
    
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full p-12">Carregando relatório...</div>;
  }

  if (!client) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Non-printable controls */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Clientes
        </Button>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir Ficha
        </Button>
      </div>

      {/* Printable Area */}
      <div className="bg-white text-black p-8 rounded-xl shadow-sm print:shadow-none print:p-0 print:m-0 space-y-8" id="printable-area">
        
        {/* Header */}
        <div className="text-center border-b pb-6 border-gray-200">
          <h1 className="text-3xl font-serif font-bold text-gray-900">Giovanna Nails Studio</h1>
          <p className="text-gray-500 mt-2 text-sm">Ficha Cadastral e de Anamnese</p>
          <p className="text-xs text-gray-400 mt-1">Gerado em: {formatDate(new Date().toISOString(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        {/* Personal Info */}
        <section>
          <h2 className="text-xl font-bold border-b border-gray-200 pb-2 mb-4">Dados Pessoais</h2>
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div><strong>Nome:</strong> {client.full_name}</div>
            <div><strong>CPF:</strong> {client.cpf ? formatCPF(client.cpf) : 'Não informado'}</div>
            <div><strong>Data de Nasc.:</strong> {client.birth_date ? formatDate(client.birth_date, 'dd/MM/yyyy') : 'Não informado'}</div>
            <div><strong>Telefone:</strong> {client.phone ? formatPhone(client.phone) : 'Não informado'}</div>
            <div><strong>WhatsApp:</strong> {client.whatsapp ? formatPhone(client.whatsapp) : 'Não informado'}</div>
            <div><strong>Instagram:</strong> {client.instagram || 'Não informado'}</div>
            <div><strong>Cliente desde:</strong> {client.client_since ? formatDate(client.client_since, 'dd/MM/yyyy') : 'Não informado'}</div>
          </div>
          {client.notes && (
            <div className="mt-4 text-sm">
              <strong>Observações Gerais:</strong>
              <p className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </section>

        {/* Anamnesis */}
        <section className="print:break-inside-avoid">
          <h2 className="text-xl font-bold border-b border-gray-200 pb-2 mb-4">
            Ficha de Anamnese
            {client.anamnesis_updated_at && <span className="text-xs font-normal text-gray-500 ml-4">(Atualizada em: {formatDate(client.anamnesis_updated_at, 'dd/MM/yyyy')})</span>}
          </h2>
          
          {client.anamnesis ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Já fez alongamento:</strong> {client.anamnesis.previous_extension ? 'Sim' : 'Não'}</div>
                <div><strong>Tipo preferido:</strong> {client.anamnesis.preferred_type || 'Não informado'}</div>
              </div>
              
              <div>
                <strong>Alergias conhecidas:</strong>
                <p className="mt-1">{client.anamnesis.allergies || 'Nenhuma informada'}</p>
              </div>

              <div>
                <strong>Condições de Saúde:</strong>
                <ul className="list-disc list-inside mt-2 ml-4 grid grid-cols-2 gap-2">
                  <li>Diabetes: {client.anamnesis.diabetes ? 'Sim' : 'Não'}</li>
                  <li>Problemas Circulatórios: {client.anamnesis.circulation_issues ? 'Sim' : 'Não'}</li>
                  <li>Micose: {client.anamnesis.has_micose ? 'Sim' : 'Não'}</li>
                  <li>Onicofagia (Roer unhas): {client.anamnesis.has_onicofagia ? 'Sim' : 'Não'}</li>
                  <li>Psoríase Ungueal: {client.anamnesis.has_psoriasis ? 'Sim' : 'Não'}</li>
                  <li>Gestante/Lactante: {client.anamnesis.pregnant_lactating ? 'Sim' : 'Não'}</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><strong>Medicamento Contínuo:</strong> {client.anamnesis.continuous_medication || 'Não'}</div>
                <div><strong>Atividades Manuais/Esportes:</strong> {client.anamnesis.intense_activities || 'Não'}</div>
              </div>

              {client.anamnesis.designer_notes && (
                <div>
                  <strong>Observações da Designer:</strong>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{client.anamnesis.designer_notes}</p>
                </div>
              )}

              <div className="mt-6 p-4 border border-gray-300 rounded-lg text-center text-xs text-gray-600 bg-gray-50">
                <p>Declaro que as informações fornecidas são verdadeiras e autorizo a realização dos procedimentos estéticos.</p>
                <div className="mt-8 border-t border-gray-400 w-64 mx-auto pt-2">
                  Assinatura do Cliente
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Ficha de anamnese não preenchida para esta cliente.</p>
          )}
        </section>

        {/* Appointment History Summary */}
        <section className="print:break-inside-avoid">
          <h2 className="text-xl font-bold border-b border-gray-200 pb-2 mb-4">Histórico Recente (Últimos 10 atendimentos)</h2>
          {appointments.length > 0 ? (
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="py-2 px-4 font-semibold text-gray-700">Data</th>
                  <th className="py-2 px-4 font-semibold text-gray-700">Status</th>
                  <th className="py-2 px-4 font-semibold text-gray-700 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map(appt => (
                  <tr key={appt.id} className="border-b border-gray-100">
                    <td className="py-2 px-4">{formatDate(appt.start_time, 'dd/MM/yyyy HH:mm')}</td>
                    <td className="py-2 px-4 capitalize">{appt.status.replace('_', ' ')}</td>
                    <td className="py-2 px-4 text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum atendimento registrado.</p>
          )}
        </section>
      </div>

      {/* Basic Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
