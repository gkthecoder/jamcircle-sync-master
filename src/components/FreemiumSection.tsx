import { useI18n } from "@/i18n/useI18n";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";

const FreemiumSection = () => {
  const { t } = useI18n();

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center font-display text-3xl font-bold md:text-4xl"
        >
          {t("freemium.title")}
        </motion.h2>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="rounded-xl border border-border bg-card p-6"
          >
            <h3 className="mb-4 font-display text-2xl font-bold">{t("freemium.free_title")}</h3>
            <ul className="space-y-3">
              {["freemium.free_b1", "freemium.free_b2", "freemium.free_b3"].map((k) => (
                <li key={k} className="flex items-center gap-2 text-sm text-secondary-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {t(k)}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Pro */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative rounded-xl border border-primary/30 bg-card p-6"
          >
            <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
              <Star className="h-3 w-3" /> PRO
            </div>
            <h3 className="mb-4 font-display text-2xl font-bold text-primary">{t("freemium.pro_title")}</h3>
            <ul className="space-y-3">
              {["freemium.pro_b1", "freemium.pro_b2", "freemium.pro_b3", "freemium.pro_b4"].map((k) => (
                <li key={k} className="flex items-center gap-2 text-sm text-secondary-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {t(k)}
                </li>
              ))}
            </ul>
            <button className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
              {t("freemium.cta")}
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FreemiumSection;
