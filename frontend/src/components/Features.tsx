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
            EduNimbus o'quv markazlaringizni samarali boshqarish uchun barcha kerakli vositalarni taqdim etadi
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-card transition-all duration-300 hover:-translate-y-2 bg-card border-border"
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10`}>
                      <Icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
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