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
        primary: "bg-[#4F46E5] hover:bg-[#4338ca] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] ring-1 ring-white/10",
        secondary: "bg-white/5 hover:bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm",
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
