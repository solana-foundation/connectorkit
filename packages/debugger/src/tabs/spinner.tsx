interface SpinnerProps {
    size?: number;
    className?: string;
}

export const Spinner = ({ size = 24, className = '' }: SpinnerProps) => {
    return (
        <svg
            className={`spinner text-neutral-300 ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            width={size}
            height={size}
        >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
            <style>{`
        @keyframes spinnerSpringIn {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            opacity: 1;
          }
          70% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes spinnerRotate {
          0% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.02) rotate(90deg);
          }
          50% {
            transform: scale(1) rotate(180deg);
          }
          75% {
            transform: scale(1.02) rotate(270deg);
          }
          100% {
            transform: scale(1) rotate(360deg);
          }
        }

        .spinner {
          animation: 
            spinnerSpringIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            spinnerRotate 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s infinite;
        }
      `}</style>
        </svg>
    );
};
