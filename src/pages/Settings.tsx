import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, UserPlus, Pencil, Shield, Tag } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  user_roles: { role: string }[];
}

interface Category {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userOpen, setUserOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'NAIL_DESIGNER' });
  const [newCat, setNewCat] = useState({ name: '', type: 'despesa' });
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    if (isAdmin) {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, email');
      if (profs) {
        const withRoles = await Promise.all(profs.map(async (p) => {
          const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', p.id);
          return { ...p, user_roles: roles || [] };
        }));
        setProfiles(withRoles as Profile[]);
      }
    }

    const { data: cats } = await supabase.from('financial_categories').select('*').order('type, name');
    if (cats) setCategories(cats as Category[]);
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast({ title: 'Email e senha obrigatorios', variant: 'destructive' }); return;
    }
    const { data, error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: { data: { full_name: newUser.full_name } },
    });
    if (error) {
      toast({ title: 'Erro ao criar usuario', description: error.message, variant: 'destructive' }); return;
    }
    if (data.user) {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role: newUser.role });
    }
    toast({ title: 'Usuario criado com sucesso' });
    setUserOpen(false);
    setNewUser({ email: '', password: '', full_name: '', role: 'NAIL_DESIGNER' });
    fetchData();
  };

  const createCategory = async () => {
    if (!newCat.name.trim()) { toast({ title: 'Nome obrigatorio', variant: 'destructive' }); return; }
    await supabase.from('financial_categories').insert({ name: newCat.name, type: newCat.type });
    toast({ title: 'Categoria criada' });
    setCatOpen(false);
    setNewCat({ name: '', type: 'despesa' });
    fetchData();
  };

  const toggleCategory = async (id: string, active: boolean) => {
    await supabase.from('financial_categories').update({ active: !active }).eq('id', id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
        <SettingsIcon className="h-6 w-6 text-primary" /> Configuracoes
      </h1>

      {/* Users (Admin only) */}
      {isAdmin && (
        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Usuarios
            </CardTitle>
            <Dialog open={userOpen} onOpenChange={setUserOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Novo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-serif">Novo Usuario</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} /></div>
                  <div><Label>Email *</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} /></div>
                  <div><Label>Senha *</Label><Input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} /></div>
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" variant={newUser.role === 'ADMIN' ? 'default' : 'outline'}
                      onClick={() => setNewUser({ ...newUser, role: 'ADMIN' })}>Admin</Button>
                    <Button type="button" className="flex-1" variant={newUser.role === 'NAIL_DESIGNER' ? 'default' : 'outline'}
                      onClick={() => setNewUser({ ...newUser, role: 'NAIL_DESIGNER' })}>Nail Designer</Button>
                  </div>
                  <Button onClick={createUser} className="w-full">Criar Usuario</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum usuario encontrado.</p>
            ) : (
              <div className="space-y-2">
                {profiles.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{p.full_name || p.email}</p>
                      <p className="text-xs text-muted-foreground">{p.email}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {p.user_roles?.[0]?.role || 'Sem role'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      <Card className="border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" /> Categorias Financeiras
          </CardTitle>
          {isAdmin && (
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Pencil className="h-4 w-4 mr-1" /> Nova</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-serif">Nova Categoria</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} /></div>
                  <div className="flex gap-2">
                    <Button type="button" className="flex-1" variant={newCat.type === 'receita' ? 'default' : 'outline'}
                      onClick={() => setNewCat({ ...newCat, type: 'receita' })}>Receita</Button>
                    <Button type="button" className="flex-1" variant={newCat.type === 'despesa' ? 'destructive' : 'outline'}
                      onClick={() => setNewCat({ ...newCat, type: 'despesa' })}>Despesa</Button>
                  </div>
                  <Button onClick={createCategory} className="w-full">Criar</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-emerald-600 mb-2">Receita</h3>
              {categories.filter(c => c.type === 'receita').map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <span className={`text-sm ${!c.active ? 'line-through text-muted-foreground' : ''}`}>{c.name}</span>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => toggleCategory(c.id, c.active)} className="text-xs h-6">
                      {c.active ? 'Desativar' : 'Ativar'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div>
              <h3 className="text-sm font-medium text-destructive mb-2">Despesa</h3>
              {categories.filter(c => c.type === 'despesa').map(c => (
                <div key={c.id} className="flex items-center justify-between py-1.5">
                  <span className={`text-sm ${!c.active ? 'line-through text-muted-foreground' : ''}`}>{c.name}</span>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => toggleCategory(c.id, c.active)} className="text-xs h-6">
                      {c.active ? 'Desativar' : 'Ativar'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
