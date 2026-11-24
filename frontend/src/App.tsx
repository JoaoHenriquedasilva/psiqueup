import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminDashboard } from './pages/AdminDashboard';
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
                                <AdminDashboard />
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