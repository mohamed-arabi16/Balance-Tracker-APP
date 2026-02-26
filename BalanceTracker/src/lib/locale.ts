import i18n from "@/i18n";

export const getLocaleFromLanguage = (language: string = i18n.language): string => {
  if (language.startsWith("ar")) {
    return "ar-EG";
  }

  return "en-US";
};
