import Link from 'next/link';
import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    href?: string;
    children: ReactNode;
}

export function Button({
    variant = 'primary',
    className = '',
    href,
    children,
    ...props
}: ButtonProps) {
    const baseStyles = "relative inline-flex items-center justify-center h-[56px] px-8 rounded-full text-[18px] font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-[#4F46E5] hover:bg-[#4338ca] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-white/10 hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all duration-300 ease-out",
        secondary: "bg-white/5 hover:bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm hover:ring-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:scale-105 active:scale-95 transition-all duration-300 ease-out",
    };

    const combinedClassName = `${baseStyles} ${variants[variant]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={combinedClassName}>
                {children}
            </Link>
        );
    }

    return (
        <button className={combinedClassName} {...props}>
            {children}
        </button>
    );
}
