import { useI18n } from "@/i18n/useI18n";

const Footer = () => {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4 text-center">
        <p className="font-display text-lg text-muted-foreground">
          {t("footer.tagline")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
