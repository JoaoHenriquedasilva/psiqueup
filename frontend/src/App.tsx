import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PsychologistDashboard } from './pages/PsychologistDashboard';
import { PatientDashboard } from './pages/PatientDashboard';
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
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

function AdminPlaceholder() {
    const { user, logout } = useAuth();
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Painel do Administrador (Clínica)</h1>
                    <p className="text-sm text-slate-500">
                        Logado como <strong>{user?.name}</strong> ({user?.role})
                    </p>
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-200 cursor-pointer"
                >
                    Sair
                </button>
            </div>
        </div>
    );
}

export function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

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

                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;