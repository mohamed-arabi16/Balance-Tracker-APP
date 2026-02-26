import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings as SettingsIcon, Moon, DollarSign, Globe, Download, User, Shield, Lock, Layers } from "lucide-react";
import { Currency, useCurrency } from "@/contexts/CurrencyContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useMode } from "@/contexts/ModeContext";
import { useTranslation } from "react-i18next";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { parseNetWorthConfig, stringifyNetWorthConfig, NetWorthConfig } from "@/lib/netWorth";
import { useIncomes } from "@/hooks/useIncomes";
import { useExpenses } from "@/hooks/useExpenses";
import { useDebts } from "@/hooks/useDebts";
import { useAssets } from "@/hooks/useAssets";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";

type UserSettingsPatch = {
  auto_convert?: boolean;
  include_long_term?: boolean;
  auto_price_update?: boolean;
  language?: string;
  net_worth_calculation?: string;
};

export default function Settings() {
  const { currency, setCurrency, autoConvert, setAutoConvert } = useCurrency();
  const { theme, setTheme } = useTheme();
  const { mode, setMode } = useMode();
  const { i18n, t } = useTranslation();
  const { settings, isLoading: isSettingsLoading, isUpdating, updateSettings } = useUserSettings();
  const { user } = useAuth();

  // Profile editing state
  const [profileName, setProfileName] = useState("");
  const [profileNameLoaded, setProfileNameLoaded] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load profile name once
  if (!profileNameLoaded && user) {
    setProfileName(user.name);
    setProfileNameLoaded(true);
  }

  const includeLongTerm = settings?.include_long_term ?? true;
  const autoPriceUpdate = settings?.auto_price_update ?? true;
  const nwConfig = parseNetWorthConfig(settings?.net_worth_calculation);
  const selectedLanguage = settings?.language ?? i18n.language;
  const controlsDisabled = isSettingsLoading || isUpdating;

  const persistSettings = async (updates: UserSettingsPatch, successMessage: string) => {
    try {
      await updateSettings(updates);
      trackEvent("settings_updated", updates);
      toast.success(successMessage);
    } catch (error) {
      toast.error(`Update failed: ${getErrorMessage(error)}`);
    }
  };

  const handleCurrencyChange = (value: string) => {
    setCurrency(value as Currency);
    trackEvent("settings_currency_changed", { currency: value });
  };

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
    trackEvent("settings_theme_changed", { theme: value });
  };

  const handleLanguageChange = (language: string) => {
    void i18n.changeLanguage(language);
    void persistSettings({ language }, t("settings.languageSaved"));
  };

  const handleIncludeLongTermChange = (enabled: boolean) => {
    void persistSettings(
      { include_long_term: enabled },
      t("settings.debtPreferenceSaved"),
    );
  };

  const handleAutoPriceUpdateChange = (enabled: boolean) => {
    void persistSettings(
      { auto_price_update: enabled },
      t("settings.autoPriceSaved"),
    );
  };

  const handleNetWorthToggle = (key: keyof NetWorthConfig, enabled: boolean) => {
    const newConfig = { ...nwConfig, [key]: enabled };
    void persistSettings(
      { net_worth_calculation: stringifyNetWorthConfig(newConfig) },
      t("settings.debtPreferenceSaved")
    );
  };

  const handleAutoConvertChange = (enabled: boolean) => {
    setAutoConvert(enabled);
    trackEvent("settings_auto_convert_changed", { enabled });
  };

  const handleSaveProfile = async () => {
    if (!user || !profileName.trim()) return;
    setIsSavingProfile(true);
    try {
      await supabase.from("profiles").update({ name: profileName.trim() }).eq("id", user.id);
      await supabase.auth.updateUser({ data: { name: profileName.trim() } });
      toast.success(t("settings.profile.saved"));
      trackEvent("profile_updated");
    } catch {
      toast.error(t("settings.profile.error"));
    }
    setIsSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error(t("auth.resetPassword.mismatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("auth.resetPassword.tooShort"));
      return;
    }
    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsChangingPassword(false);
    if (error) {
      toast.error(t("settings.security.changeError"));
    } else {
      toast.success(t("settings.security.changeSuccess"));
      setNewPassword("");
      setConfirmNewPassword("");
      setShowChangePassword(false);
    }
  };

  const { data: incomes } = useIncomes();
  const { data: expenses } = useExpenses();
  const { data: debts } = useDebts();
  const { data: assets } = useAssets();

  const handleExportData = async () => {
    try {
      // 1. Define Headers
      const headers = ['Date', 'Record Type', 'Title/Name', 'Amount', 'Currency', 'Category/Details', 'Status'];
      const rows: string[][] = [headers];

      // 2. Helper to format dates
      const formatDate = (dateString?: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toISOString().split('T')[0];
      };

      // 3. Helper to escape CSV strings
      const escapeCsv = (str: string) => {
        if (!str) return '';
        const escaped = str.toString().replace(/"/g, '""');
        if (escaped.search(/("|,|\n)/g) >= 0) {
          return `"${escaped}"`;
        }
        return escaped;
      };

      // 4. Combine data
      if (incomes) {
        incomes.forEach((i) => {
          rows.push([
            formatDate(i.date),
            'Income',
            escapeCsv(i.title),
            i.amount.toString(),
            i.currency,
            escapeCsv(i.category),
            i.status || 'N/A'
          ]);
        });
      }

      if (expenses) {
        expenses.forEach((e) => {
          rows.push([
            formatDate(e.date),
            'Expense',
            escapeCsv(e.title),
            e.amount.toString(),
            e.currency,
            escapeCsv(`${e.category} (${e.type})`),
            e.status || 'N/A'
          ]);
        });
      }

      if (debts) {
        debts.forEach((d) => {
          rows.push([
            formatDate(d.due_date),
            ('is_receivable' in d && d.is_receivable) ? 'Debt (Expected Income)' : 'Debt (Payment Owed)',
            escapeCsv(d.title),
            d.amount.toString(),
            d.currency,
            escapeCsv(`Creditor: ${d.creditor}`),
            d.status || 'N/A'
          ]);
        });
      }

      if (assets) {
        assets.forEach((a) => {
          rows.push([
            formatDate(a.created_at),
            'Asset',
            escapeCsv(a.type),
            (a.quantity * a.price_per_unit).toString(), // Total value
            a.currency,
            escapeCsv(`Qty: ${a.quantity} ${a.unit} @ ${a.price_per_unit}`),
            a.auto_update ? 'Auto-updating' : 'Manual'
          ]);
        });
      }

      // 5. Build file
      const csvContent = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-data-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(t("settings.exportSuccess"));
      trackEvent("settings_export_csv");
    } catch (error) {
      toast.error(t("settings.exportError"));
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-dashboard min-h-screen">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("settings.profile.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.profile.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">{t("settings.profile.nameLabel")}</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder={t("settings.profile.namePlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("settings.profile.emailLabel")}</Label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
            </div>
            <Button
              onClick={handleSaveProfile}
              disabled={isSavingProfile || !profileName.trim()}
              className="bg-gradient-primary hover:opacity-90"
            >
              {isSavingProfile ? t("settings.profile.saving") : t("common.save")}
            </Button>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t("settings.security.title")}
            </CardTitle>
            <CardDescription>
              {t("settings.security.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showChangePassword ? (
              <Button variant="outline" onClick={() => setShowChangePassword(true)}>
                <Lock className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                {t("settings.security.changeButton")}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{t("auth.resetPassword.newPasswordLabel")}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">{t("auth.resetPassword.confirmLabel")}</Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder={t("auth.resetPassword.confirmPlaceholder")}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    {isChangingPassword ? t("auth.resetPassword.buttonLoading") : t("auth.resetPassword.button")}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowChangePassword(false); setNewPassword(""); setConfirmNewPassword(""); }}>
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("settings.currency")}
            </CardTitle>
            <CardDescription>
              {t("settings.currencyDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-currency">{t("settings.defaultCurrency")}</Label>
              <Select value={currency} onValueChange={handleCurrencyChange} disabled={controlsDisabled}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="TRY">TRY (₺)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="auto-convert"
                checked={autoConvert}
                disabled={controlsDisabled}
                onCheckedChange={handleAutoConvertChange}
              />
              <Label htmlFor="auto-convert">
                {t("settings.autoConvert")}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              {t("settings.appearance")}
            </CardTitle>
            <CardDescription>
              {t("settings.appearanceDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">{t("settings.themeLabel")}</Label>
              <Select value={theme} onValueChange={handleThemeChange} disabled={controlsDisabled}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("settings.theme.light")}</SelectItem>
                  <SelectItem value="dark">{t("settings.theme.dark")}</SelectItem>
                  <SelectItem value="system">{t("settings.theme.system")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {t("settings.financial")}
            </CardTitle>
            <CardDescription>
              {t("settings.financialDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Switch
                id="include-long-term"
                checked={includeLongTerm}
                disabled={controlsDisabled}
                onCheckedChange={handleIncludeLongTermChange}
              />
              <Label htmlFor="include-long-term">
                {t("settings.includeLongTerm")}
              </Label>
            </div>

            <div className="space-y-4 pt-4 border-t border-border mt-4">
              <div>
                <Label>{t("settings.netWorthCalc")}</Label>
                <p className="text-sm text-muted-foreground mb-4">{t("settings.netWorthCalcDescription")}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="nw-balance"
                    checked={nwConfig.balance}
                    disabled={controlsDisabled}
                    onCheckedChange={(val) => handleNetWorthToggle("balance", val)}
                  />
                  <Label htmlFor="nw-balance">{t("dashboard.cards.balance.title")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="nw-expected-income"
                    checked={nwConfig.expectedIncome}
                    disabled={controlsDisabled}
                    onCheckedChange={(val) => handleNetWorthToggle("expectedIncome", val)}
                  />
                  <Label htmlFor="nw-expected-income">{t("dashboard.cards.income.title")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="nw-assets"
                    checked={nwConfig.assets}
                    disabled={controlsDisabled}
                    onCheckedChange={(val) => handleNetWorthToggle("assets", val)}
                  />
                  <Label htmlFor="nw-assets">{t("dashboard.cards.assets.title")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="nw-debts"
                    checked={nwConfig.debts}
                    disabled={controlsDisabled}
                    onCheckedChange={(val) => handleNetWorthToggle("debts", val)}
                  />
                  <Label htmlFor="nw-debts">{t("dashboard.cards.debt.totalTitle")}</Label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Switch
                id="auto-price-update"
                checked={autoPriceUpdate}
                disabled={controlsDisabled}
                onCheckedChange={handleAutoPriceUpdateChange}
              />
              <Label htmlFor="auto-price-update">
                {t("settings.autoPriceUpdate")}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("settings.language")}
            </CardTitle>
            <CardDescription>
              {t("settings.languageDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t("settings.languageLabel")}</Label>
              <Select value={selectedLanguage} onValueChange={handleLanguageChange} disabled={controlsDisabled}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mode Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t('settings.modeTitle')}
            </CardTitle>
            <CardDescription>
              {t('settings.modeDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="app-mode">{t('settings.modeLabel')}</Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as 'simple' | 'advanced')}
                disabled={controlsDisabled}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">{t('settings.mode.simple')}</SelectItem>
                  <SelectItem value="advanced">{t('settings.mode.advanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle>{t("settings.exportTitle")}</CardTitle>
            <CardDescription>
              {t("settings.exportDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              {t("settings.exportButton")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
