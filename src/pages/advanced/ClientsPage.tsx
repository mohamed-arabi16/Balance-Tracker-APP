import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Search, MoreVertical, Pencil, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClients, useDeleteClient, type Client } from '@/hooks/useClients';

export default function ClientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const handleDeleteConfirm = () => {
    if (!deletingClient) return;
    deleteClient.mutate(deletingClient.id, {
      onSuccess: () => {
        toast.success(t('clients.toast.deleteSuccess'));
        setDeletingClient(null);
      },
      onError: (err) => {
        const message = err.message.toLowerCase();
        if (message.includes('foreign key') || message.includes('violates')) {
          toast.error(t('clients.toast.deleteRestricted'));
        } else {
          toast.error(t('clients.toast.deleteError', { error: err.message }));
        }
        setDeletingClient(null);
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
          <p className="text-muted-foreground">{t('clients.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/clients/new')}>
          <Plus className="h-4 w-4 mr-2" />
          {t('clients.addClient')}
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          aria-label={t('clients.searchPlaceholder')}
          placeholder={t('clients.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredClients.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <Users className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">{t('clients.empty.title')}</h2>
          <p className="text-muted-foreground max-w-sm">{t('clients.empty.description')}</p>
          <Button onClick={() => navigate('/clients/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('clients.addClient')}
          </Button>
        </div>
      )}

      {/* Client card grid */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="relative cursor-pointer hover:border-foreground/20 transition-colors"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/clients/${client.id}/edit`);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingClient(client);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {client.company && (
                  <p>
                    {t('clients.card.company')}: {client.company}
                  </p>
                )}
                {client.email && (
                  <p>
                    {t('clients.card.email')}: {client.email}
                  </p>
                )}
                {client.phone && (
                  <p>
                    {t('clients.card.phone')}: {client.phone}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingClient}
        onOpenChange={(open) => !open && setDeletingClient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('clients.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('clients.delete.description', { name: deletingClient?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
