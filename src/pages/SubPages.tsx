import { useI18n } from "@/i18n/useI18n";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Zap, GraduationCap, Users } from "lucide-react";

interface SubPageProps {
  mode: "live" | "edu" | "band";
}

const config = {
  live: { colorClass: "text-live", borderClass: "border-live/30", bgClass: "bg-live/10", Icon: Zap, glowVar: "--live", protoUrl: "https://jam-circle-live.lovable.app" },
  edu: { colorClass: "text-edu", borderClass: "border-edu/30", bgClass: "bg-edu/10", Icon: GraduationCap, glowVar: "--edu", protoUrl: "https://jamcircle-edu.lovable.app" },
  band: { colorClass: "text-band", borderClass: "border-band/30", bgClass: "bg-band/10", Icon: Users, glowVar: "--band", protoUrl: "https://music-jam-hub.lovable.app" },
};

const SubPage = ({ mode }: SubPageProps) => {
  const { t } = useI18n();
  const { colorClass, borderClass, bgClass, Icon, protoUrl } = config[mode];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="flex min-h-[80vh] items-center justify-center pt-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className={`mx-auto mb-6 inline-flex rounded-xl p-4 ${bgClass}`}>
              <Icon className={`h-12 w-12 ${colorClass}`} />
            </div>
            <h1 className={`mb-4 font-display text-5xl font-bold ${colorClass} md:text-6xl`}>
              {t(`subpage.${mode}_hero`)}
            </h1>
            <p className="mx-auto mb-8 max-w-lg text-lg text-muted-foreground">
              {t(`subpage.${mode}_sub`)}
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href={protoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`rounded-lg border ${borderClass} ${bgClass} px-8 py-3 text-sm font-semibold ${colorClass} transition-all hover:opacity-80`}
              >
                {t(`subpage.${mode}_cta`)}
              </a>
              <Link
                to="/"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("subpage.back")}
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export const LivePage = () => <SubPage mode="live" />;
export const EduPage = () => <SubPage mode="edu" />;
export const BandPage = () => <SubPage mode="band" />;
