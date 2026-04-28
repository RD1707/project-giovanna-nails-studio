import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, CheckSquare, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('completed', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar tarefas', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) {
      setTasks(data as Task[]);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user) return;

    setLoading(true);
    const { error } = await supabase.from('tasks').insert({
      title: newTaskTitle.trim(),
      user_id: user.id,
      completed: false,
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Erro ao adicionar tarefa', description: error.message, variant: 'destructive' });
      return;
    }

    setNewTaskTitle('');
    fetchTasks();
    toast({ title: 'Tarefa adicionada' });
  };

  const toggleTask = async (task: Task) => {
    const { error } = await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', task.id)
      .eq('user_id', user!.id);

    if (error) {
      toast({ title: 'Erro ao atualizar tarefa', description: error.message, variant: 'destructive' });
      return;
    }

    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user!.id);

    if (error) {
      toast({ title: 'Erro ao remover tarefa', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Tarefa removida' });
    fetchTasks();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CheckSquare className="h-6 w-6 text-primary" /> Tarefas do Dia
        </h1>
        <p className="text-muted-foreground text-sm">Gerencie suas atividades diárias e lembretes.</p>
      </div>

      <Card className="border-primary/10">
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Adicionar nova tarefa..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !newTaskTitle.trim()}>
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Adicionar</span>
            </Button>
          </form>

          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma tarefa no momento.</p>
              <p className="text-sm">Adicione suas atividades acima.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    task.completed ? 'bg-muted/50 border-transparent' : 'bg-background border-border hover:border-primary/30'
                  }`}
                >
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task)}
                      className="h-5 w-5"
                    />
                    <span className={`text-sm sm:text-base transition-all ${task.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {task.title}
                    </span>
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id)}
                    className="text-muted-foreground hover:text-destructive h-8 w-8 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
