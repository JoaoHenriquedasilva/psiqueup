export type UserRole = 'ADMIN' | 'PSYCHOLOGIST' | 'PATIENT';
export type LinkStatus = 'ACTIVE' | 'REJECTED';
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW' | 'DISPUTED';

export interface AuthResponse {
    token: string;
    type: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface TherapeuticApproach {
    id: number;
    name: string;
    patientFriendlyDescription: string;
}

export interface PsychologistProfile {
    userId: number;
    name: string;
    email: string;
    crp: string;
    approach: TherapeuticApproach;
    bio: string | null;
}

export interface TherapeuticLink {
    id: number;
    psychologistId: number;
    psychologistName: string;
    psychologistCrp: string;
    approach: TherapeuticApproach;
    patientId: number;
    patientName: string;
    patientEmail: string;
    status: LinkStatus;
    rejectionReason: string | null;
    createdAt: string;
}

export interface SessionItem {
    id: number;
    psychologistId: number;
    psychologistName: string;
    patientId: number;
    patientName: string;
    startTime: string;
    endTime: string;
    status: SessionStatus;
    createdAt: string;
}

export interface ApiErrorResponse {
    timestamp: string;
    status: number;
    error: string;
    message: string;
    path: string;
    fieldErrors?: Record<string, string>;
}

export interface AdminDashboardMetrics {
    activePsychologists: number;
    inactivePsychologists: number;
    totalPatients: number;
    activeLinks: number;
    averagePatientsPerPsychologist: number;
    scheduledSessions: number;
    completedSessions: number;
    noShowSessions: number;
    canceledSessions: number;
    disputedSessions: number;
}

export interface AdminPsychologistItem {
    userId: number;
    name: string;
    email: string;
    active: boolean;
    crp: string | null;
    approachName: string | null;
    bio: string | null;
    activePatientsCount: number;
    totalSessionsCount: number;
    disputedSessionsCount: number;
}