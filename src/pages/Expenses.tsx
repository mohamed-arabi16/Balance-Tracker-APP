import { useState } from "react";
import { DateFilterSelector } from "@/components/DateFilterSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useMode } from "@/contexts/ModeContext";
import { ClientCombobox } from "@/components/ClientCombobox";
import { useFilteredData } from "@/hooks/useFilteredData";
import { useExpenses, useAddExpense, useUpdateExpense, useDeleteExpense, Expense } from "@/hooks/useExpenses";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { FinancialCard } from "@/components/ui/financial-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Home, Car, Calendar as CalendarIcon, Edit, Trash2, Plus, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const expenseSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  currency: z.enum(['USD', 'TRY']).default("USD"),
  category: z.string().min(1, { message: "Please select a category." }),
  type: z.enum(['fixed', 'variable']),
  status: z.enum(['paid', 'pending']),
  date: z.date({ required_error: "A date is required." }),
  client_id: z.string().nullable().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { data: expensesData, isLoading, isError } = useExpenses();
  const expenses = expensesData || [];
  const [activeTab, setActiveTab] = useState("fixed");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const { formatCurrency, convertCurrency, currency } = useCurrency();

  const filteredExpensesByMonth = useFilteredData(expenses);

  const fixedExpenses = filteredExpensesByMonth.filter((expense) => expense.type === "fixed");
  const variableExpenses = filteredExpensesByMonth.filter((expense) => expense.type === "variable");

  const totalFixed = fixedExpenses.reduce((sum, expense) => sum + convertCurrency(expense.amount, expense.currency), 0);
  const totalVariable = variableExpenses.reduce((sum, expense) => sum + convertCurrency(expense.amount, expense.currency), 0);
  const totalPaid = filteredExpensesByMonth.filter((e) => e.status === "paid").reduce((sum, e) => sum + convertCurrency(e.amount, e.currency), 0);
  const totalPending = filteredExpensesByMonth.filter((e) => e.status === "pending").reduce((sum, e) => sum + convertCurrency(e.amount, e.currency), 0);

  const filteredExpenses = activeTab === "fixed" ? fixedExpenses : variableExpenses;

  if (isLoading) {
    return <ExpensePageSkeleton />;
  }

  if (isError) {
    return <div className="p-6 text-red-500">Error loading expenses.</div>;
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t('expenses.title')}</h1>
          <p className="text-muted-foreground">{t('expenses.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <DateFilterSelector />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
                <Plus className="h-4 w-4 mr-2" />
                {t('expenses.addExpense')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('expenses.dialog.addTitle')}</DialogTitle>
                <DialogDescription>{t('expenses.dialog.addDescription')}</DialogDescription>
              </DialogHeader>
              <AddExpenseForm setDialogOpen={setIsAddDialogOpen} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinancialCard variant="expense" title={t('expenses.cards.fixedTitle')} value={formatCurrency(totalFixed, currency)} subtitle={t('expenses.cards.fixedSubtitle')} icon={<Home className="h-5 w-5" />} />
        <FinancialCard variant="debt" title={t('expenses.cards.variableTitle')} value={formatCurrency(totalVariable, currency)} subtitle={t('expenses.cards.variableSubtitle')} icon={<ShoppingCart className="h-5 w-5" />} />
        <FinancialCard variant="income" title={t('expenses.cards.totalPaidTitle')} value={formatCurrency(totalPaid, currency)} subtitle={t('expenses.cards.totalPaidSubtitle')} icon={<CalendarIcon className="h-5 w-5" />} />
        <FinancialCard variant="asset" title={t('expenses.cards.totalPendingTitle')} value={formatCurrency(totalPending, currency)} subtitle={t('expenses.cards.totalPendingSubtitle')} icon={<Car className="h-5 w-5" />} />
      </div>

      <div className="bg-gradient-card rounded-xl border border-border shadow-card">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold">{t('expenses.overview.title')}</h2>
          <p className="text-muted-foreground">{t('expenses.overview.subtitle')}</p>
        </div>
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-fit grid-cols-2 bg-[#E9F4F4] dark:bg-muted">
              <TabsTrigger value="fixed" className="data-[state=active]:bg-white data-[state=active]:text-[#0C1439] data-[state=active]:font-semibold data-[state=active]:shadow">{t('expenses.tabs.fixed')}</TabsTrigger>
              <TabsTrigger value="variable" className="data-[state=active]:bg-white data-[state=active]:text-[#0C1439] data-[state=active]:font-semibold data-[state=active]:shadow">{t('expenses.tabs.variable')}</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-6">
              <ExpenseTable
                expenses={filteredExpenses}
                onEdit={(expense) => {
                  setEditingExpense(expense);
                  setIsEditDialogOpen(true);
                }}
                onDelete={(expense) => setDeletingExpense(expense)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {editingExpense && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('expenses.dialog.editTitle')}</DialogTitle>
              <DialogDescription>{t('expenses.dialog.editDescription')}</DialogDescription>
            </DialogHeader>
            <EditExpenseForm setDialogOpen={setIsEditDialogOpen} expense={editingExpense} />
          </DialogContent>
        </Dialog>
      )}

      {deletingExpense && <DeleteExpenseDialog expense={deletingExpense} setDeletingExpense={setDeletingExpense} />}
    </div>
  );
}

