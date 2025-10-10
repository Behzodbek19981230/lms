import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  BarChart3, 
  MessageSquare, 
  Shield,
  Clock,
  Award,
  Video
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Users,
      title: "Ko'p foydalanuvchi tizimi",
      description: "Super Admin, Center Admin, Teacher va Student rollariga mos boshqaruv paneli.",
      color: "text-primary"
    },
    {
      icon: BookOpen,
      title: "Test va vazifalar",
      description: "Mavzuli va blok testlar, vaqt cheklangan imtihonlar, avtomatik baholash tizimi.",
      color: "text-accent"
    },
    {
      icon: Video,
      title: "Online darslar",
      description: "Zoom va Google Meet integratsiyasi, videodars yuklash va yo'qlama tizimi.",
      color: "text-primary"
    },
    {
      icon: CreditCard,
      title: "To'lov nazorati",
      description: "Oylik to'lovlar, qarzdorlik hisobi, avtomatik eslatmalar va moliya hisobotlari.",
      color: "text-accent"
    },
    {
      icon: MessageSquare,
      title: "Telegram integratsiya",
      description: "Har bir markaz uchun alohida bot, yo'qlama, natijalar va eslatmalar.",
      color: "text-primary"
    },
    {
      icon: BarChart3,
      title: "Analitika va hisobotlar",
      description: "Student progressi, guruh aktivligi, moliya tahlili va batafsil statistika.",
      color: "text-accent"
    },
    {
      icon: Shield,
      title: "Xavfsizlik",
      description: "Multi-tenant arxitektura, ma'lumotlar himoyasi va ruxsat tizimi.",
      color: "text-primary"
    },
    {
      icon: Clock,
      title: "24/7 qo'llab-quvvatlash",
      description: "Texnik yordam, o'qitish materiallari va tizim yangilanishlari.",
      color: "text-accent"
    },
    {
      icon: Award,
      title: "Sertifikat tizimi",
      description: "Avtomatik sertifikat yaratish, ball tizimi va student motivatsiyasi.",
      color: "text-primary"
    }
  ];

  return (
    <section id="features" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Kuchli funksiyalar
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            EduOne o'quv markazlaringizni samarali boshqarish uchun barcha kerakli vositalarni taqdim etadi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-hover transition-all duration-500 hover:-translate-y-3 bg-gradient-card border-border/50 backdrop-blur-sm animate-slide-up relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-shimmer opacity-20"></div>
                
                <CardContent className="p-6 relative z-10">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${
                        feature.color === 'text-primary' 
                          ? 'from-primary/20 to-primary-glow/20 shadow-lg shadow-primary/20' 
                          : 'from-accent/20 to-accent-glow/20 shadow-lg shadow-accent/20'
                      } group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`h-7 w-7 ${feature.color} group-hover:scale-110 transition-transform duration-300`} />
                      </div>
                      {/* Animated pulse ring */}
                      <div className={`absolute inset-0 rounded-xl ${
                        feature.color === 'text-primary' ? 'bg-primary/10' : 'bg-accent/10'
                      } animate-ping opacity-75 group-hover:animate-pulse`}></div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors duration-300">
                      {feature.title}
                    </h3>
                    
                    <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                      {feature.description}
                    </p>
                    
                    {/* Progress indicator */}
                    <div className="pt-2">
                      <div className="w-full h-1 bg-border/30 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 group-hover:w-full w-0 ${
                            feature.color === 'text-primary' ? 'bg-gradient-primary' : 'bg-gradient-accent'
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
