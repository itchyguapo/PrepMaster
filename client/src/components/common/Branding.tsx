import React from "react";

interface BrandingProps {
    className?: string;
    light?: boolean;
}

export function Branding({ className = "", light = false }: BrandingProps) {
    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            <span className={`text-[10px] uppercase tracking-widest font-medium ${light ? "text-white/50" : "text-muted-foreground/60"}`}>
                Powered by
            </span>
            <span className={`text-[11px] font-bold tracking-tight ${light ? "text-white/90" : "text-primary/80"}`}>
                BIG MACHINE ENT
            </span>
        </div>
    );
}
