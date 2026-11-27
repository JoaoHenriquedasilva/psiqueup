import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthLoadingScreen } from './components/AuthLoadingScreen';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/useAuth';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminPsychologistsPage } from './pages/AdminPsychologistsPage';
import { AdminSessionsPage } from './pages/AdminSessionsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { PatientDashboard } from './pages/PatientDashboard';
import { PatientSessionsPage } from './pages/PatientSessionsPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { PsychologistDashboard } from './pages/PsychologistDashboard';
import { PsychologistPatientsPage } from './pages/PsychologistPatientsPage';
import { PsychologistProfilePage } from './pages/PsychologistProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { TermsOfUsePage } from './pages/TermsOfUsePage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { getHomeRouteByRole } from './utils/authRoutes';
import type { UserRole } from './types/api';

function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}) {
    const { user, isAuthenticated, isAuthLoading } = useAuth();

    if (isAuthLoading) {
        return <AuthLoadingScreen />;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={getHomeRouteByRole(user.role)} replace />;
    }

    return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, isAuthLoading } = useAuth();

    if (isAuthLoading) {
        return <AuthLoadingScreen />;
    }

    if (isAuthenticated && user) {
        return <Navigate to={getHomeRouteByRole(user.role)} replace />;
    }

    return <>{children}</>;
}

function FallbackRedirect() {
    const { user, isAuthenticated, isAuthLoading } = useAuth();

    if (isAuthLoading) {
        return <AuthLoadingScreen />;
    }

    if (isAuthenticated && user) {
        return <Navigate to={getHomeRouteByRole(user.role)} replace />;
    }

    return <Navigate to="/login" replace />;
}

export function App() {
    return (
        <ThemeProvider>
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
                        path="/forgot-password"
                        element={
                            <PublicOnlyRoute>
                                <ForgotPasswordPage />
                            </PublicOnlyRoute>
                        }
                    />
                    <Route
                        path="/reset-password"
                        element={
                            <PublicOnlyRoute>
                                <ResetPasswordPage />
                            </PublicOnlyRoute>
                        }
                    />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/terms" element={<TermsOfUsePage />} />

                    {/* Rotas do Psicólogo */}
                    <Route
                        path="/psychologist"
                        element={
                            <ProtectedRoute allowedRoles={['PSYCHOLOGIST']}>
                                <PsychologistDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/psychologist/patients"
                        element={
                            <ProtectedRoute allowedRoles={['PSYCHOLOGIST']}>
                                <PsychologistPatientsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/psychologist/profile"
                        element={
                            <ProtectedRoute allowedRoles={['PSYCHOLOGIST']}>
                                <PsychologistProfilePage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Rotas do Paciente */}
                    <Route
                        path="/patient"
                        element={
                            <ProtectedRoute allowedRoles={['PATIENT']}>
                                <PatientDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/patient/sessions"
                        element={
                            <ProtectedRoute allowedRoles={['PATIENT']}>
                                <PatientSessionsPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Rotas do Administrador */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/psychologists"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <AdminPsychologistsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/sessions"
                        element={
                            <ProtectedRoute allowedRoles={['ADMIN']}>
                                <AdminSessionsPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="*" element={<FallbackRedirect />} />
                </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
