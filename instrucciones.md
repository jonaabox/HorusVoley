"Actúa como un Desarrollador Senior Fullstack. Necesito crear una aplicación web desde cero para una Academia de Vóley llamada 'Vóley Control'. La aplicación debe ser gratuita de mantener, por lo que usaremos Vite + React (JavaScript) para el frontend, Tailwind CSS para el diseño y Supabase para la base de datos y autenticación.

Estructura de la Base de Datos (Tablas en Supabase):

alumnos: id, nombre_completo, fecha_nacimiento, telefono, fecha_inscripcion, estado (activo/inactivo).

pagos: id, alumno_id (FK), monto, fecha_pago, mes_correspondiente, año_correspondiente.

cuotas: id, alumno_id (FK), fecha_vencimiento, estado_pago (pendiente/pagado).

Requerimientos de la Interfaz (Dashboard):

Login: Pantalla de acceso con correo y contraseña usando Supabase Auth.

Layout Principal: Sidebar con navegación (Inicio, Alumnos, Pagos, Reportes).

Módulo Alumnos: - Tabla con lista completa.

Buscador por nombre.

Formulario en un Modal para 'Crear Alumno'.

Botones para Editar y Eliminar.

Dashboard / Inicio:

Tarjetas con: Total de alumnos, Ingresos del mes actual, Alumnos con cuotas vencidas.

Sistema de Alertas: Lista de alumnos cuya cuota vence en menos de 5 días (usar colores: rojo para vencido, amarillo para próximo).

Instrucciones Técnicas:

Usa lucide-react para los iconos.

Usa react-router-dom para la navegación.

El diseño debe ser limpio, profesional, responsivo y con colores inspirados en el deporte (azules, blancos y naranjas).

Implementa una función que compare la fecha actual con fecha_vencimiento para generar las alertas de cobro.

Por favor, genera primero la estructura de archivos sugerida y luego el código principal para los componentes de la tabla de alumnos y la conexión con Supabase."