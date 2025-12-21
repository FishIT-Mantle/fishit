"use client"

import { useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

interface WalletSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function WalletSuccessModal({ isOpen, onClose }: WalletSuccessModalProps) {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); // Auto close after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            transition: {
                                type: "spring",
                                stiffness: 300,
                                damping: 25,
                                duration: 0.4
                            }
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.9,
                            y: 10,
                            transition: { duration: 0.2 }
                        }}
                        className="relative z-10 w-full max-w-sm rounded-[32px] overflow-hidden"
                    >
                        {/* Glass Container */}
                        <div className="relative p-8 flex flex-col items-center text-center bg-[#0F1738]/90 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(84,72,232,0.25)]">

                            {/* Inner Radial Gradient */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(84,72,232,0.15)_0%,transparent_70%)] pointer-events-none" />

                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{
                                    scale: 1,
                                    opacity: 1,
                                    transition: { delay: 0.1, duration: 0.4 }
                                }}
                                className="relative w-24 h-24 mb-6"
                            >
                                <Image
                                    src="/icons/modal-connected.webp"
                                    alt="Connected"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </motion.div>

                            {/* Text */}
                            <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: { delay: 0.2, duration: 0.4 }
                                }}
                                className="text-white text-lg font-medium tracking-wide"
                            >
                                Your Wallet Was Connected
                            </motion.h3>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
