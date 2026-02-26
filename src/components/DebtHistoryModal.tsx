import { useCurrency, Currency } from "@/contexts/CurrencyContext";
import { Debt } from "@/hooks/useDebts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface DebtHistoryModalProps {
  debt: Debt | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DebtHistoryModal({ debt, isOpen, onClose }: DebtHistoryModalProps) {
  const { formatCurrency } = useCurrency();

  if (!debt) return null;

  const history = debt.debt_amount_history
    .slice() // Create a shallow copy before sorting
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map((entry, idx, arr) => {
      // The previous amount is the starting amount from the prior chronological log.
      const prev_amount = idx > 0 ? arr[idx - 1].amount : entry.amount;
      // Calculate delta to see if the amount increased or decreased.
      const delta = entry.amount - prev_amount;
      return { ...entry, prev_amount, delta };
    });

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const debtCurrency = debt.currency as Currency;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Debt History: {debt.title}</DialogTitle>
          <DialogDescription>
            A detailed log of all changes to this debt's amount.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Previous Amount</TableHead>
                <TableHead>New Amount</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry, idx) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.logged_at)}</TableCell>
                  <TableCell>{formatCurrency(entry.prev_amount, debtCurrency)}</TableCell>
                  <TableCell>{formatCurrency(entry.amount, debtCurrency)}</TableCell>
                  <TableCell>
                    {entry.note === 'Initial Amount' || idx === 0 ? (
                      <Badge variant="outline">
                        Initial Amount
                      </Badge>
                    ) : (
                      <Badge variant={entry.delta > 0 ? "destructive" : "default"} className={entry.delta > 0 ? 'bg-red-500' : 'bg-green-500'}>
                        {entry.delta > 0 ? 'Increase' : 'Payment'}: {formatCurrency(Math.abs(entry.delta), debtCurrency)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{entry.note}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
