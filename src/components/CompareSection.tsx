import { useI18n } from "@/i18n/useI18n";
import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";

const rows = [
  { key: "compare.row_1", live: true, edu: true, band: true },
  { key: "compare.row_2", live: true, edu: true, band: true },
  { key: "compare.row_3", live: true, edu: true, band: true },
  { key: "compare.row_4", live: true, edu: true, band: true },
  { key: "compare.row_5", live: true, edu: false, band: false },
  { key: "compare.row_6", live: false, edu: true, band: false },
  { key: "compare.row_7", live: false, edu: false, band: true },
  { key: "compare.row_8", live: true, edu: true, band: true },
  { key: "compare.row_9", live: true, edu: true, band: true },
];

const CompareSection = () => {
  const { t } = useI18n();

  const Cell = ({ val }: { val: boolean }) =>
    val ? (
      <Check className="mx-auto h-4 w-4 text-primary" />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />
    );

  return (
    <section id="compare" className="py-24">
      <div className="container mx-auto px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center font-display text-3xl font-bold md:text-4xl"
        >
          {t("compare.title")}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="overflow-x-auto"
        >
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-4 text-left font-medium text-muted-foreground" />
                <th className="pb-4 font-display font-bold text-live">LIVE</th>
                <th className="pb-4 font-display font-bold text-edu">EDU</th>
                <th className="pb-4 font-display font-bold text-band">BAND</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.key}
                  className={`border-b border-border/50 ${i % 2 === 0 ? "bg-secondary/30" : ""}`}
                >
                  <td className="py-3 pr-4 text-secondary-foreground">{t(row.key)}</td>
                  <td className="py-3 text-center"><Cell val={row.live} /></td>
                  <td className="py-3 text-center"><Cell val={row.edu} /></td>
                  <td className="py-3 text-center"><Cell val={row.band} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
};

export default CompareSection;
