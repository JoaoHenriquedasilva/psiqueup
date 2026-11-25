import {
    BadgeCheck,
    Calendar,
    ClipboardCheck,
    LayoutDashboard,
    UserCheck,
    Users,
} from 'lucide-react';
import type { DashboardNavItem } from '../components/DashboardShell';

export const PATIENT_NAV_ITEMS: DashboardNavItem[] = [
    { to: '/patient', label: 'Meu Acompanhamento', icon: UserCheck, end: true },
    { to: '/patient/sessions', label: 'Minhas Sessões', icon: Calendar },
];

export const PSYCHOLOGIST_NAV_ITEMS: DashboardNavItem[] = [
    { to: '/psychologist', label: 'Agenda & Sessões', icon: Calendar, end: true },
    { to: '/psychologist/patients', label: 'Meus Pacientes', icon: Users },
    { to: '/psychologist/profile', label: 'Perfil Profissional', icon: BadgeCheck },
];

export const ADMIN_NAV_ITEMS: DashboardNavItem[] = [
    { to: '/admin', label: 'Visão Geral', icon: LayoutDashboard, end: true },
    { to: '/admin/psychologists', label: 'Psicólogos & Triagem', icon: Users },
    { to: '/admin/sessions', label: 'Auditoria de Sessões', icon: ClipboardCheck },
];
