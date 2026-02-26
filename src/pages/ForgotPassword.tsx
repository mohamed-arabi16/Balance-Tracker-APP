import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsLoading(false);

    if (error) {
      toast.error(t("auth.forgotPassword.error"));
    } else {
      setSent(true);
      toast.success(t("auth.forgotPassword.success"));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dashboard flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-gradient-card border border-border shadow-elevated">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-lg mx-auto mb-4">
            <DollarSign className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {t("auth.forgotPassword.title")}
          </CardTitle>
          <CardDescription>
            {t("auth.forgotPassword.subtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                {t("auth.forgotPassword.sentMessage")}
              </p>
              <Link to="/signin">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {t("auth.forgotPassword.backToSignIn")}
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.signIn.emailLabel")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 rtl:left-auto rtl:right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.signIn.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                  {isLoading ? t("auth.forgotPassword.buttonLoading") : t("auth.forgotPassword.button")}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/signin"
                  className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
                  {t("auth.forgotPassword.backToSignIn")}
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
