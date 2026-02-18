import { Link, useLocation } from "react-router-dom";
import { useI18n, Locale } from "@/i18n/useI18n";
import { Globe, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const localeOptions: { value: Locale; labelKey: string }[] = [
  { value: "pt-BR", labelKey: "lang.pt" },
  { value: "en-US", labelKey: "lang.en" },
  { value: "es-ES", labelKey: "lang.es" },
];

const Navbar = () => {
  const { t, locale, setLocale } = useI18n();
  const location = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/live", label: t("nav.live") },
    { to: "/edu", label: t("nav.edu") },
    { to: "/band", label: t("nav.band") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-xl font-bold tracking-tight">
          <span className="text-gradient">Jam</span>
          <span className="text-foreground">Circle</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location.pathname === l.to ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden lg:inline">{locale}</span>
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-card p-1 shadow-xl"
                >
                  {localeOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setLocale(opt.value);
                        setLangOpen(false);
                      }}
                      className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                        locale === opt.value ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-background md:hidden"
          >
            <div className="flex flex-col gap-2 px-4 py-4">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary ${
                    location.pathname === l.to ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 border-t border-border pt-2">
                {localeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setLocale(opt.value);
                      setMobileOpen(false);
                    }}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary ${
                      locale === opt.value ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
