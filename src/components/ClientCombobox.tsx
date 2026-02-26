import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useClients } from "@/hooks/useClients";

interface ClientComboboxProps {
  value: string | null;
  onChange: (clientId: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientCombobox({
  value,
  onChange,
  placeholder,
  disabled,
}: ClientComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useClients();
  const clientList = clients ?? [];

  const selectedClient = clientList.find((c) => c.id === value) ?? null;
  const displayPlaceholder = placeholder ?? t("income.form.placeholder.client");

  const filteredClients = clientList.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-start text-left font-normal"
        >
          {selectedClient ? (
            <>
              <span className="flex-1 truncate">{selectedClient.name}</span>
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100 shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              />
            </>
          ) : (
            <>
              <ChevronsUpDown className="mr-2 h-4 w-4 opacity-50 shrink-0" />
              <span className={cn("text-muted-foreground")}>
                {displayPlaceholder}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={t("clients.searchPlaceholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>{t("common.loading", "Loading...")}</CommandEmpty>
            ) : filteredClients.length === 0 ? (
              <CommandEmpty>
                <span>{t("income.form.noClients")}</span>{" "}
                <Link
                  to="/clients/new"
                  className="text-primary underline"
                  onClick={() => setOpen(false)}
                >
                  {t("income.form.addClient")}
                </Link>
              </CommandEmpty>
            ) : (
              filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onChange(client.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
