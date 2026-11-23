import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardNavbar } from './components/DashboardNavbar';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PsychologistDashboard } from './pages/PsychologistDashboard';
import { PatientDashboard } from './pages/PatientDashboard';
import { getHomeRouteByRole } from './utils/authRoutes';
import type { UserRole } from './types/api';

function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}) {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={getHomeRouteByRole(user.role)} replace />;
    }

    return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();

    if (isAuthenticated && user) {
        return <Navigate to={getHomeRouteByRole(user.role)} replace />;
    }

    return <>{children}</>;
}

function FallbackRedirect() {
    const { user, isAuthenticated } = useAuth();

    if (isAuthenticated && user) {
        return <Navigate to={getHomeRouteByRole(user.role)} replace />;
    }

    return <Navigate to="/login" replace />;
}

function AdminPlaceholder() {
    const { user } = useAuth();
    return (
        <div className="min-h-screen bg-slate-50">
            <DashboardNavbar
                roleBadgeLabel="Administração"
                roleBadgeClassName="bg-amber-50 text-amber-700"
                maxWidthClassName="max-w-4xl"
            />
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h1 className="text-xl font-bold text-slate-900">Painel do Administrador (Clínica)</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Logado como <strong>{user?.name}</strong> ({user?.role})
                    </p>
                </div>
            </main>
        </div>
    );
}

export function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <PublicOnlyRoute>
                                <LoginPage />
                            </PublicOnlyRoute>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <PublicOnlyRoute>
                                <RegisterPage />
                            </PublicOnlyRoute>
                        }
                    />

                    <Route
                        path="/psychologist"
                        element={
                            <ProtectedRoute allowedRoles={['PSYCHOLOGIST']}>
                                <PsychologistDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/patient"
                        element={
                            <ProtectedRoute allowedRoles={['PATIENT']}>
                                <PatientDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <AdminPlaceholder />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="*" element={<FallbackRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;