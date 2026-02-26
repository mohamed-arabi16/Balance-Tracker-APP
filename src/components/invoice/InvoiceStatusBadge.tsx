import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

type DisplayStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface InvoiceStatusBadgeProps {
  status: DisplayStatus | string;
}

const statusConfig: Record<DisplayStatus, { variant: 'outline' | 'secondary' | 'default' | 'destructive'; className: string }> = {
  draft:     { variant: 'outline',     className: 'text-muted-foreground border-muted-foreground/40' },
  sent:      { variant: 'outline',     className: 'text-blue-600 border-blue-600/40 bg-blue-50 dark:bg-blue-950/30' },
  paid:      { variant: 'default',     className: 'bg-green-600 hover:bg-green-700 text-white border-0' },
  overdue:   { variant: 'destructive', className: '' },
  cancelled: { variant: 'secondary',   className: 'opacity-60' },
};

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status as DisplayStatus] ?? { variant: 'outline' as const, className: '' };

  return (
    <Badge variant={config.variant} className={config.className}>
      {t(`invoices.status.${status}`, { defaultValue: status })}
    </Badge>
  );
}
