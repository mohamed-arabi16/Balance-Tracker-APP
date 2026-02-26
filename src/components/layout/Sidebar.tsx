import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useMode } from "@/contexts/ModeContext";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Gem,
  Settings,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  BarChart3,
  Users,
  FileText
} from "lucide-react";

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

export function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdvanced, setMode, isUpdating } = useMode();

  const sidebarItems = [
    {
      titleKey: "nav.dashboard",
      href: "/",
      icon: LayoutDashboard,
    },
    {
      titleKey: "nav.income",
      href: "/income",
      icon: TrendingUp,
    },
    {
      titleKey: "nav.expenses",
      href: "/expenses",
      icon: TrendingDown,
    },
    {
      titleKey: "nav.debts",
      href: "/debts",
      icon: CreditCard,
    },
    {
      titleKey: "nav.assets",
      href: "/assets",
      icon: Gem,
    },
    {
      titleKey: "nav.settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const advancedItems = [
    { titleKey: 'nav.advanced.dashboard', href: '/advanced', icon: BarChart3 },
    { titleKey: 'nav.clients',            href: '/clients',  icon: Users },
    { titleKey: 'nav.invoices',           href: '/invoices', icon: FileText },
  ];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-40 lg:hidden",
          isMobileMenuOpen ? "block" : "hidden"
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div className={cn(
        "relative flex flex-col h-screen bg-gradient-card border-r rtl:border-r-0 rtl:border-l border-border transition-all duration-300 ease-in-out",
        "lg:relative lg:translate-x-0 rtl:lg:translate-x-0",
        "fixed z-50 left-0 rtl:left-auto rtl:right-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        collapsed ? "w-16" : "w-64"
      )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border h-16">
        <div className={cn(
          "flex items-center gap-2 transition-opacity duration-200",
          collapsed && "opacity-0 pointer-events-none w-0"
        )}>
          <div className="flex items-center justify-center w-8 h-8 bg-gradient-primary rounded-lg">
            <DollarSign className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
            Balance Tracker
          </h1>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0 shrink-0 hidden lg:flex"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          ) : (
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          )}
        </Button>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileMenuOpen(false)}
          className="h-8 w-8 p-0 shrink-0 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-12 transition-all duration-200 text-left",
                  collapsed && "justify-center px-0 gap-0",
                  isActive && "bg-gradient-primary shadow-financial text-primary-foreground font-medium",
                  !isActive && "hover:bg-muted/50"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )} />
                <span className={cn(
                  "transition-all duration-200 font-medium",
                  collapsed && "opacity-0 w-0 overflow-hidden",
                  !collapsed && "opacity-100",
                  isActive ? "text-primary-foreground" : "text-foreground"
                )}>
                  {t(item.titleKey)}
                </span>
              </Button>
            </Link>
          );
        })}
        {isAdvanced && (
          <>
            <Separator className="my-2" />
            {advancedItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} to={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-12 transition-all duration-200 text-left",
                      collapsed && "justify-center px-0 gap-0",
                      isActive && "bg-gradient-primary shadow-financial text-primary-foreground font-medium",
                      !isActive && "hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "transition-all duration-200 font-medium",
                      collapsed && "opacity-0 w-0 overflow-hidden",
                      !collapsed && "opacity-100",
                      isActive ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {t(item.titleKey)}
                    </span>
                  </Button>
                </Link>
              );
            })}
          </>
        )}
        {/* Mode toggle — always visible, even when collapsed (icon-only) */}
        <Separator className="my-2" />
        <Button
          variant="ghost"
          size="sm"
          disabled={isUpdating}
          onClick={() => setMode(isAdvanced ? 'simple' : 'advanced')}
          className={cn(
            "w-full justify-start gap-3 h-10 transition-all duration-200",
            collapsed && "justify-center px-0 gap-0"
          )}
        >
          <BarChart3 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <span className={cn(
            "transition-all duration-200 font-medium text-sm",
            collapsed && "opacity-0 w-0 overflow-hidden"
          )}>
            {isAdvanced ? t('mode.switchToSimple') : t('mode.switchToAdvanced')}
          </span>
        </Button>
      </nav>

      {/* Footer */}
      <div className={cn(
        "p-4 border-t border-border transition-all duration-200",
        collapsed ? "opacity-0 h-0 p-0 overflow-hidden" : "opacity-100"
      )}>
        <div className="text-xs text-muted-foreground text-center">
          {t("sidebar.footer")}
        </div>
      </div>
    </div>
    </>
  );
}
