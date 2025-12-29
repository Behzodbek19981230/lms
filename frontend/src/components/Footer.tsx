import { BookOpen, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">EduOne</span>
            </div>
            <p className="text-background/80 leading-relaxed">
              O'quv markazlari uchun zamonaviy e-learning SaaS platformasi. 
              Ta'limni raqamlashtiring va samaradorlikni oshiring.
            </p>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:behzodrasulov432@gmail.com" className="text-background/80" >info@EduOne.uz</a>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary" />
                <a href="tel:+998930013098" className="text-background/80">+998 930013098</a>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-background/80">Toshkent, O'zbekiston</span>
              </div>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-background">Mahsulot</h3>
            <ul className="space-y-3">
              <li><a href="#features" className="text-background/80 hover:text-background transition-colors">Xususiyatlar</a></li>
              <li><a href="#pricing" className="text-background/80 hover:text-background transition-colors">Narxlar</a></li>
              <li><a href="#demo" className="text-background/80 hover:text-background transition-colors">Demo</a></li>
              <li><a href="#api" className="text-background/80 hover:text-background transition-colors">API</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-background">Qo'llab-quvvatlash</h3>
            <ul className="space-y-3">
              <li><a href="#help" className="text-background/80 hover:text-background transition-colors">Yordam markazi</a></li>
              <li><a href="#docs" className="text-background/80 hover:text-background transition-colors">Hujjatlar</a></li>
              <li><a href="#contact" className="text-background/80 hover:text-background transition-colors">Aloqa</a></li>
              <li><a href="#training" className="text-background/80 hover:text-background transition-colors">O'qitish</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-background">Kompaniya</h3>
            <ul className="space-y-3">
              <li><a href="#about" className="text-background/80 hover:text-background transition-colors">Biz haqimizda</a></li>
              <li><a href="#blog" className="text-background/80 hover:text-background transition-colors">Blog</a></li>
              <li><a href="#careers" className="text-background/80 hover:text-background transition-colors">Karyera</a></li>
              <li><a href="#news" className="text-background/80 hover:text-background transition-colors">Yangiliklar</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-background/60 text-sm">
              © 2024 EduOne. Barcha huquqlar himoyalangan.
            </p>
           
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;