import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureProfileAndSettings } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

const mockedFrom = vi.mocked(supabase.from);
const mockedTrackEvent = vi.mocked(trackEvent);

const baseUser = {
  id: "user-1",
  email: "demo@example.com",
  user_metadata: { name: "Demo User" },
} as never;

describe("ensureProfileAndSettings", () => {
  beforeEach(() => {
    mockedFrom.mockReset();
    mockedTrackEvent.mockReset();
  });

  it("returns existing profile data when profile exists", async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { name: "Existing Name" },
        error: null,
      }),
    };
    const settingsUpsert = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockedFrom
      .mockReturnValueOnce(profileQuery as never)
      .mockReturnValueOnce(settingsUpsert as never);

    const user = await ensureProfileAndSettings(baseUser);

    expect(user.name).toBe("Existing Name");
    expect(settingsUpsert.upsert).toHaveBeenCalled();
    expect(mockedTrackEvent).not.toHaveBeenCalledWith("auth_profile_recovered");
  });

  it("recovers missing profile and still ensures settings", async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };
    const profileUpsert = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { name: "Recovered Name" },
        error: null,
      }),
    };
    const settingsUpsert = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockedFrom
      .mockReturnValueOnce(profileQuery as never)
      .mockReturnValueOnce(profileUpsert as never)
      .mockReturnValueOnce(settingsUpsert as never);

    const user = await ensureProfileAndSettings(baseUser);

    expect(user.name).toBe("Recovered Name");
    expect(profileUpsert.upsert).toHaveBeenCalled();
    expect(settingsUpsert.upsert).toHaveBeenCalled();
    expect(mockedTrackEvent).toHaveBeenCalledWith("auth_profile_recovered");
  });
});
