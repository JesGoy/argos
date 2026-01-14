# Chat Panel - Asistente IA Integrado

## Cómo Funciona

El panel lateral redimensionable se abre al hacer click en el botón azul (esquina inferior derecha).

```
┌─────────────────────────┬─────────────────┐
│  Contenido Principal    │  Chat Panel     │
│  (Productos, etc)       │  • Mensajes     │
│  Aún visible al 50%     │  • Input        │
│                         │  • Contexto     │
└─────────────────────────┴─────────────────┘
```

### Flujo
1. **Abre panel** → botón flotante desaparece
2. **Arrastra divisor** → ajusta el ancho (10-75%)
3. **Envía mensajes** → incluye contexto automático de la página
4. **Cierra** → click en X o arrastra < 10%

## Componentes

- **LayoutWrapper.tsx**: Orquestador del layout, resize y context detection
- **chatPanel.tsx**: Interfaz de chat con mensajes e input

## Configuración
- `MIN_PANEL_PERCENTAGE = 10%` (umbral auto-cierre)
- `MAX_PANEL_PERCENTAGE = 75%` (ancho máximo)  
- `MIN_CONTENT_PERCENTAGE = 20%` (ancho mínimo contenido)
- `DEFAULT_PANEL_PERCENTAGE = 50%` (abre al 50%)

## Características
✅ Redimensionable con porcentajes (responsive)  
✅ Detecta página actual automáticamente  
✅ Auto-cierre cuando se reduce < 10%  
✅ Movimiento instantáneo sin delays  
✅ No aparece en login/register  
✅ Integrado con sistema de IA

