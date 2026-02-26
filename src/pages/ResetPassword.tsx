import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Check if user arrived via recovery link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setIsValidSession(true);
    } else {
      // Also check if there's an active session (user might already be authenticated via recovery)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValidSession(true);
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("auth.resetPassword.mismatch"));
      return;
    }

    if (password.length < 6) {
      toast.error(t("auth.resetPassword.tooShort"));
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsLoading(false);

    if (error) {
      toast.error(t("auth.resetPassword.error"));
    } else {
      toast.success(t("auth.resetPassword.success"));
      navigate("/");
    }
  };

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-dashboard flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-gradient-card border border-border shadow-elevated">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t("auth.resetPassword.invalidLink")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dashboard flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-gradient-card border border-border shadow-elevated">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-lg mx-auto mb-4">
            <DollarSign className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t("auth.resetPassword.title")}
          </CardTitle>
          <CardDescription>
            {t("auth.resetPassword.subtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("auth.resetPassword.newPasswordLabel")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t("auth.resetPassword.newPasswordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 rtl:pl-3 rtl:pr-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("auth.resetPassword.confirmLabel")}</Label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("auth.resetPassword.confirmPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 rtl:pl-3 rtl:pr-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? t("auth.resetPassword.buttonLoading") : t("auth.resetPassword.button")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
