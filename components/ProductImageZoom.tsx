import React, { useState, useRef, useEffect } from 'react';

interface ProductImageZoomProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export const ProductImageZoom: React.FC<ProductImageZoomProps> = ({
  src,
  alt,
  className = 'h-full w-full object-cover rounded-md',
  containerClassName = 'relative inline-block',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Se não houver imagem, não aplica efeito de zoom
  if (!src) {
    return null;
  }

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const zoomWidth = 280;
      const zoomHeight = 280;
      
      // Tenta posicionar à direita; se não couber, posiciona à esquerda
      let left = rect.right + 12;
      if (left + zoomWidth > window.innerWidth - 16) {
        left = Math.max(16, rect.left - zoomWidth - 12);
      }

      // Centraliza verticalmente em relação ao item com limites de viewport
      let top = rect.top + (rect.height / 2) - (zoomHeight / 2);
      if (top < 16) top = 16;
      if (top + zoomHeight > window.innerHeight - 16) {
        top = Math.max(16, window.innerHeight - zoomHeight - 16);
      }

      setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updateCoords();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked((prev) => !prev);
  };

  const handleCloseLightbox = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsClicked(false);
  };

  // Fecha no ESC quando estiver em modo clique/lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isClicked) {
        setIsClicked(false);
      }
    };
    if (isClicked) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isClicked]);

  return (
    <>
      {/* Container da miniatura */}
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className={`${containerClassName} cursor-pointer cursor-zoom-in group select-none`}
        title="Passe o mouse ou clique para ampliar a foto do produto"
      >
        <img
          src={src}
          alt={alt}
          className={`${className} transition-transform duration-200 group-hover:scale-105`}
        />
        
        {/* Ícone de zoom discreto no canto */}
        <div className="absolute bottom-1 right-1 p-1 bg-black/60 backdrop-blur-xs text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </div>
      </div>

      {/* Ampliação flutuante ao passar o mouse (Hover) - Não bloqueia cliques externos */}
      {isHovered && !isClicked && coords && (
        <div
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 9999,
          }}
          className="pointer-events-none w-64 h-64 sm:w-72 sm:h-72 bg-white rounded-2xl shadow-2xl border-2 border-white ring-4 ring-black/10 p-2 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-xl bg-slate-50">
            <img
              src={src}
              alt={alt}
              className="max-h-full max-w-full object-contain drop-shadow-sm"
            />
          </div>
          <div className="mt-1.5 px-2 py-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium rounded-full truncate max-w-[90%] text-center">
            {alt} • <span className="text-blue-300">Clique para fixar</span>
          </div>
        </div>
      )}

      {/* Ampliação travada em modal / lightbox ao clicar */}
      {isClicked && (
        <div
          onClick={handleCloseLightbox}
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={handleCloseLightbox}
            className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 max-w-xl w-full max-h-[90vh] flex flex-col items-center animate-in zoom-in-95 duration-200 relative"
          >
            {/* Botão de Fechar */}
            <button
              type="button"
              onClick={handleCloseLightbox}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors z-10"
              title="Clique para fechar (ou Esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Imagem Ampliada */}
            <div className="w-full flex-1 flex items-center justify-center min-h-[250px] max-h-[70vh] bg-slate-50 rounded-xl overflow-hidden p-2">
              <img
                src={src}
                alt={alt}
                className="max-h-[65vh] max-w-full object-contain rounded-lg drop-shadow"
              />
            </div>

            {/* Informações no rodapé do modal */}
            <div className="mt-3 text-center">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">{alt}</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique novamente na foto ou em qualquer lugar da tela para fechar
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
