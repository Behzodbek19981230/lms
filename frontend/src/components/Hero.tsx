import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, Building2, GraduationCap } from "lucide-react";
import heroImage from "@/assets/hero-education.jpg";

const Hero = () => {
  return (
    <section className="pt-24 pb-16 bg-gradient-subtle min-h-screen flex items-center">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 rounded-full text-primary font-medium">
              <span className="text-sm">🚀 Ko'p o'quv markazlari uchun</span>
            </div>
            
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                E-Learning
                <span className="block bg-gradient-hero bg-clip-text text-transparent">
                  SaaS Platform
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Bir nechta o'quv markazlarini boshqarish uchun yagona platforma. 
                Studentlar, o'qituvchilar va moliya jarayonlarini osonlik bilan nazorat qiling.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="text-lg px-8 py-6">
                Bepul sinab ko'ring
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button variant="glass" size="lg" className="text-lg px-8 py-6">
                <Play className="h-5 w-5" />
                Demo ko'rish
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Building2 className="h-6 w-6 text-primary mr-2" />
                  <span className="text-3xl font-bold text-foreground">500+</span>
                </div>
                <p className="text-sm text-muted-foreground">O'quv markazlari</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Users className="h-6 w-6 text-accent mr-2" />
                  <span className="text-3xl font-bold text-foreground">50K+</span>
                </div>
                <p className="text-sm text-muted-foreground">Studentlar</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <GraduationCap className="h-6 w-6 text-primary mr-2" />
                  <span className="text-3xl font-bold text-foreground">10K+</span>
                </div>
                <p className="text-sm text-muted-foreground">O'qituvchilar</p>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative z-10">
              <img
                src={heroImage}
                alt="E-Learning Platform"
                className="w-full h-auto rounded-2xl shadow-elegant animate-float"
              />
            </div>
            {/* Background Decorations */}
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-primary opacity-20 rounded-full blur-3xl animate-pulse-glow"></div>
            <div className="absolute -bottom-4 -left-4 w-64 h-64 bg-gradient-accent opacity-20 rounded-full blur-3xl animate-pulse-glow"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;