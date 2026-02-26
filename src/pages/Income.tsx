import { useState } from "react";
import { DateFilterSelector } from "@/components/DateFilterSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useFilteredData } from "@/hooks/useFilteredData";
import { useIncomes, useAddIncome, useUpdateIncome, useDeleteIncome, Income } from "@/hooks/useIncomes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useMode } from "@/contexts/ModeContext";
import { ClientCombobox } from "@/components/ClientCombobox";

import { FinancialCard } from "@/components/ui/financial-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, Edit, Trash2, Filter, Calendar as CalendarIcon, Loader2, History } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { IncomeHistoryModal } from "@/components/IncomeHistoryModal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Zod schema for form validation
const incomeSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  currency: z.enum(['USD', 'TRY']).default("USD"),
  category: z.string().min(1, { message: "Please select a category." }),
  status: z.enum(['expected', 'received']),
  date: z.date({ required_error: "A date is required." }),
  note: z.string().optional(),
  client_id: z.string().nullable().optional(),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;

const editIncomeSchema = (originalAmount: number) => incomeSchema.refine(
  (data) => {
    if (data.status === 'expected' && data.amount !== originalAmount) {
      return data.note && data.note.length > 0;
    }
    return true;
  },
  {
    message: "A note is required when changing the amount of an expected income.",
    path: ["note"],
  }
);


// Main Component
export default function IncomePage() {
  const { t } = useTranslation();
  const { data: incomesData, isLoading, isError } = useIncomes();
  const incomes = incomesData || [];
  const [filter, setFilter] = useState("all");
  const { formatCurrency, convertCurrency, currency } = useCurrency();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<Income | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedIncomeForHistory, setSelectedIncomeForHistory] = useState<Income | null>(null);

  const filteredIncomesByMonth = useFilteredData(incomes);

  const filteredIncomes = filteredIncomesByMonth.filter((income) => {
    if (filter === "all") return true;
    return income.status === filter;
  });

  const totalExpected = filteredIncomesByMonth
    .filter((i) => i.status === "expected")
    .reduce((sum, i) => sum + convertCurrency(i.amount, i.currency), 0);

  const totalReceived = filteredIncomesByMonth
    .filter((i) => i.status === "received")
    .reduce((sum, i) => sum + convertCurrency(i.amount, i.currency), 0);

  const incomeByCategory = filteredIncomesByMonth.reduce((acc, income) => {
    const category = income.category;
    const convertedAmount = convertCurrency(income.amount, income.currency);
    acc[category] = (acc[category] || 0) + convertedAmount;
    return acc;
  }, {} as Record<string, number>);
  if (isLoading) {
    return <IncomePageSkeleton />;
  }
  if (isError) {
    return <div className="p-4 text-red-500">Error loading income data.</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('income.title')}</h1>
          <p className="text-muted-foreground">{t('income.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <DateFilterSelector />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-financial w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                {t('income.addIncome')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('income.dialog.addTitle')}</DialogTitle>
                <DialogDescription>{t('income.dialog.addDescription')}</DialogDescription>
              </DialogHeader>
              <AddIncomeForm setDialogOpen={setIsAddDialogOpen} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <FinancialCard variant="income" title={t('income.cards.totalReceivedTitle')} value={formatCurrency(totalReceived, currency)} subtitle={t('income.cards.totalReceivedSubtitle')} icon={<TrendingUp className="h-5 w-5" />} />
        <FinancialCard variant="default" title={t('income.cards.expectedTitle')} value={formatCurrency(totalExpected, currency)} subtitle={t('income.cards.expectedSubtitle')} icon={<TrendingUp className="h-5 w-5" />} />
        <FinancialCard variant="default" title={t('income.cards.totalIncomeTitle')} value={formatCurrency(totalReceived + totalExpected, currency)} subtitle={t('income.cards.totalIncomeSubtitle')} icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      {/* Income by Category */}
      <div className="bg-gradient-card rounded-lg border border-border shadow-card">
        <div className="p-4 sm:p-6 border-b border-border">
          <h2 className="text-xl font-semibold">{t('income.category.title')}</h2>
          <p className="text-muted-foreground">{t('income.category.subtitle')}</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(incomeByCategory).map(([category, amount]) => (
              <div key={category} className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-income" />
                  <span className="text-sm font-medium capitalize">{category}</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(amount, currency)}</div>
                <div className="text-sm text-muted-foreground">
                  {t('income.category.percentOfTotal', { percent: ((amount / (totalReceived + totalExpected)) * 100).toFixed(1) })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters and Income List */}
      <div className="bg-gradient-card rounded-lg border border-border shadow-card">
        <div className="p-4 sm:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">{t('income.history.title')}</h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full sm:w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('income.filter.all')}</SelectItem>
                  <SelectItem value="received">{t('income.filter.received')}</SelectItem>
                  <SelectItem value="expected">{t('income.filter.expected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <IncomeList
          incomes={filteredIncomes}
          onEdit={(income) => {
            setEditingIncome(income);
            setIsEditDialogOpen(true);
          }}
          onDelete={(income) => setDeletingIncome(income)}
          onViewHistory={(income) => {
            setSelectedIncomeForHistory(income);
            setIsHistoryModalOpen(true);
          }}
        />
      </div>

      {editingIncome && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('income.dialog.editTitle')}</DialogTitle>
              <DialogDescription>{t('income.dialog.editDescription')}</DialogDescription>
            </DialogHeader>
            <EditIncomeForm setDialogOpen={setIsEditDialogOpen} income={editingIncome} />
          </DialogContent>
        </Dialog>
      )}

      {deletingIncome && <DeleteIncomeDialog income={deletingIncome} setDeletingIncome={setDeletingIncome} />}

      <IncomeHistoryModal
        income={selectedIncomeForHistory}
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />
    </div>
  );
}

