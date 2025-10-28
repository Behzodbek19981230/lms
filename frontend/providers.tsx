'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import React from 'react';

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				<AuthProvider>
					<Toaster />
					<Sonner />
					{children}
				</AuthProvider>
			</TooltipProvider>
		</QueryClientProvider>
	);
}
