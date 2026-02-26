'use client';

import { useState, useEffect } from 'react';

type ModalType = 'eliminar' | 'confirmar' | 'editar';

interface ConfirmModalProps {
  isOpen: boolean;
  mensaje: string;
  tipo: ModalType;
  onAceptar: () => void | Promise<void>;
  onCancelar: () => void;
  textoAceptar?: string;
  textoCancelar?: string;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  mensaje,
  tipo,
  onAceptar,
  onCancelar,
  textoAceptar,
  textoCancelar = 'Cancelar',
  isLoading = false,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) {
    return null;
  }

  // Configuración según el tipo de modal
  const typeConfig = {
    eliminar: {
      titulo: 'Eliminar',
      botonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      textoBoton: textoAceptar || 'Eliminar',
      icono: '🗑️',
    },
    confirmar: {
      titulo: 'Confirmar',
      botonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      textoBoton: textoAceptar || 'Confirmar',
      icono: '⚠️',
    },
    editar: {
      titulo: 'Editar',
      botonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      textoBoton: textoAceptar || 'Guardar',
      icono: '✏️',
    },
  };

  const config = typeConfig[tipo];

  const handleAceptar = async () => {
    setLoading(true);
    try {
      await onAceptar();
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onCancelar();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
          <span className="text-2xl">{config.icono}</span>
          <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
            {config.titulo}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-gray-700 text-base">{mensaje}</p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
          <button
            onClick={onCancelar}
            disabled={loading || isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {textoCancelar}
          </button>
          <button
            onClick={handleAceptar}
            disabled={loading || isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${config.botonColor}`}
          >
            {loading || isLoading ? 'Procesando...' : config.textoBoton}
          </button>
        </div>
      </div>
    </div>
  );
}
