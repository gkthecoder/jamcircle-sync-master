import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ProductCards from "@/components/ProductCards";
import SyncHighlight from "@/components/SyncHighlight";
import CompareSection from "@/components/CompareSection";
import Testimonials from "@/components/Testimonials";
import FreemiumSection from "@/components/FreemiumSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ProductCards />
        <SyncHighlight />
        <CompareSection />
        <Testimonials />
        <FreemiumSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
