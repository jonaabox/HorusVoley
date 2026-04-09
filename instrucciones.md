Sistema de Logging y Observabilidad para CRM
"Actúa como un Principal Fullstack Developer. Necesito implementar un Sistema de Logging y Monitoreo de Errores para mi CRM de Vóley que ya utiliza Supabase y React.

Objetivo: Crear una infraestructura que capture errores en el frontend y los almacene en la base de datos para auditoría, además de una interfaz administrativa para visualizarlos.

Requerimientos Técnicos:

Esquema de Base de Datos (SQL): Genera el script para una tabla app_logs con: id (uuid), created_at, level (info, warning, error, critical), module (donde ocurrió), message, user_id y un campo metadata de tipo JSONB.

Servicio de Logger (Frontend):

Crea un archivo logger.js que centralice los logs.

Debe permitir enviar logs a la consola en desarrollo y guardarlos en Supabase solo si el nivel es 'warning' o superior.

Debe capturar automáticamente el stack trace si se le pasa un objeto de error.

Componente de Visualización (Admin Log Viewer):

Crea un componente de React que sea una tabla profesional para el administrador.

Filtros: Por nivel (dropdown multi-select) y por módulo.

Visualización de JSON: Usa un formato legible para la columna metadata.

Estilos: Usa Tailwind CSS. Los errores deben resaltar con fondo rojo suave y los warnings con naranja.

Seguridad y Optimización:

Incluye la configuración de Row Level Security (RLS) en SQL para que solo los administradores puedan leer la tabla.

Crea una función básica de limpieza (Clean-up) que simule borrar registros antiguos.

Estructura del código:

Usa lucide-react para iconos de alerta y error.

Provee un ejemplo de cómo envolver la aplicación en un ErrorBoundary global que use este nuevo sistema de logger para capturar 'Crashes' inesperados."

Tips de Senior Developer para aplicar este prompt:
ErrorBoundary: Cuando la IA te entregue el código, presta especial atención al ErrorBoundary. Es un componente de React que "ataja" los errores de toda la app para que la pantalla no se ponga en blanco. Es vital para la experiencia del usuario.

Uso de JSONB: La columna metadata en Supabase es superpoderosa. Puedes guardar ahí desde el modelo de celular del usuario hasta el estado exacto de la variable que falló.

No satures la DB: Asegúrate de que el logger no guarde "info" (como 'usuario abrió página x') en la base de datos, o llenarás tu cuota gratuita de Supabase muy rápido. Solo guarda lo que realmente necesites investigar (errores y alertas).