import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad · Argos',
};

const LAST_UPDATED = '14 de junio de 2026';

/**
 * Plantilla de Política de Privacidad. Punto de partida para el MVP; debe ser
 * revisada por asesoría legal y adaptada a la jurisdicción aplicable.
 */
export default function PrivacyPage() {
  return (
    <>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad</h1>
        <p className="text-sm text-gray-500">Última actualización: {LAST_UPDATED}</p>
      </header>

      <p className="text-gray-700">
        Esta Política describe cómo Argos recopila, usa y protege los datos personales en relación
        con el uso del Servicio. Buscamos recopilar el mínimo necesario para operar.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">1. Datos que recopilamos</h2>
        <ul className="list-disc space-y-1 pl-6 text-gray-700">
          <li>
            <span className="font-medium">Datos de cuenta:</span> nombre de usuario, correo
            electrónico, nombre y rol dentro de la organización.
          </li>
          <li>
            <span className="font-medium">Datos de negocio:</span> productos, ventas, inventario,
            clientes, proveedores y mermas que cargas en la plataforma.
          </li>
          <li>
            <span className="font-medium">Datos de uso:</span> registros técnicos, métricas de uso
            del asistente de IA (tokens y costo estimado) y datos de seguridad.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">2. Cómo usamos los datos</h2>
        <p className="text-gray-700">
          Usamos los datos para prestar y mejorar el Servicio, aplicar los límites del plan, brindar
          soporte, garantizar la seguridad y cumplir obligaciones legales. No vendemos datos
          personales.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">3. Asistente de IA y terceros</h2>
        <p className="text-gray-700">
          Para las funciones de IA, ciertos contenidos de tus consultas pueden procesarse mediante
          proveedores de modelos de lenguaje que actúan como encargados de tratamiento. Aplicamos
          medidas para limitar los datos compartidos a lo necesario para generar la respuesta.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">4. Aislamiento entre organizaciones</h2>
        <p className="text-gray-700">
          El Servicio es multi-inquilino: cada organización solo puede acceder a sus propios datos.
          El acceso está restringido por organización y por rol.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">5. Conservación</h2>
        <p className="text-gray-700">
          Conservamos los datos mientras tu cuenta esté activa y durante el tiempo necesario para
          cumplir fines legales o contables. Puedes solicitar la eliminación de tu cuenta y datos
          asociados.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">6. Tus derechos</h2>
        <p className="text-gray-700">
          Según la legislación aplicable, puedes solicitar acceso, rectificación, eliminación o
          portabilidad de tus datos personales, así como oponerte a ciertos tratamientos. Para
          ejercerlos, contáctanos.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">7. Seguridad</h2>
        <p className="text-gray-700">
          Aplicamos medidas técnicas y organizativas razonables (cifrado en tránsito, control de
          acceso por rol, hashing de contraseñas). Ningún sistema es 100% infalible, pero trabajamos
          para proteger tu información.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">8. Contacto</h2>
        <p className="text-gray-700">
          Para consultas sobre privacidad, escríbenos a{' '}
          <a href="mailto:privacidad@argos.app" className="text-blue-600 hover:underline">
            privacidad@argos.app
          </a>
          .
        </p>
      </section>
    </>
  );
}
