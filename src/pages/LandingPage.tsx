import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Shield } from "lucide-react";
import { HeroSection } from "@/components/landing/HeroSection";
import { PainSection } from "@/components/landing/PainSection";
import { VaultSection } from "@/components/landing/VaultSection";
import { B2BSection } from "@/components/landing/B2BSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FooterCTA } from "@/components/landing/FooterCTA";

export default function LandingPage() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="landing-page min-h-screen bg-background" style={{ colorScheme: "dark" }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>

      <header className="relative z-20 flex items-center justify-between px-6 py-5 lg:px-16">
        <div className="flex items-center gap-2.5">
          <Shield className="h-7 w-7 text-primary" aria-hidden="true" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            Pixel Safe
          </span>
        </div>
        <Link
          to="/login"
          className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          Entrar
        </Link>
      </header>

      <main id="main-content">
        <HeroSection />
        <PainSection />
        <VaultSection />
        <B2BSection />
        <FAQSection />
        <FooterCTA />
      </main>
    </div>
  );
}