function ExpenseTable({ expenses, onEdit, onDelete }: { expenses: Expense[], onEdit: (expense: Expense) => void, onDelete: (expense: Expense) => void }) {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const getStatusBadgeColor = (status: string) => status === "paid" ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600";

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('expenses.table.title')}</TableHead>
          <TableHead>{t('expenses.table.category')}</TableHead>
          <TableHead>{t('expenses.table.date')}</TableHead>
          <TableHead>{t('expenses.table.status')}</TableHead>
          <TableHead className="text-right">{t('expenses.table.amount')}</TableHead>
          <TableHead>{t('expenses.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => (
          <TableRow key={expense.id} className="hover:bg-muted/50">
            <TableCell className="font-medium">{expense.title}</TableCell>
            <TableCell>{t(`expenses.form.category.${expense.category.toLowerCase()}`)}</TableCell>
            <TableCell>{formatDate(expense.date)}</TableCell>
            <TableCell><Badge className={`${getStatusBadgeColor(expense.status)} rounded-full px-3 py-1`}>{t(`expenses.form.status.${expense.status.toLowerCase()}`)}</Badge></TableCell>
            <TableCell className="text-right">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>{formatCurrency(expense.amount, expense.currency)}</span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Original: {new Intl.NumberFormat(undefined, { style: 'currency', currency: expense.currency }).format(expense.amount)}</p>
                </TooltipContent>
              </Tooltip>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(expense)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(expense)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AddExpenseForm({ setDialogOpen }: { setDialogOpen: (open: boolean) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isAdvanced } = useMode();
  const addExpenseMutation = useAddExpense();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { title: "", amount: undefined, currency: "USD", category: "", type: "fixed", status: "pending", client_id: null },
  });

  const onSubmit = (values: ExpenseFormValues) => {
    if (!user) return;
    addExpenseMutation.mutate(
      {
        title: values.title!,
        amount: values.amount!,
        currency: values.currency ?? 'USD',
        category: values.category!,
        type: values.type!,
        status: values.status!,
        user_id: user.id,
        date: format(values.date, "yyyy-MM-dd"),
        client_id: values.client_id ?? null,
      },
      {
        onSuccess: () => {
          toast.success(t('expenses.toast.addSuccess'));
          setDialogOpen(false);
        },
        onError: (error) => toast.error(t('expenses.toast.addError', { error: error.message })),
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>{t('expenses.form.title')}</FormLabel><FormControl><Input placeholder={t('expenses.form.placeholder.title')} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.amount')}</FormLabel><FormControl><Input type="number" placeholder={t('expenses.form.placeholder.amount')} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.currency')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="TRY">TRY (₺)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.category')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="housing">{t('expenses.form.category.housing')}</SelectItem><SelectItem value="utilities">{t('expenses.form.category.utilities')}</SelectItem><SelectItem value="transportation">{t('expenses.form.category.transportation')}</SelectItem><SelectItem value="groceries">{t('expenses.form.category.groceries')}</SelectItem><SelectItem value="healthcare">{t('expenses.form.category.healthcare')}</SelectItem><SelectItem value="other">{t('expenses.form.category.other')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">{t('expenses.form.type.fixed')}</SelectItem><SelectItem value="variable">{t('expenses.form.type.variable')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>{t('expenses.form.date')}</FormLabel><Popover modal={true} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 pointer-events-none" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsCalendarOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>{t('expenses.form.status')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="pending">{t('expenses.form.status.pending')}</SelectItem><SelectItem value="paid">{t('expenses.form.status.paid')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
        {isAdvanced && (
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('expenses.form.client')}</FormLabel>
                <FormControl>
                  <ClientCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    placeholder={t('expenses.form.placeholder.client')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button type="submit" className="bg-gradient-primary" disabled={addExpenseMutation.isPending}>
            {addExpenseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('expenses.addExpense')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function EditExpenseForm({ setDialogOpen, expense }: { setDialogOpen: (open: boolean) => void, expense: Expense }) {
  const { t } = useTranslation();
  const { isAdvanced } = useMode();
  const updateExpenseMutation = useUpdateExpense();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { ...expense, date: new Date(expense.date), client_id: expense.client_id ?? null },
  });

  const onSubmit = (values: ExpenseFormValues) => {
    updateExpenseMutation.mutate(
      {
        id: expense.id,
        title: values.title!,
        amount: values.amount!,
        currency: values.currency ?? 'USD',
        category: values.category!,
        type: values.type!,
        status: values.status!,
        date: format(values.date, "yyyy-MM-dd"),
        client_id: values.client_id ?? null,
      },
      {
        onSuccess: () => {
          toast.success(t('expenses.toast.updateSuccess'));
          setDialogOpen(false);
        },
        onError: (error) => toast.error(t('expenses.toast.updateError', { error: error.message })),
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Fields similar to AddExpenseForm */}
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>{t('expenses.form.title')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.amount')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="currency" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.currency')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="USD">USD ($)</SelectItem><SelectItem value="TRY">TRY (₺)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.category')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="housing">{t('expenses.form.category.housing')}</SelectItem><SelectItem value="utilities">{t('expenses.form.category.utilities')}</SelectItem><SelectItem value="transportation">{t('expenses.form.category.transportation')}</SelectItem><SelectItem value="groceries">{t('expenses.form.category.groceries')}</SelectItem><SelectItem value="healthcare">{t('expenses.form.category.healthcare')}</SelectItem><SelectItem value="other">{t('expenses.form.category.other')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem><FormLabel>{t('expenses.form.type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">{t('expenses.form.type.fixed')}</SelectItem><SelectItem value="variable">{t('expenses.form.type.variable')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem><FormLabel>{t('expenses.form.date')}</FormLabel><Popover modal={true} open={isCalendarOpen} onOpenChange={setIsCalendarOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4 pointer-events-none" />{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={(d) => { field.onChange(d); setIsCalendarOpen(false); }} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>{t('expenses.form.status')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="pending">{t('expenses.form.status.pending')}</SelectItem><SelectItem value="paid">{t('expenses.form.status.paid')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>
        )} />
        {isAdvanced && (
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('expenses.form.client')}</FormLabel>
                <FormControl>
                  <ClientCombobox
                    value={field.value ?? null}
                    onChange={field.onChange}
                    placeholder={t('expenses.form.placeholder.client')}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button type="submit" className="bg-gradient-primary" disabled={updateExpenseMutation.isPending}>
            {updateExpenseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function DeleteExpenseDialog({ expense, setDeletingExpense }: { expense: Expense, setDeletingExpense: (expense: Expense | null) => void }) {
  const { t } = useTranslation();
  const deleteExpenseMutation = useDeleteExpense();
  const handleDelete = () => {
    deleteExpenseMutation.mutate(expense, {
      onSuccess: () => {
        toast.success(t('expenses.toast.deleteSuccess'));
        setDeletingExpense(null);
      },
      onError: (error) => toast.error(t('expenses.toast.deleteError', { error: error.message })),
    });
  };

  return (
    <AlertDialog open={!!expense} onOpenChange={() => setDeletingExpense(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('expenses.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('expenses.delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleteExpenseMutation.isPending}>
            {deleteExpenseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('expenses.delete.button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ExpensePageSkeleton() {
  return (
    <div className="p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}