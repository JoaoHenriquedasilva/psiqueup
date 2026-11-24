interface InitialsAvatarProps {
    name?: string | null;
    sizeClassName?: string;
    className?: string;
}

function extractInitials(name?: string | null): string {
    const clean = name?.trim();
    if (!clean) return 'PU';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Avatar circular com as iniciais do usuário ou profissional.
 */
export function InitialsAvatar({
    name,
    sizeClassName = 'h-9 w-9 text-xs',
    className = 'bg-primary-tint text-primary-ink border border-primary-tint-border',
}: InitialsAvatarProps) {
    return (
        <div
            aria-hidden="true"
            className={`${sizeClassName} ${className} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
        >
            {extractInitials(name)}
        </div>
    );
}
