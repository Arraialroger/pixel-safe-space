import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { PainSection } from "@/components/landing/PainSection";
import { VaultSection } from "@/components/landing/VaultSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { B2BSection } from "@/components/landing/B2BSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FooterCTA } from "@/components/landing/FooterCTA";

export default function LandingPage() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "hsl(var(--landing-bg))" }}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(var(--landing-accent))", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="landing-page min-h-screen"
      style={{
        background: "hsl(var(--landing-bg))",
        colorScheme: "dark",
      }}
    >
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium"
        style={{
          background: "hsl(var(--landing-accent))",
          color: "hsl(var(--landing-accent-foreground))",
        }}
      >
        Pular para o conteúdo
      </a>

      {/* Minimal header */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 lg:px-16">
        <div className="flex items-center gap-2.5">
          <Shield className="h-7 w-7" style={{ color: "hsl(var(--landing-accent))" }} aria-hidden="true" />
          <span
            className="text-lg font-bold tracking-tight"
            style={{ color: "hsl(var(--landing-text))" }}
          >
            Pixel Safe
          </span>
        </div>
        <Link
          to="/login"
          className="text-sm font-medium transition-colors duration-200 hover:opacity-80"
          style={{ color: "hsl(var(--landing-text) / 0.6)" }}
        >
          Entrar
        </Link>
      </header>

      <main id="main-content">
        <HeroSection />
        <PainSection />
        <VaultSection />
        <SocialProofSection />
        <B2BSection />
        <FAQSection />
        <FooterCTA />
      </main>
    </div>
  );
}