// Sub-components
function IncomeList({ incomes, onEdit, onDelete, onViewHistory }: { incomes: Income[], onEdit: (income: Income) => void, onDelete: (income: Income) => void, onViewHistory: (income: Income) => void }) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const getStatusColor = (status: string) => (status === "received" ? "bg-income" : "bg-orange-500");
  const getCategoryIcon = (_category: string) => <TrendingUp className="h-4 w-4" />;

  return (
    <div className="divide-y divide-border">
      {incomes.map((income) => (
        <div key={income.id} className="p-4 sm:p-6 hover:bg-muted/50 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 bg-income/10 rounded-lg flex-shrink-0">
                {getCategoryIcon(income.category)}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm sm:text-base">{income.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {new Date(income.date).toLocaleDateString()} • {t(`income.form.category.${income.category.toLowerCase()}`)}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="text-left sm:text-right">
                <div className="font-semibold text-sm sm:text-base">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{formatCurrency(income.amount, income.currency)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{new Intl.NumberFormat(undefined, { style: 'currency', currency: income.currency }).format(income.amount)}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Badge className={`${getStatusColor(income.status)} text-white text-xs`}>{t(`income.filter.${income.status}`)}</Badge>
              </div>
              <div className="flex gap-1 sm:gap-2">
                {income.status === 'expected' && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onViewHistory(income)}>
                    <History className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(income)}><Edit className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onDelete(income)}><Trash2 className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export function AddIncomeForm({ setDialogOpen }: { setDialogOpen: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdvanced } = useMode();
  const addIncomeMutation = useAddIncome();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: { title: "", amount: undefined, currency: "USD", category: "", status: "expected", client_id: null },
  });

  const onSubmit = (values: IncomeFormValues) => {
    if (!user) return;
    addIncomeMutation.mutate(
      {
        title: values.title!,
        amount: values.amount!,
        currency: values.currency ?? 'USD',
        category: values.category!,
        status: values.status!,
        user_id: user.id,
        date: format(values.date, "yyyy-MM-dd"),
        client_id: values.client_id ?? null,
      },
      {
        onSuccess: () => {
          toast.success(t('income.toast.addSuccess'));
          setDialogOpen(false);
        },
        onError: (error) => {
          toast.error(t('income.toast.addError', { error: error.message }));
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.title')}</FormLabel><FormControl><Input placeholder={t('income.form.placeholder.title')} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem><FormLabel>{t('income.form.amount')}</FormLabel><FormControl><Input type="number" placeholder={t('income.form.placeholder.amount')} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem><FormLabel>{t('income.form.currency')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="TRY">TRY (₺)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.category')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent><SelectItem value="freelance">{t('income.form.category.freelance')}</SelectItem><SelectItem value="commission">{t('income.form.category.commission')}</SelectItem><SelectItem value="rent">{t('income.form.category.rent')}</SelectItem><SelectItem value="other">{t('income.form.category.other')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.status')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="expected">{t('income.filter.expected')}</SelectItem><SelectItem value="received">{t('income.filter.received')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.date')}</FormLabel><Popover modal={true} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 pointer-events-none" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsCalendarOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
        )} />
        {isAdvanced && (
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('income.form.client')}</FormLabel>
                <FormControl>
                  <ClientCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    placeholder={t('income.form.placeholder.client')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button type="submit" className="bg-gradient-primary" disabled={addIncomeMutation.isPending}>
            {addIncomeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('income.addIncome')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditIncomeForm({ setDialogOpen, income }: { setDialogOpen: (open: boolean) => void, income: Income }) {
  const { t } = useTranslation();
  const { isAdvanced } = useMode();
  const updateIncomeMutation = useUpdateIncome();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(editIncomeSchema(income.amount)),
    defaultValues: {
      ...income,
      date: new Date(income.date),
      note: '',
      client_id: income.client_id ?? null,
    },
  });

  const onSubmit = (values: IncomeFormValues) => {
    updateIncomeMutation.mutate(
      {
        id: income.id,
        title: values.title!,
        amount: values.amount!,
        currency: values.currency ?? 'USD',
        category: values.category!,
        status: values.status!,
        note: values.note,
        date: format(values.date, "yyyy-MM-dd"),
        client_id: values.client_id ?? null,
      },
      {
        onSuccess: () => {
          toast.success(t('income.toast.updateSuccess'));
          setDialogOpen(false);
        },
        onError: (error) => {
          toast.error(t('income.toast.updateError', { error: error.message }));
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Form fields are identical to AddIncomeForm, just pre-filled */}
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.title')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem><FormLabel>{t('income.form.amount')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem><FormLabel>{t('income.form.currency')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="TRY">TRY (₺)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.category')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl><SelectContent><SelectItem value="freelance">{t('income.form.category.freelance')}</SelectItem><SelectItem value="commission">{t('income.form.category.commission')}</SelectItem><SelectItem value="rent">{t('income.form.category.rent')}</SelectItem><SelectItem value="other">{t('income.form.category.other')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.status')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent><SelectItem value="expected">{t('income.filter.expected')}</SelectItem><SelectItem value="received">{t('income.filter.received')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.date')}</FormLabel><Popover modal={true} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 pointer-events-none" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsCalendarOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="note" render={({ field }) => (
          <FormItem><FormLabel>{t('income.form.note')}</FormLabel><FormControl><Input placeholder={t('income.form.placeholder.note')} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        {isAdvanced && (
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('income.form.client')}</FormLabel>
                <FormControl>
                  <ClientCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    placeholder={t('income.form.placeholder.client')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button type="submit" className="bg-gradient-primary" disabled={updateIncomeMutation.isPending}>
            {updateIncomeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DeleteIncomeDialog({ income, setDeletingIncome }: { income: Income, setDeletingIncome: (income: Income | null) => void }) {
  const { t } = useTranslation();
  const deleteIncomeMutation = useDeleteIncome();
  const handleDelete = () => {
    deleteIncomeMutation.mutate(income, {
      onSuccess: () => {
        toast.success(t('income.toast.deleteSuccess'));
        setDeletingIncome(null);
      },
      onError: (error) => {
        toast.error(t('income.toast.deleteError', { error: error.message }));
      },
    });
  };

  return (
    <AlertDialog open={!!income} onOpenChange={() => setDeletingIncome(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('income.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('income.delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleteIncomeMutation.isPending}>
            {deleteIncomeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('income.delete.button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function IncomePageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-48" />
      <Skeleton className="h-96" />
    </div>
  );
}