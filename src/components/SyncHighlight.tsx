import { useI18n } from "@/i18n/useI18n";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";

const SyncHighlight = () => {
  const { t } = useI18n();

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-band/5 p-8 md:p-12"
        >
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/10 blur-[80px]" />
          <div className="relative z-10 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
              <Radio className="h-4 w-4 text-primary animate-pulse-glow" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Band Sync</span>
            </div>

            <h2 className="mb-6 font-display text-3xl font-bold text-foreground md:text-4xl">
              {t("sync.title")}
            </h2>

            <div className="mb-6 space-y-2 text-lg text-secondary-foreground">
              <p>{t("sync.body_1")}</p>
              <p>{t("sync.body_2")}</p>
            </div>

            <div className="mb-8 space-y-1.5">
              {["sync.line_1", "sync.line_2", "sync.line_3", "sync.line_4"].map((key) => (
                <p key={key} className="text-sm text-muted-foreground">
                  ✦ {t(key)}
                </p>
              ))}
            </div>

            <button className="rounded-lg border border-primary/30 bg-primary/10 px-6 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20">
              {t("sync.cta")}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SyncHighlight;
