import { useI18n } from "@/i18n/useI18n";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, GraduationCap, Users } from "lucide-react";

const cardData = [
  {
    titleKey: "cards.live_title",
    descKey: "cards.live_desc",
    bodyKey: "cards.live_body",
    bullets: ["cards.live_b1", "cards.live_b2", "cards.live_b3", "cards.live_b4"],
    ctaKey: "cards.live_cta",
    link: "/live",
    colorClass: "text-live",
    borderClass: "border-live/20 hover:border-live/40",
    glowClass: "glow-live",
    bgClass: "bg-live/5",
    icon: Zap,
  },
  {
    titleKey: "cards.edu_title",
    descKey: "cards.edu_desc",
    bodyKey: "cards.edu_body",
    bullets: ["cards.edu_b1", "cards.edu_b2", "cards.edu_b3", "cards.edu_b4"],
    ctaKey: "cards.edu_cta",
    link: "/edu",
    colorClass: "text-edu",
    borderClass: "border-edu/20 hover:border-edu/40",
    glowClass: "glow-edu",
    bgClass: "bg-edu/5",
    icon: GraduationCap,
  },
  {
    titleKey: "cards.band_title",
    descKey: "cards.band_desc",
    bodyKey: "cards.band_body",
    bullets: ["cards.band_b1", "cards.band_b2", "cards.band_b3", "cards.band_b4"],
    ctaKey: "cards.band_cta",
    link: "/band",
    colorClass: "text-band",
    borderClass: "border-band/20 hover:border-band/40",
    glowClass: "glow-band",
    bgClass: "bg-band/5",
    icon: Users,
  },
];

const ProductCards = () => {
  const { t } = useI18n();

  return (
    <section className="py-24">
      <div className="container mx-auto grid gap-6 px-4 md:grid-cols-3">
        {cardData.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.titleKey}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className={`group relative rounded-xl border bg-card p-6 transition-all duration-300 ${card.borderClass}`}
            >
              <div className={`mb-4 inline-flex rounded-lg p-2.5 ${card.bgClass}`}>
                <Icon className={`h-6 w-6 ${card.colorClass}`} />
              </div>
              <h3 className={`mb-1 font-display text-xl font-bold ${card.colorClass}`}>
                {t(card.titleKey)}
              </h3>
              <p className="mb-2 text-sm text-muted-foreground">{t(card.descKey)}</p>
              <p className="mb-4 text-sm text-secondary-foreground">{t(card.bodyKey)}</p>
              <ul className="mb-6 space-y-2">
                {card.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${card.bgClass} ${card.colorClass}`} />
                    {t(b)}
                  </li>
                ))}
              </ul>
              <Link
                to={card.link}
                className={`inline-flex items-center text-sm font-semibold ${card.colorClass} transition-opacity hover:opacity-80`}
              >
                {t(card.ctaKey)} →
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default ProductCards;
