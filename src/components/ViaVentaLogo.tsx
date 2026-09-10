import React from 'react';

interface ViaVentaLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
}

export const ViaVentaLogo: React.FC<ViaVentaLogoProps> = ({
  size = 'md',
  showTagline = false,
  theme = 'light',
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const titleSize = {
    sm: 'text-sm font-bold tracking-tight',
    md: 'text-lg font-bold tracking-tight',
    lg: 'text-xl sm:text-2xl font-bold tracking-tight',
  }[size];

  const taglineSize = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-xs sm:text-sm',
  }[size];

  const isLight = theme === 'light';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Icono Minimalista de Ruta y Ubicación en Azul Vía (#2563EB) */}
      <div
        className={`${iconDimensions} rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0 relative overflow-hidden`}
        title="ViaVenta"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5/6 h-5/6 text-white"
        >
          {/* Ruta punteada conectada a pin de ubicación con flecha ascendente de venta */}
          <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
          <path d="M10 9l2 2 4-4" />
        </svg>
      </div>

      <div className="flex flex-col leading-tight">
        <div className="flex items-center">
          <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'} ${titleSize}`}>
            Via<span className="text-blue-600">Venta</span>
          </span>
        </div>
        {showTagline && (
          <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-medium ${taglineSize}`}>
            Ruteo inteligente y ventas en calle
          </span>
        )}
      </div>
    </div>
  );
};

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);
