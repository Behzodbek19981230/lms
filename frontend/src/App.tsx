import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import NotFound from './pages/NotFound';
import { ProtectedRoute } from '@/components/ProtectedRoute.tsx';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout.tsx';
import { AuthProvider } from '@/contexts/AuthContext.tsx';
import CreateTestPage from '@/pages/test/create.tsx';
import SubjectTests from '@/pages/test/subject-tests.tsx';
import TestQuestions from '@/pages/test/test-questions.tsx';
import Subjects from '@/pages/directory/Subjects.tsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import CenterAdminDashboard from './pages/CenterAdminDashboard';
import GroupsPage from './pages/Groups';
import ExamsPage from './pages/Exams';
import TeacherDashboard from './pages/TeacherDashboard';
import ExamDetail from './pages/exams/ExamDetail';
import ExamVariants from './pages/exams/ExamVariants';
import TestGeneratorPage from './pages/TestGeneratorPage';

const queryClient = new QueryClient();

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<AuthProvider>
				<Toaster />
				<Sonner />
				<BrowserRouter>
					<Routes>
						<Route path='/' element={<Index />} />
						<Route path='/login' element={<Login />} />
						<Route path='/register' element={<Register />} />

						{/* Dashboard routes */}
						<Route
							path='/account'
							element={
								<ProtectedRoute>
									<DashboardLayout />
								</ProtectedRoute>
							}
						>
							<Route path='superadmin' element={<SuperAdminDashboard />} />
							<Route path='admin' element={<CenterAdminDashboard />} />
							<Route path='teacher' element={<TeacherDashboard />} />
							<Route path='groups' element={<GroupsPage />} />
							<Route path='exams' element={<ExamsPage />} />
							<Route path='exams/:examId' element={<ExamDetail />} />
							<Route path='exams/:examId/variants' element={<ExamVariants />} />
							<Route path='test-generator' element={<TestGeneratorPage />} />
							<Route path='test/create' element={<CreateTestPage />} />
							<Route path='subject/:subjectId/tests' element={<SubjectTests />} />
							<Route path='test/:testId/questions' element={<TestQuestions />} />
							<Route path='subjects' element={<Subjects />} />
							<Route path='student' element={<StudentDashboard />} />
						</Route>

						<Route path='*' element={<NotFound />} />
					</Routes>
				</BrowserRouter>
			</AuthProvider>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
