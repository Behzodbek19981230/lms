import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star } from "lucide-react";

const Pricing = () => {
  const plans = [
    {
      name: "Boshlang'ich",
      price: "Bepul",
      period: "doimiy",
      description: "Kichik o'quv markazlari uchun",
      features: [
        "50 gacha student",
        "5 gacha o'qituvchi",
        "Asosiy test tizimi",
        "Telegram integratsiya",
        "Asosiy hisobotlar"
      ],
      buttonText: "Boshlash",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      name: "Standart",
      price: "299,000",
      period: "so'm/oy",
      description: "O'rta o'quv markazlari uchun",
      features: [
        "500 gacha student",
        "25 gacha o'qituvchi",
        "Kengaytirilgan test tizimi",
        "Online darslar",
        "To'lov nazorati",
        "Telegram bot",
        "Analitika",
        "24/7 qo'llab-quvvatlash"
      ],
      buttonText: "Tanlash",
      buttonVariant: "hero" as const,
      popular: true
    },
    {
      name: "Premium",
      price: "599,000",
      period: "so'm/oy",
      description: "Yirik o'quv markazlari uchun",
      features: [
        "Cheksiz student",
        "Cheksiz o'qituvchi",
        "Barcha funksiyalar",
        "Sertifikat tizimi",
        "AI test yaratish",
        "Batafsil analitika",
        "Shaxsiy menejer",
        "API kirish"
      ],
      buttonText: "Bog'lanish",
      buttonVariant: "accent" as const,
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Narx rejalari
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            O'quv markazingiz hajmiga mos keladigan rejani tanlang
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index}
              className={`relative transition-all duration-300 hover:shadow-elegant hover:-translate-y-2 ${
                plan.popular 
                  ? 'border-primary shadow-glow bg-card' 
                  : 'border-border bg-card'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                    <Star className="h-4 w-4 mr-1" />
                    Mashhur
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-card-foreground">
                  {plan.name}
                </CardTitle>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-foreground">
                    {plan.price}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {plan.period}
                  </div>
                </div>
                <p className="text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <div className="bg-primary/10 rounded-full p-1 mr-3">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-card-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  variant={plan.buttonVariant} 
                  size="lg" 
                  className="w-full"
                    onClick={() => {
                        window.location.href='#contact'
                    }}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Barchasi 30 kunlik bepul sinov davri bilan
          </p>
          <p className="text-sm text-muted-foreground">
            Har qanday vaqtda bekor qilish mumkin • Kredit karta shart emas
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;