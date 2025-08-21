import {createContext, useContext, useEffect, useState} from 'react';
import {UserType} from "@/types/user.type.ts";
import {request} from "@/configs/request.ts";

const users: UserType[] = [
    {
        id: "1",
        name: "Admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        lastLogin: new Date(),
        email: "admin@edunimbus.uz",
        password: "admin123",
        role: "superadmin"
    },
    {
        id: "2",
        name: "Center Admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        lastLogin: new Date(),

        email: "center@demo.uz",
        password: "demo123",
        role: "admin"
    },
    {
        id: "3",
        name: "Teacher",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        lastLogin: new Date(),
        email: "teacher@demo.uz",
        password: "demo123",
        role: "teacher"
    },
    {
        id: "4",
        name: "Student",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        lastLogin: new Date(),

        email: "student@demo.uz",
        password: "demo123",
        role: "student"
    }
]


interface AuthContextType {
    user: UserType | null;
    login: (email: string, password: string) => Promise<UserType>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');

    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [user, setUser] = useState<UserType | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in from localStorage
        const storedUser = localStorage.getItem('edunimbus_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                localStorage.removeItem('edunimbus_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string): Promise<UserType> => {
        setIsLoading(true);

        // Mock authentication - simple validation
        if (email && password.length >= 6) {
            const {data} = await request.post('/auth/login', {
                email,
                password
            })
            console.log("Login response:", data);
            if (!data.access_token) {
                setIsLoading(false);
                return null;
            }
            localStorage.setItem('e_token', data.access_token); // Mock token for demonstration
            localStorage.setItem('edunimbus_user', JSON.stringify(data.user));

            setUser({
                ...data.user,
            });

            setIsLoading(false);
            return data.user;
        }

        setIsLoading(false);
        return null;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('edunimbus_user');
    };

    return (
        <AuthContext.Provider value={{user, login, logout, isLoading}}>
            {children}
        </AuthContext.Provider>
    );
};