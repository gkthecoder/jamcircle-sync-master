import { useI18n } from "@/i18n/useI18n";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  { quoteKey: "testimonials.t1_quote", titleKey: "testimonials.t1_title" },
  { quoteKey: "testimonials.t2_quote", titleKey: "testimonials.t2_title" },
  { quoteKey: "testimonials.t3_quote", titleKey: "testimonials.t3_title" },
];

const Testimonials = () => {
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
          {t("testimonials.title")}
        </motion.h2>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <motion.div
              key={item.quoteKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              <Quote className="mb-3 h-5 w-5 text-primary/50" />
              <p className="mb-4 text-secondary-foreground italic">"{t(item.quoteKey)}"</p>
              <p className="text-sm font-semibold text-muted-foreground">— {t(item.titleKey)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
