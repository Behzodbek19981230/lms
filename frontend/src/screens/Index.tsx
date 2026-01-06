import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import ContactUs from "@/components/ContactUs";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      {/* <Pricing /> */}
      <Features />
      <ContactUs />
      <Footer />
    </div>
  );
};

export default Index;
