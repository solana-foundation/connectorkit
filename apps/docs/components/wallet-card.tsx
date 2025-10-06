import { motion } from "motion/react";
import { useEffect, useState } from 'react'
import { IconGamecontrollerFill } from "symbols-react";
import { MousePointerClick } from 'lucide-react'
import { CopyButton } from "./ui/copy-button";

    interface WalletCardProps {
    bgColor?: string;
    walletName?: string;
    ethValue?: string;
    onClick?: () => void;
    uniqueId?: string;
    address?: string;
    onDisconnect?: () => void;
    walletIcon?: string;
}

export function WalletCard({
    bgColor = "cyan-500",
    walletName = "GG Wallet",
    ethValue = "1337 SOL",
    onClick = () => {},
    uniqueId = "1",
    address,
    onDisconnect,
    walletIcon,
}: WalletCardProps) {
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
        if (!onDisconnect) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onDisconnect()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onDisconnect])

    return (
        <div className="flex flex-col items-center gap-2">
        <motion.div
            key={uniqueId}
            initial={{ scale: 0.7, translateY: 20 }}
            animate={{ scale: 1, translateY: 0 }}
            layoutId={`wallet-${uniqueId}`}
            transition={{
                scale: {
                    type: "spring",
                    stiffness: 200, 
                    damping: 18,     
                    mass: 1,         
                    velocity: 2       
                }
            }}
            className="flex cursor-crosshair flex-col items-start justify-between p-5 border-2 border-white/20 relative overflow-hidden"
            style={{
            height: "200px",
            width: "320px",
            borderRadius: 24,
            backgroundColor: bgColor,
            }}
        >
        {/* Repeating Logo Pattern Background */}
        {walletIcon && (
          <div 
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: `url(${walletIcon})`,
              backgroundSize: '28px 28px',
              backgroundRepeat: 'repeat',
              backgroundPosition: 'center',
              mixBlendMode: 'luminosity',
            }}
          />
        )}
        
        <motion.div className="flex w-full items-start justify-between relative z-10">
          <motion.div
            layoutId={`icon-${uniqueId}`}
            className="flex items-center justify-center rounded-full h-10 w-10"
            onClick={onClick}
          >
            {walletIcon && !imageError ? (
              <img 
                src={walletIcon} 
                alt={walletName || 'wallet'} 
                className="h-10 w-10 rounded-full"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="h-10 w-10 flex items-center justify-center">
                <svg className="h-10 w-10 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
              </div>
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
            whileTap={{ scale: 0.9 }}
            className="flex shrink-0 translate-x-0 text-white/80 hover:text-white translate-y-0 hover:border-white/10 border border-transparent rounded-full p-2 py-1 transition-all duration-300 ease-in-out"
          >
            {address ? (
              <CopyButton
                textToCopy={address}
                displayText={`${address.slice(0, 6)}...${address.slice(-5)}`}
                className="font-semibold text-white/80 hover:text-white gap-x-[6px] hover:scale-[0.95] transition-all duration-300 ease-in-out"
                iconClassName="h-4 w-4 text-white/50 group-hover:text-white/70"
                iconClassNameCheck="h-4 w-4 text-emerald-400"
              />
            ) : (
              <span className="font-semibold text-white cursor-default">MNG0g...69420</span>
            )}
          </motion.div>
        </motion.div>
        <div className="flex w-full items-end justify-between relative z-10">
          <div className="flex flex-col items-start justify-center">
            <motion.span
              layoutId={`walletName-${uniqueId}`}
              className="select-none text-xs font-semibold text-white"
            >
              {walletName}
            </motion.span>
            <span
              className="select-none text-lg font-semibold text-white/50"
            >
              {ethValue}
            </span>
          </div>
        </div>
      </motion.div>
      {onDisconnect && (
        <div className="text-[10px] text-gray-600 font-mono flex items-center gap-2">
          Hit <span className="font-bold inline-flex items-center rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-gray-700 hover:bg-gray-50 text-[10px]">ESC</span> or press
          <button
            type="button"
            onClick={onDisconnect}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-gray-700 hover:bg-gray-50 cursor-pointer hover:scale-125 active:scale-110 transition-all duration-300 ease-in-out"
            aria-label="Disconnect"
          >
            <MousePointerClick className="h-3.5 w-3.5" />
          </button>
          <span>here to disconnect.</span>
        </div>
      )}
      </div>
    );
  };