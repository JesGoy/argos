'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import ChatPanel from './ChatPanel';

const MIN_PANEL_PERCENTAGE = 10;
const MAX_PANEL_PERCENTAGE = 75;
const MIN_CONTENT_PERCENTAGE = 20;
const DEFAULT_PANEL_PERCENTAGE = 50;

const getPageContext = (pathname: string): { name: string; description: string } => {
  if (pathname?.includes('/products')) {
    return {
      name: 'Productos',
      description: 'Gestión de productos del inventario',
    };
  }
  if (pathname?.includes('/ai-assistant')) {
    return {
      name: 'Asistente IA',
      description: 'Panel de asistente conversacional',
    };
  }
  if (pathname?.includes('/dashboard')) {
    return {
      name: 'Dashboard',
      description: 'Panel principal del sistema',
    };
  }
  return {
    name: 'Página',
    description: 'Navegando en la aplicación',
  };
};

interface LayoutWrapperProps {
  children: ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPercentage, setPanelPercentage] = useState(DEFAULT_PANEL_PERCENTAGE);
  const [isDragging, setIsDragging] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const pageContext = getPageContext(pathname);

  const isAuthRoute = pathname?.includes('/login') || pathname?.includes('/register');

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPercentage = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      
      if (newPercentage < MIN_PANEL_PERCENTAGE) {
        setIsOpen(false);
        setIsDragging(false);
        return;
      }
      
      const contentPercentage = 100 - newPercentage;
      const isValidWidth = 
        newPercentage >= MIN_PANEL_PERCENTAGE && 
        newPercentage <= MAX_PANEL_PERCENTAGE &&
        contentPercentage >= MIN_CONTENT_PERCENTAGE;
      
      if (isValidWidth) {
        setPanelPercentage(newPercentage);
      } else if (newPercentage > MAX_PANEL_PERCENTAGE) {
        setPanelPercentage(MAX_PANEL_PERCENTAGE);
      } else if (contentPercentage < MIN_CONTENT_PERCENTAGE) {
        setPanelPercentage(100 - MIN_CONTENT_PERCENTAGE);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <div 
        className="flex-1 overflow-auto bg-white"
        style={{
          minWidth: `${MIN_CONTENT_PERCENTAGE}%`,
          flex: isOpen ? `${100 - panelPercentage}` : 1,
        }}
      >
        {children}
      </div>

      {isOpen && (
        <>
          <div
            ref={resizeRef}
            onMouseDown={() => setIsDragging(true)}
            className={`w-1 hover:w-1.5 bg-gray-300 hover:bg-blue-500 cursor-col-resize transition-all ${
              isDragging ? 'bg-blue-500 w-1.5' : ''
            }`}
            style={{
              userSelect: 'none',
              padding: '0 4px',
              margin: '0 -4px',
            }}
          />

          <div
            className="bg-white border-l border-gray-200 flex flex-col"
            style={{ 
              width: `${panelPercentage}%`,
              minWidth: `${MIN_PANEL_PERCENTAGE}%`,
              maxWidth: `${MAX_PANEL_PERCENTAGE}%`,
            }}
          >
            <ChatPanel
              isOpen={isOpen}
              onToggle={() => setIsOpen(false)}
              pageContext={pageContext}
            />
          </div>
        </>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
          aria-label="Abrir asistente de IA"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="absolute bottom-16 right-0 bg-gray-900 text-white text-sm rounded px-3 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Asistente IA
          </span>
        </button>
      )}
    </div>
  );
}
