import { useCurrency } from "@/contexts/CurrencyContext";
import { Income } from "@/hooks/useIncomes";
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

interface IncomeHistoryModalProps {
  income: Income | null;
  isOpen: boolean;
  onClose: () => void;
}

export function IncomeHistoryModal({ income, isOpen, onClose }: IncomeHistoryModalProps) {
  const { formatCurrency } = useCurrency();

  if (!income) return null;

  const history = income.income_amount_history
    .slice() // Create a shallow copy before sorting
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map((entry, idx, arr) => {
      // The previous amount is the starting amount from the prior chronological log.
      const prev = idx > 0 ? arr[idx - 1].amount : entry.amount;
      // Calculate delta to see if the amount increased or decreased.
      const delta = entry.amount - prev;
      return { ...entry, prev_amount: prev, delta };
    });

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const initialAmount = history.length > 0 ? history[0].amount : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Income History: {income.title}</DialogTitle>
          <DialogDescription>
            A detailed log of all changes to this income's amount.
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
              {history.map((entry, index) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.logged_at)}</TableCell>
                  <TableCell>{formatCurrency(entry.prev_amount, income.currency)}</TableCell>
                  <TableCell>{formatCurrency(entry.amount, income.currency)}</TableCell>
                  <TableCell>
                    {entry.note === 'Initial Amount' || index === 0 ? (
                      <Badge variant="outline">
                        Initial Amount
                      </Badge>
                    ) : (
                      <Badge variant={entry.delta > 0 ? "default" : "destructive"} className={entry.delta > 0 ? 'bg-green-500' : 'bg-red-500'}>
                        {entry.delta > 0 ? 'Increase' : 'Decrease'}: {formatCurrency(Math.abs(entry.delta), income.currency)}
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
