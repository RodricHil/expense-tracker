import { afterEach, describe, expect, it, vi } from "vitest";
import { getThemePreference, resolveTheme, setThemePreference, subscribeTheme, themePreference } from "../lib/theme";

afterEach(() => vi.unstubAllGlobals());
function setup() {
  const dataset: Record<string, string> = {};
  const media = Object.assign(new EventTarget(), { matches: false });
  const windowMock = Object.assign(new EventTarget(), { matchMedia: () => media });
  const storage = { setItem: vi.fn() };
  vi.stubGlobal("document", { documentElement: { dataset } });
  vi.stubGlobal("window", windowMock);
  vi.stubGlobal("localStorage", storage);
  return { dataset, media, windowMock, storage };
}

describe("appearance preference", () => {
  it("defaults unknown preferences to system", () => {
    expect(themePreference(null)).toBe("system");
    expect(themePreference("invalid")).toBe("system");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("persists manual selection and ignores system changes until system is selected", () => {
    const { dataset, media, storage } = setup();
    const unsubscribe = subscribeTheme(vi.fn());
    setThemePreference("light");
    media.matches = true;
    media.dispatchEvent(new Event("change"));
    expect(dataset.theme).toBe("light");
    expect(storage.setItem).toHaveBeenCalledWith("finex-theme", "light");
    setThemePreference("system");
    expect(dataset.theme).toBe("dark");
    media.matches = false;
    media.dispatchEvent(new Event("change"));
    expect(dataset.theme).toBe("light");
    unsubscribe();
  });
  it("still switches when storage is unavailable", () => {
    const { dataset, storage } = setup();
    storage.setItem.mockImplementation(() => { throw new Error("Storage blocked"); });
    expect(() => setThemePreference("dark")).not.toThrow();
    expect(dataset.theme).toBe("dark");
    expect(getThemePreference()).toBe("dark");
  });
  it("syncs preference changes from another tab", () => {
    const { dataset, windowMock } = setup();
    const unsubscribe = subscribeTheme(vi.fn());
    windowMock.dispatchEvent(Object.assign(new Event("storage"), { key: "finex-theme", newValue: "dark" }));
    expect(dataset.theme).toBe("dark");
    expect(getThemePreference()).toBe("dark");
    unsubscribe();
  });
});
