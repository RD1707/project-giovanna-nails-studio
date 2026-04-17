

## Objetivo
3 melhorias principais + polish geral no sistema.

## 1. Tipografia minimalista (Product Sans)
Product Sans é proprietária do Google e não está no Google Fonts. Vou usar **Google Sans Display** (alternativa oficial pública mais próxima) com fallback para **Inter**. Para os títulos, troco a Playfair Display (serifada) por uma sans-serif geométrica mais limpa, mantendo hierarquia.

- Body/UI: `Google Sans, Inter, system-ui` (peso 400/500)
- Headings: mesma família, peso 600/700, tracking levemente reduzido
- Atualizar `index.css` (import + `body`/`h1-h6`) e `tailwind.config.ts` (`fontFamily.sans` e `fontFamily.serif` apontando para a mesma stack para não quebrar `font-serif` existente)

## 2. Lançamentos Financeiros — data customizável
No `FinancialEntries.tsx` e `DailyCash.tsx`, adicionar campo `entry_date` editável (input `type="date"`) no formulário de novo lançamento, permitindo retroativos/futuros. Default = hoje. Validar com Zod (data válida, não > 1 ano no futuro).

## 3. Cadastro de Clientes — novos campos + Anamnese
Em `Clients.tsx`, dialog reorganizado em **abas** (Tabs do shadcn):

**Aba "Dados Pessoais"**
- Nome, CPF (com máscara e validação), telefone, WhatsApp, Instagram, nascimento
- Novo: "Cliente desde" (date, default hoje)
- Observações gerais

**Aba "Ficha de Anamnese"** (opcional, foco em alongamento de unhas)
- Já fez alongamento antes? (sim/não)
- Tipo preferido (gel, fibra, acrigel, porcelana)
- Alergias conhecidas (acrilato, formol, etc.) — texto livre
- Possui diabetes / problemas circulatórios? (sim/não)
- Possui micose, onicofagia, psoríase ungueal? (checkboxes)
- Usa medicamento contínuo? (texto)
- Está gestante/lactante? (sim/não)
- Pratica esportes/atividade manual intensa? (texto)
- Observações da designer
- Data da última atualização da ficha (auto)
- Assinatura/consentimento (checkbox "Declaro que as informações são verdadeiras")

### Mudanças de schema (migration SQL)
Adicionar à tabela `clients`:
- `cpf text` (único, nullable)
- `client_since date default current_date`
- `anamnesis jsonb` (guarda toda a ficha de forma flexível, evita 15 colunas novas)
- `anamnesis_updated_at timestamptz`

Vou entregar o SQL atualizado em `supabase-schema.sql` + bloco de migration separado para quem já tem o banco rodando.

## 4. Melhorias gerais (polish)
- **Validação Zod** nos formulários principais (clientes, lançamentos, contas a pagar)
- **Máscaras** para CPF, telefone e valores monetários (R$)
- **Estados de loading** nos botões de salvar (evita duplo-clique)
- **Confirmação antes de excluir** (AlertDialog) — hoje deleta direto
- **Empty states** mais elegantes e consistentes
- **Toast de erro** quando Supabase retorna erro (hoje só sucesso)
- **Formatação de moeda** centralizada em `src/lib/format.ts` (`formatBRL`, `formatDate`, `formatCPF`)
- **Skeleton loaders** no Dashboard enquanto carrega métricas
- **Atalho de teclado** `Cmd/Ctrl+K` para busca rápida (opcional, só se couber)

## Arquivos afetados
- `src/index.css`, `tailwind.config.ts` — fontes
- `src/pages/Clients.tsx` — abas, anamnese, novos campos, validação
- `src/pages/FinancialEntries.tsx`, `src/pages/DailyCash.tsx` — data customizável
- `src/pages/BillsToPay.tsx` — confirmação delete + validação
- `src/lib/format.ts` (novo) — helpers
- `src/lib/validations.ts` (novo) — schemas Zod
- `supabase-schema.sql` — colunas novas em clients + bloco ALTER para migração
- Pequenos ajustes em `Dashboard.tsx` (skeletons) e componentes de UI conforme necessário

## Não incluído
- Product Sans original (proprietária) — usarei alternativa visualmente equivalente e explicarei no chat
- Atalho Cmd+K só se não inflar o escopo

