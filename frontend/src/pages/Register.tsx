import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {BookOpen, Eye, EyeOff, Lock, Mail, Phone, User} from "lucide-react";
import {Link} from "react-router-dom";
import {useToast} from "@/hooks/use-toast.ts";
import {request} from "@/configs/request.ts";

const Register = () => {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        phone: "",
        role: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const {toast} = useToast();

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (formData.password !== formData.confirmPassword) {

            toast({
                title: "Xatolik",
                description: "Parollar mos kelmaydi. Iltimos, qayta urinib ko'ring.",
                variant: "destructive",
            });

            setIsLoading(false);
            return;
        }
        try {
            const {data: response} = await request.post('/auth/register', {
                email: formData.email,
                password: formData.password,
                firstName: formData.full_name,
                lastName: '',
                phone: formData.phone,
                role: formData.role
            })
            console.log("Ro'yxatdan o'tish muvaffaqiyatli:", response);
            toast({
                title: "Ro'yxatdan o'tish muvaffaqiyatli!",
                description: "Hisobingiz muvaffaqiyatli yaratildi. Iltimos, tizimga kiring.",
                variant: "success",
            });
            setIsLoading(false);
            // Redirect to login page after successful registration
            window.location.href = "/login";
        } catch (error) {
            console.error("Ro'yxatdan o'tishda xatolik:", error);
            toast({
                title: "Xatolik",
                description: "Ro'yxatdan o'tishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }


    };

    return (
        <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-gradient-primary rounded-xl">
                            <BookOpen className="h-8 w-8 text-primary-foreground"/>
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-2">EduNimbus</h1>
                    <p className="text-muted-foreground">Ro'yxatdan o'tish</p>
                </div>

                {/* Register Card */}
                <Card className="shadow-elegant border-border">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center text-card-foreground">
                            Yangi hisob yarating
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name" className="text-card-foreground">
                                    To'liq ism
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        id="full_name"
                                        type="text"
                                        placeholder="Ismingiz Familiyangiz"
                                        value={formData.full_name}
                                        onChange={(e) => handleInputChange("full_name", e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-card-foreground">
                                    Email manzil
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="email@misol.uz"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange("email", e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-card-foreground">
                                    Telefon raqam
                                </Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+998 90 123 45 67"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange("phone", e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role" className="text-card-foreground">
                                    Rol
                                </Label>
                                <Select value={formData.role}
                                        onValueChange={(value) => handleInputChange("role", value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Rolingizni tanlang"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">O'quv markazi egasi</SelectItem>
                                        <SelectItem value="teacher">O'qituvchi</SelectItem>
                                        <SelectItem value="student">O'quvchi</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-card-foreground">
                                    Parol
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => handleInputChange("password", e.target.value)}
                                        className="pl-10 pr-10"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-card-foreground">
                                    Parolni tasdiqlang
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                                        className="pl-10"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                variant="hero"
                                size="lg"
                                className="w-full"
                                disabled={isLoading}
                            >
                                {isLoading ? "Yaratilmoqda..." : "Hisob yaratish"}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                Allaqachon hisobingiz bormi?{" "}
                                <Link
                                    to="/login"
                                    className="text-primary hover:text-primary-glow font-medium transition-colors"
                                >
                                    Kirish
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Back to home */}
                <div className="text-center mt-6">
                    <Link
                        to="/"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← Bosh sahifaga qaytish
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;