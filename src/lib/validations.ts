import { z } from 'zod';
import { isValidCPF } from './format';

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const oneYearAhead = () => {
  const d = today();
  d.setFullYear(d.getFullYear() + 1);
  return d;
};

export const entryDateSchema = z
  .string()
  .min(1, 'Data obrigatória')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Data inválida')
  .refine((s) => new Date(s) <= oneYearAhead(), 'Data não pode ser superior a 1 ano no futuro');

export const financialEntrySchema = z.object({
  entry_date: entryDateSchema,
  type: z.enum(['receita', 'despesa']),
  amount: z
    .string()
    .min(1, 'Valor obrigatório')
    .refine((v) => parseFloat(v) > 0, 'Valor deve ser maior que zero'),
  description: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
  payment_method: z.string().optional(),
  category_id: z.string().optional(),
  client_id: z.string().optional(),
});

export const billSchema = z.object({
  due_date: entryDateSchema,
  description: z.string().trim().min(1, 'Descrição obrigatória').max(200),
  amount: z.string().refine((v) => parseFloat(v) > 0, 'Valor deve ser maior que zero'),
  category_id: z.string().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const clientSchema = z.object({
  full_name: z.string().trim().min(2, 'Nome muito curto').max(120, 'Nome muito longo'),
  cpf: z
    .string()
    .optional()
    .refine((v) => !v || v.replace(/\D/g, '').length === 0 || isValidCPF(v), 'CPF inválido'),
  phone: z.string().trim().max(20).optional(),
  whatsapp: z.string().trim().max(20).optional(),
  instagram: z.string().trim().max(60).optional(),
  birth_date: z.string().optional(),
  client_since: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type AnamnesisData = {
  previous_extension?: boolean;
  preferred_type?: 'gel' | 'fibra' | 'acrigel' | 'porcelana' | '';
  allergies?: string;
  diabetes?: boolean;
  circulation_issues?: boolean;
  has_micose?: boolean;
  has_onicofagia?: boolean;
  has_psoriasis?: boolean;
  continuous_medication?: string;
  pregnant_lactating?: boolean;
  intense_activities?: string;
  designer_notes?: string;
  consent?: boolean;
};
