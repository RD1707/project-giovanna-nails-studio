# Estudio Giovanna Nails - Painel Administrativo

Sistema administrativo completo para gestao de nail designer, com controle financeiro, agenda, clientes e servicos.

## Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Graficos**: Recharts
- **PDF**: jsPDF + jspdf-autotable
- **Datas**: date-fns

## Instalacao

1. Clone o repositorio
2. Instale as dependencias:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz com as variaveis do Supabase:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```
4. Rode o projeto:
   ```bash
   npm run dev
   ```

   senha do banco 292225Ramon@123

## Configuracao do Supabase

1. Crie um projeto no Supabase (https://supabase.com)
2. Acesse o SQL Editor no painel do Supabase
3. Copie e cole todo o conteudo do arquivo `supabase-schema.sql` e execute
4. Isso criara todas as tabelas, indices, RLS policies, triggers e dados iniciais

## Criando o Primeiro Usuario

1. No Supabase Dashboard, va em Authentication > Users > Add User
2. Crie um usuario com email e senha
3. Depois de criado, copie o UUID do usuario
4. No SQL Editor, insira a role ADMIN:
   ```sql
   INSERT INTO public.user_roles (user_id, role)
   VALUES ('UUID-DO-USUARIO', 'ADMIN');
   ```
5. Agora voce pode fazer login no sistema e criar outros usuarios pela interface

## Modulos

- **Dashboard**: Visao geral com agenda do dia, resumo financeiro e atalhos rapidos
- **Clientes**: Cadastro e gestao de clientes com historico
- **Servicos**: Cadastro de servicos com preco e duracao
- **Agenda**: Calendario mensal/semanal/diario com agendamentos
- **Caixa Diario**: Lancamento de receitas e despesas do dia
- **Lancamentos**: Planilha principal com todos os lancamentos financeiros
- **Contas a Pagar**: Gestao de contas com alertas de vencimento
- **Relatorio Mensal**: Relatorio consolidado com graficos e exportacao PDF/CSV
- **Notificacoes**: Alertas internos do sistema
- **Configuracoes**: Gestao de usuarios (ADMIN) e categorias financeiras

## Fluxo Financeiro

1. Lancamentos sao feitos pelo Caixa Diario ou automaticamente ao concluir agendamentos
2. Todos os lancamentos alimentam a tabela principal (Lancamentos Financeiros)
3. Contas a Pagar, ao serem marcadas como pagas, geram lancamentos de despesa automaticamente
4. O Relatorio Mensal consolida todos os dados da tabela principal

## Exportacoes

- **CSV**: Exporta lancamentos do mes em formato CSV
- **PDF**: Gera relatorio profissional com cabecalho "Estudio Giovanna Nails", resumo e detalhamento

## Perfis de Acesso

- **ADMIN**: Acesso total, pode criar usuarios e gerenciar categorias
- **NAIL_DESIGNER**: Acesso operacional (agenda, clientes, caixa, relatorios)

## Deploy

1. Build de producao: `npm run build`
2. Os arquivos ficam na pasta `dist/`
3. Pode ser deployado no Vercel, Netlify, ou qualquer hosting estatico
4. Configure as variaveis de ambiente no servico de hosting

## Seguranca

- Todas as tabelas possuem RLS (Row Level Security)
- Roles sao armazenadas em tabela separada (user_roles)
- Funcao `has_role()` com SECURITY DEFINER evita recursao em policies
- Apenas usuarios autenticados acessam os dados
