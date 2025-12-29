import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Phone, User, Send, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { request } from '@/configs/request';
import { toast } from '@/hooks/use-toast';

const TELEGRAM_USERNAME = '@bek12_98';

const ContactUs: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
    await request.post('/contacts', form);
            setSuccess(true);
            setForm({ name: '', phone: '', message: '' });
            toast({
              title: 'Muvaffaqiyat',
              description: 'Xabaringiz muvaffaqiyatli yuborildi!',
            });

       
    } catch {
        setError('Xabar yuborishda xatolik yuz berdi. Iltimos, qayta urinib ko\'ring.');
    }
    setLoading(false);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-slate-100" id='contact'>
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary to-primary/80 rounded-full mb-4 shadow-lg">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-4">
              Biz bilan bog'laning
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Savollaringiz bormi? Bizga xabar yuboring yoki Telegram orqali bog'laning
            </p>
          </div>

          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-semibold text-foreground">Xabar yuborish</CardTitle>
              <CardDescription>
                Biz sizning xabaringizni tez orada ko'rib chiqamiz
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Ism Familiya
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Masalan: Ali Valiyev"
                    required
                    className="h-12 border-2 border-slate-200 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    Telefon raqam
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+998 90 123 45 67"
                    required
                    className="h-12 border-2 border-slate-200 focus:border-primary transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Xabaringiz
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Savolingiz yoki xabaringizni yozing..."
                    required
                    rows={5}
                    className="border-2 border-slate-200 focus:border-primary transition-colors resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Yuborilmoqda...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Xabar yuborish
                    </div>
                  )}
                </Button>

                {success && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span>Xabar muvaffaqiyatli yuborildi! Tez orada siz bilan bog'lanamiz.</span>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-muted-foreground font-medium">yoki</span>
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-muted-foreground">Tezroq javob olish uchun Telegram orqali bog'laning</p>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-8 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 hover:scale-[1.02] group"
                >
                  <a
                    href={`https://t.me/${TELEGRAM_USERNAME.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3"
                  >
                    <MessageCircle className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-blue-600">Telegram</span>
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
