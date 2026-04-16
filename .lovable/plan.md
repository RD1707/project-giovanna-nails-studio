

# Estúdio Giovanna Nails — Painel Administrativo

## Visão Geral
Sistema administrativo completo para gestão de uma nail designer, com controle financeiro, agenda, clientes e serviços. Design minimalista branco com detalhes em dourado (#C9A84C) e rosa (#E8A0BF), tipografia moderna (Inter/Playfair Display).

## Autenticação & Controle de Acesso
- Login com email/senha via Supabase Auth
- Tabela `user_roles` com roles ADMIN e NAIL_DESIGNER (seguindo padrão seguro com `has_role()` security definer)
- Rotas protegidas — apenas usuários autenticados acessam o painel
- ADMIN pode gerenciar usuários; NAIL_DESIGNER tem acesso operacional

## Banco de Dados (SQL completo para Supabase)
Arquivo SQL pronto para copiar e colar, incluindo:
- **profiles** — dados do usuário vinculados a auth.users
- **user_roles** — controle de permissões (ADMIN/NAIL_DESIGNER)
- **clients** — clientes com nome, telefone, WhatsApp, Instagram, nascimento, observações
- **services** — serviços (nome, valor, duração, status ativo/inativo)
- **appointments** — agendamentos vinculados a cliente + serviços, com status, horários, valor
- **appointment_services** — relação N:N entre agendamentos e serviços
- **financial_categories** — categorias de receita/despesa (pré-populadas com seeds)
- **financial_entries** — tabela principal de lançamentos financeiros
- **bills_to_pay** — contas a pagar com vencimento, status, categoria
- **notifications** — notificações internas
- **schedule_blocks** — bloqueios de horário (folgas/intervalos)
- RLS em todas as tabelas, triggers para auto-criação de perfil e integração financeira

## Páginas & Módulos

### 1. Dashboard
- Agenda do dia com próximos atendimentos
- Cards financeiros: receita/despesa/saldo do dia e do mês
- Alertas de contas a pagar vencidas ou próximas
- Atalhos rápidos: novo agendamento, lançar no caixa, cadastrar cliente, relatório mensal

### 2. Clientes
- Lista com busca e filtros
- Cadastro/edição com todos os campos
- Visualização do histórico de agendamentos e financeiro

### 3. Serviços
- CRUD de serviços (alongamento em gel, manutenção, remoção, etc.)
- Campos: nome, valor padrão, duração média, ativo/inativo
- Seeds com serviços comuns pré-cadastrados

### 4. Agenda
- Calendário com visualização mensal, semanal e diária
- Criação de agendamentos vinculados a cliente + serviço(s)
- Valor puxado automaticamente dos serviços, editável
- Status: agendado → confirmado → concluído → cancelado / não compareceu
- Prevenção de conflitos de horário
- Bloqueio de horários para folgas
- Ao concluir: sugestão automática de lançamento financeiro

### 5. Caixa Diário
- Lançamento rápido de receitas e despesas do dia
- Campos: data, tipo, categoria, valor, descrição, forma de pagamento, vínculo com cliente/agendamento
- Alimenta automaticamente a tabela principal de lançamentos

### 6. Lançamentos Financeiros (Planilha Principal)
- Tabela completa com todos os lançamentos
- Filtros por período, tipo, categoria
- Busca e edição manual
- Possibilidade de ajustes retroativos

### 7. Contas a Pagar
- CRUD completo de contas
- Status: pendente / pago / vencido
- Destaque visual para vencidas e próximas do vencimento
- Notificação/alerta no dia do vencimento (com som)
- Integração com relatório financeiro mensal

### 8. Relatório Mensal
- Seleção de mês/ano
- Total receitas, despesas, saldo
- Detalhamento por categoria
- Gráficos de evolução diária (recharts)
- Exportação CSV e PDF com layout profissional (cabeçalho "Estúdio Giovanna Nails")

### 9. Notificações
- Painel de notificações internas
- Alertas de agendamentos próximos, cancelamentos, contas vencendo
- Estrutura preparada para integração futura com WhatsApp/email

### 10. Configurações (ADMIN)
- Gerenciamento de usuários
- Edição de categorias financeiras
- Configurações gerais do estúdio

## Design
- Fundo branco predominante, cards com bordas suaves
- Dourado (#C9A84C) para destaques, botões primários e ícones
- Rosa (#E8A0BF) para acentos secundários e badges
- Tipografia: Inter (corpo) + Playfair Display (títulos)
- Sidebar de navegação elegante e responsiva
- Layout mobile-first, responsivo para tablet e desktop

## Entregáveis
- Código completo do front-end (React + TypeScript + Tailwind + shadcn/ui)
- Arquivo SQL completo para Supabase (tabelas, RLS, seeds, triggers)
- README.md profissional com instruções de setup, deploy e uso

