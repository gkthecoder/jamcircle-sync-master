import { useI18n } from "@/i18n/useI18n";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const HeroSection = () => {
  const { t } = useI18n();

  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-16">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-live/5 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-edu/5 blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/2 h-80 w-80 rounded-full bg-band/5 blur-[100px]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground"
        >
          {t("hero.mini_tagline")}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mx-auto mb-6 max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl lg:text-7xl"
        >
          <span className="text-gradient">{t("hero.headline")}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl"
        >
          {t("hero.subheadline")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4"
        >
          <Link
            to="/live"
            className="inline-flex items-center rounded-lg border border-live/30 bg-live/10 px-6 py-3 text-sm font-semibold text-live transition-all hover:bg-live/20 hover:shadow-[0_0_20px_hsl(var(--live)/0.2)]"
          >
            {t("hero.cta_live")}
          </Link>
          <Link
            to="/edu"
            className="inline-flex items-center rounded-lg border border-edu/30 bg-edu/10 px-6 py-3 text-sm font-semibold text-edu transition-all hover:bg-edu/20 hover:shadow-[0_0_20px_hsl(var(--edu)/0.2)]"
          >
            {t("hero.cta_edu")}
          </Link>
          <Link
            to="/band"
            className="inline-flex items-center rounded-lg border border-band/30 bg-band/10 px-6 py-3 text-sm font-semibold text-band transition-all hover:bg-band/20 hover:shadow-[0_0_20px_hsl(var(--band)/0.2)]"
          >
            {t("hero.cta_band")}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-6"
        >
          <a
            href="#compare"
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("hero.cta_compare")}
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
