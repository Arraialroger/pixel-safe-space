import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Theme = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "pixelsafe-theme";

function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark" || v === "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  // Enable smooth color transition for the theme swap
  root.classList.add("theme-transition");
  root.classList.remove("light", "dark");
  if (resolved === "light") root.classList.add("light");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "light" ? "#ffffff" : "#111114");
  // Remove the transition helper after it finishes so it doesn't affect normal interactions
  window.setTimeout(() => root.classList.remove("theme-transition"), 250);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    theme === "system" ? getSystemTheme() : theme
  );

  const userIdRef = useRef<string | null>(null);
  // Skip the next remote write right after we hydrate from the profile,
  // so loading the saved theme doesn't loop back as a write.
  const skipNextWriteRef = useRef(false);

  // Apply theme + persist locally + persist to profile (if signed in)
  useEffect(() => {
    const next: ResolvedTheme = theme === "system" ? getSystemTheme() : theme;
    setResolvedTheme(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, theme);

    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    const uid = userIdRef.current;
    if (!uid) return;
    supabase
      .from("profiles")
      .update({ theme_preference: theme })
      .eq("id", uid)
      .then(({ error }) => {
        if (error) console.warn("[theme] failed to persist preference", error.message);
      });
  }, [theme]);

  // Listen to OS changes only when in system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? "light" : "dark";
      setResolvedTheme(next);
      applyTheme(next);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  // Hydrate from profile on auth state changes
  useEffect(() => {
    const hydrate = async (uid: string | null) => {
      userIdRef.current = uid;
      if (!uid) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("theme_preference")
        .eq("id", uid)
        .maybeSingle();
      if (error || !data?.theme_preference) return;
      const remote = data.theme_preference;
      if (isTheme(remote) && remote !== theme) {
        skipNextWriteRef.current = true;
        setThemeState(remote);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      hydrate(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => hydrate(data.session?.user?.id ?? null));

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => {
    setThemeState((p) => (p === "dark" ? "light" : p === "light" ? "system" : "dark"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
