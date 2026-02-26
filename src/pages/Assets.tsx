import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Currency, useCurrency } from "@/contexts/CurrencyContext";
import { useAssetPrices } from "@/hooks/useAssetPrices";
import { useAssets, useAddAsset, useUpdateAsset, useDeleteAsset, Asset } from "@/hooks/useAssets";
import { useUserSettings } from "@/hooks/useUserSettings";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { sumInDisplayCurrency } from "@/lib/finance";
import { useTranslation } from "react-i18next";

import { FinancialCard } from "@/components/ui/financial-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Gem,
  Bitcoin,
  Home,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { getLocaleFromLanguage } from "@/lib/locale";

const assetSchema = z.object({
  type: z.string().min(1, { message: "Please select an asset type." }),
  quantity: z.coerce.number().positive({ message: "Quantity must be positive." }),
  unit: z.string().min(1, { message: "Please select a unit." }),
  price_per_unit: z.coerce.number().positive({ message: "Price must be positive." }),
  currency: z.enum(['USD', 'TRY']).default("USD"),
  auto_update: z.boolean().default(false),
});

type AssetFormValues = z.infer<typeof assetSchema>;

export default function AssetsPage() {
  const { data: assetsData, isLoading, isError } = useAssets();
  const assets = assetsData || [];
  const { settings } = useUserSettings();
  const enableAutoPriceUpdate = settings?.auto_price_update ?? true;
  const {
    prices: assetPrices,
    loading: pricesLoading,
    snapshot: priceSnapshot,
    error: pricesError,
    isStale: pricesStale,
    lastUpdatedAt,
    refresh: refreshPrices,
  } = useAssetPrices(enableAutoPriceUpdate);
  const { formatCurrency, convertCurrency, currency } = useCurrency();
  const { t, i18n } = useTranslation();
  const locale = getLocaleFromLanguage(i18n.language);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const formattedPriceLastUpdated = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString(locale)
    : t("assets.priceStatus.never");
  const priceDataSourceLabel = priceSnapshot
    ? t(`assets.priceStatus.source.${priceSnapshot.source}`)
    : t("assets.priceStatus.source.unavailable");
  const priceDataStalenessLabel = !enableAutoPriceUpdate
    ? t("assets.priceStatus.disabled")
    : pricesStale
      ? t("assets.priceStatus.stale")
      : t("assets.priceStatus.fresh");
  const priceDataConfidenceLabel = priceSnapshot
    ? t(`assets.priceStatus.confidence.${priceSnapshot.confidence}`)
    : t("assets.priceStatus.confidence.low");

  const totalAssetValue = sumInDisplayCurrency(
    assets,
    (asset) => asset.quantity * asset.price_per_unit,
    (asset) => asset.currency as Currency,
    convertCurrency,
  );
  const silverValue = sumInDisplayCurrency(
    assets.filter((asset) => asset.type === "silver"),
    (asset) => asset.quantity * asset.price_per_unit,
    (asset) => asset.currency as Currency,
    convertCurrency,
  );
  const cryptoValue = sumInDisplayCurrency(
    assets.filter((asset) => asset.type === "bitcoin" || asset.type === "ethereum" || asset.type === "cardano"),
    (asset) => asset.quantity * asset.price_per_unit,
    (asset) => asset.currency as Currency,
    convertCurrency,
  );
  const realEstateValue = sumInDisplayCurrency(
    assets.filter((asset) => asset.type === "real_estate"),
    (asset) => asset.quantity * asset.price_per_unit,
    (asset) => asset.currency as Currency,
    convertCurrency,
  );

  if (isLoading) return <AssetsPageSkeleton />;
  if (isError) return <div className="p-4 text-red-500">{t("assets.error")}</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("assets.title")}</h1>
          <p className="text-muted-foreground">{t("assets.subtitle")}</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}><DialogTrigger asChild><Button className="bg-gradient-primary shadow-financial w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />{t("assets.addAsset")}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{t("assets.dialog.addTitle")}</DialogTitle><DialogDescription>{t("assets.dialog.addDescription")}</DialogDescription></DialogHeader><AddAssetForm setDialogOpen={setIsAddDialogOpen} enableAutoPriceUpdate={enableAutoPriceUpdate} /></DialogContent></Dialog>
      </div>

      <Card className="border border-border bg-gradient-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("assets.priceStatus.title")}</CardTitle>
          <CardDescription>{t("assets.priceStatus.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t("assets.priceStatus.sourceLabel")}: {priceDataSourceLabel}</Badge>
            <Badge variant="outline">{t("assets.priceStatus.updatedLabel")}: {formattedPriceLastUpdated}</Badge>
            <Badge variant={pricesStale ? "destructive" : "secondary"}>{t("assets.priceStatus.stalenessLabel")}: {priceDataStalenessLabel}</Badge>
            <Badge variant="outline">{t("assets.priceStatus.confidenceLabel")}: {priceDataConfidenceLabel}</Badge>
          </div>

          {(pricesError || priceSnapshot?.warning) && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{pricesError ?? priceSnapshot?.warning}</p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshPrices()}
            disabled={!enableAutoPriceUpdate || pricesLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("assets.priceStatus.refreshButton")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinancialCard variant="asset" title={t("assets.cards.total.title")} value={formatCurrency(totalAssetValue, currency)} subtitle={t("assets.cards.total.subtitle")} icon={<Gem className="h-5 w-5" />} />
        <FinancialCard variant="default" title={t("assets.cards.silver.title")} value={formatCurrency(silverValue, currency)} subtitle={t("assets.cards.silver.subtitle")} icon={<Gem className="h-5 w-5" />} />
        <FinancialCard variant="default" title={t("assets.cards.crypto.title")} value={formatCurrency(cryptoValue, currency)} subtitle={t("assets.cards.crypto.subtitle")} icon={<Bitcoin className="h-5 w-5" />} />
        <FinancialCard variant="default" title={t("assets.cards.realEstate.title")} value={formatCurrency(realEstateValue, currency)} subtitle={t("assets.cards.realEstate.subtitle")} icon={<Home className="h-5 w-5" />} />
      </div>

      <div className="bg-gradient-card rounded-lg border border-border shadow-card">
        <div className="p-4 sm:p-6 border-b border-border"><h2 className="text-xl font-semibold">{t("assets.portfolio.title")}</h2><p className="text-muted-foreground">{t("assets.portfolio.subtitle")}</p></div>
        <div className="p-4 sm:p-6"><div className="grid gap-4">
          {assets.map((asset) => (<AssetCard key={asset.id} asset={asset} onDelete={() => setDeletingAsset(asset)} />))}
        </div></div>
      </div>

      {deletingAsset && <DeleteAssetDialog asset={deletingAsset} setDeletingAsset={setDeletingAsset} />}
    </div>
  );
}

function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: () => void; }) {
    const navigate = useNavigate();
    const { formatCurrency } = useCurrency();
    const formatAssetType = (type: string) => type.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
    const getAssetIcon = (type: string) => {
        switch (type) {
            case "silver": case "gold": return <Gem className="h-5 w-5" />;
            case "bitcoin": case "ethereum": case "cardano": return <Bitcoin className="h-5 w-5" />;
            case "real_estate": return <Home className="h-5 w-5" />;
            default: return <Gem className="h-5 w-5" />;
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-asset/10 rounded-lg">{getAssetIcon(asset.type)}</div>
                        <div>
                            <CardTitle className="text-lg">{formatAssetType(asset.type)}</CardTitle>
                            <CardDescription>{asset.quantity} {asset.unit} @ {formatCurrency(asset.price_per_unit, asset.currency as 'USD' | 'TRY')}/{asset.unit}</CardDescription>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{formatCurrency(asset.quantity * asset.price_per_unit, asset.currency as 'USD' | 'TRY')}</div>
                        {asset.auto_update && <div className="flex items-center justify-end gap-1 text-xs text-green-600"><TrendingUp className="h-3 w-3" />Auto-updated</div>}
                    </div>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/assets/${asset.id}/edit`)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}

function AddAssetForm({
  setDialogOpen,
  enableAutoPriceUpdate,
}: {
  setDialogOpen: (open: boolean) => void;
  enableAutoPriceUpdate: boolean;
}) {
  const { user } = useAuth();
  const addAssetMutation = useAddAsset();
  const { prices: assetPrices, loading: pricesLoading } = useAssetPrices(enableAutoPriceUpdate);
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: { type: "", quantity: undefined, unit: "", price_per_unit: undefined, currency: "USD", auto_update: false },
  });

  const assetType = form.watch("type");
  const assetUnit = form.watch("unit");
  const isPriceAuto = enableAutoPriceUpdate && !pricesLoading && assetType && (assetType in assetPrices);

  useEffect(() => {
    if (!enableAutoPriceUpdate || pricesLoading || !assetType || !assetPrices) return;

    let price: number | undefined;
    let autoUpdate = false;

    const lowerCaseType = assetType.toLowerCase();

    if (lowerCaseType in assetPrices) {
        const rawPrice = assetPrices[lowerCaseType as keyof typeof assetPrices];
        price = typeof rawPrice === 'number' ? rawPrice : undefined;
        autoUpdate = true;
    }

    const currentUnit = form.getValues('unit');
    let finalUnit = currentUnit;

    if (lowerCaseType === 'gold' || lowerCaseType === 'silver') {
       if (currentUnit !== 'ounces' && currentUnit !== 'grams') finalUnit = 'ounces';
    } else if (lowerCaseType === 'bitcoin') {
       finalUnit = 'BTC';
    } else if (lowerCaseType === 'ethereum') {
       finalUnit = 'ETH';
    } else if (lowerCaseType === 'cardano') {
       finalUnit = 'ADA';
    } else if (lowerCaseType === 'real_estate') {
       if (currentUnit !== 'property') finalUnit = 'property';
    } else if (lowerCaseType === 'other') {
       if (!currentUnit || currentUnit === 'BTC' || currentUnit === 'ETH' || currentUnit === 'ADA') finalUnit = 'other';
    }

    if (finalUnit !== currentUnit) {
      form.setValue('unit', finalUnit, { shouldValidate: true });
    }

    if (price !== undefined) {
      if ((lowerCaseType === 'gold' || lowerCaseType === 'silver') && finalUnit === 'grams') {
         price = price / 31.1034768; // Convert Troy Ounces to Grams
      }
      form.setValue('price_per_unit', price, { shouldValidate: true });
      form.setValue('auto_update', autoUpdate);
    }
  }, [assetType, assetUnit, assetPrices, enableAutoPriceUpdate, pricesLoading, form]);


  const onSubmit = (values: AssetFormValues) => {
    if (!user) return;
    addAssetMutation.mutate({
      type: values.type,
      quantity: values.quantity,
      unit: values.unit,
      price_per_unit: values.price_per_unit,
      currency: values.currency,
      auto_update: values.auto_update,
      user_id: user.id
    }, {
        onSuccess: () => { toast.success("Asset added!"); setDialogOpen(false); },
        onError: (err) => toast.error(`Error: ${err.message}`),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Asset Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select asset type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="bitcoin">Bitcoin</SelectItem><SelectItem value="ethereum">Ethereum</SelectItem><SelectItem value="cardano">Cardano</SelectItem><SelectItem value="real_estate">Real Estate</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" step="0.001" placeholder="0.00" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="unit" render={({ field }) => (<FormItem><FormLabel>Unit</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl><SelectContent>
            {(assetType === "gold" || assetType === "silver" || !assetType) && <SelectItem value="ounces">Ounces</SelectItem>}
            {(assetType === "gold" || assetType === "silver" || !assetType) && <SelectItem value="grams">Grams</SelectItem>}
            {(assetType === "bitcoin" || !assetType) && <SelectItem value="BTC">BTC</SelectItem>}
            {(assetType === "ethereum" || !assetType) && <SelectItem value="ETH">ETH</SelectItem>}
            {(assetType === "cardano" || !assetType) && <SelectItem value="ADA">ADA</SelectItem>}
            {(assetType === "real_estate" || assetType === "other" || !assetType) && <SelectItem value="property">Property</SelectItem>}
            {(assetType === "other" || !assetType) && <SelectItem value="shares">Shares</SelectItem>}
            {(assetType === "other" || !assetType) && <SelectItem value="other">Other</SelectItem>}
          </SelectContent></Select><FormMessage /></FormItem>)} />
        </div>
        {!isPriceAuto && (
            <FormField
              control={form.control}
              name="price_per_unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Unit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={"0.00"}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={addAssetMutation.isPending}>{addAssetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Asset</Button></div>
      </form>
    </Form>
  );
}

function DeleteAssetDialog({ asset, setDeletingAsset }: { asset: Asset, setDeletingAsset: (asset: Asset | null) => void }) {
    const deleteAssetMutation = useDeleteAsset();
    return (
        <AlertDialog open={!!asset} onOpenChange={() => setDeletingAsset(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this asset.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteAssetMutation.mutate(asset, { onSuccess: () => { toast.success("Asset deleted!"); setDeletingAsset(null); }, onError: (err) => toast.error(`Error: ${err.message}`) })} disabled={deleteAssetMutation.isPending}>
                        {deleteAssetMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function AssetsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-gradient-dashboard min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="space-y-2"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-80" /></div><Skeleton className="h-10 w-32" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        <Skeleton className="h-96" />
    </div>
  );
}
