import { useDate } from "@/contexts/DateContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";

export const DateFilterSelector = () => {
  const { selectedMonth, setSelectedMonth, getMonthOptions } = useDate();
  const { t } = useTranslation();
  const monthOptions = getMonthOptions();

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-5 w-5 text-muted-foreground" />
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-full sm:w-48 bg-background/80 backdrop-blur-sm">
          <SelectValue placeholder={t("dateFilter.selectMonth")} />
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
