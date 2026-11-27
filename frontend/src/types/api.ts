export type UserRole = 'ADMIN' | 'PSYCHOLOGIST' | 'PATIENT';
export type LinkStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REVOKED';
export type SessionStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW' | 'DISPUTED';
export type ClinicPsychologistStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AuthResponse {
    name: string;
    email: string;
    role: UserRole;
}

export interface UserProfileResponse {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    active: boolean;
    createdAt: string;
}

export interface RegisterPendingVerificationResponse {
    message: string;
    email: string;
    verificationRequired: boolean;
}

export interface MessageResponse {
    message: string;
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

export interface PatientProfile {
    userId: number;
    name: string;
    email: string;
    cpfMasked: string | null;
    hasCpf: boolean;
}

export interface NeutralActionResponse {
    message: string;
}

export interface TherapeuticLink {
    id: number;
    psychologistId: number;
    psychologistName: string;
    psychologistCrp: string;
    approach: TherapeuticApproach;
    patientId: number | null;
    patientName: string | null;
    patientEmail: string | null;
    patientCpfMasked: string | null;
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

export interface ClinicLinkItem {
    id: number;
    clinicId: number;
    clinicName: string;
    clinicCnpj: string;
    psychologistId: number;
    psychologistName: string;
    psychologistEmail: string;
    psychologistCrp: string;
    approachName: string;
    status: ClinicPsychologistStatus;
    createdAt: string;
    updatedAt: string;
}