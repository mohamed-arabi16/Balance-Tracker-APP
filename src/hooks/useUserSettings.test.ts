import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_USER_SETTINGS,
  fetchOrCreateUserSettings,
  updateUserSettings,
} from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

type SettingsRow = {
  user_id: string;
  default_currency: "USD" | "TRY";
  auto_convert: boolean;
  theme: string;
  include_long_term: boolean;
  auto_price_update: boolean;
  language: string;
};

const mockedFrom = vi.mocked(supabase.from);

describe("user settings persistence helpers", () => {
  beforeEach(() => {
    mockedFrom.mockReset();
  });

  it("fetches existing settings when the row exists", async () => {
    const existing: SettingsRow = {
      user_id: "u1",
      ...DEFAULT_USER_SETTINGS,
    };

    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: existing, error: null }),
    };

    mockedFrom.mockReturnValue(selectChain as never);

    const result = await fetchOrCreateUserSettings("u1");

    expect(result).toEqual(existing);
    expect(selectChain.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("creates settings when no row exists", async () => {
    const inserted: SettingsRow = {
      user_id: "u2",
      ...DEFAULT_USER_SETTINGS,
    };

    const fetchChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
    };

    mockedFrom
      .mockReturnValueOnce(fetchChain as never)
      .mockReturnValueOnce(insertChain as never);

    const result = await fetchOrCreateUserSettings("u2");

    expect(insertChain.insert).toHaveBeenCalledWith([
      { user_id: "u2", ...DEFAULT_USER_SETTINGS },
    ]);
    expect(result).toEqual(inserted);
  });

  it("updates an existing row", async () => {
    const updated: SettingsRow = {
      user_id: "u3",
      ...DEFAULT_USER_SETTINGS,
      language: "ar",
    };

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };

    mockedFrom.mockReturnValue(updateChain as never);

    const result = await updateUserSettings({
      userId: "u3",
      updates: { language: "ar" },
    });

    expect(updateChain.update).toHaveBeenCalledWith({ language: "ar" });
    expect(result.language).toBe("ar");
  });

  it("upserts defaults when update finds no existing row", async () => {
    const upserted: SettingsRow = {
      user_id: "u4",
      ...DEFAULT_USER_SETTINGS,
      auto_convert: false,
    };

    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const upsertChain = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: upserted, error: null }),
    };

    mockedFrom
      .mockReturnValueOnce(updateChain as never)
      .mockReturnValueOnce(upsertChain as never);

    const result = await updateUserSettings({
      userId: "u4",
      updates: { auto_convert: false },
    });

    expect(upsertChain.upsert).toHaveBeenCalledWith(
      [{ user_id: "u4", ...DEFAULT_USER_SETTINGS, auto_convert: false }],
      { onConflict: "user_id" },
    );
    expect(result.auto_convert).toBe(false);
  });
});
