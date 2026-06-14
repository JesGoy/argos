import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acuerdo de Tratamiento de Datos (DPA) · Argos',
};

const LAST_UPDATED = '14 de junio de 2026';

/**
 * Plantilla de DPA (Data Processing Agreement). Punto de partida para el MVP;
 * debe ser revisada por asesoría legal y, para clientes en la UE/EEE,
 * complementada con las Cláusulas Contractuales Tipo cuando corresponda.
 */
export default function DpaPage() {
  return (
    <>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">Acuerdo de Tratamiento de Datos</h1>
        <p className="text-sm text-gray-500">Última actualización: {LAST_UPDATED}</p>
      </header>

      <p className="text-gray-700">
        Este Acuerdo de Tratamiento de Datos (&quot;DPA&quot;) forma parte de los{' '}
        <a href="/legal/terms" className="text-blue-600 hover:underline">
          Términos de Servicio
        </a>{' '}
        y regula el tratamiento de datos personales que Argos (&quot;Encargado&quot;) realiza por
        cuenta de la organización cliente (&quot;Responsable&quot;) al usar el Servicio.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">1. Roles</h2>
        <p className="text-gray-700">
          El Responsable determina los fines y medios del tratamiento de los datos que carga. Argos
          actúa como Encargado y trata dichos datos únicamente conforme a las instrucciones
          documentadas del Responsable y a lo previsto en este DPA.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">2. Objeto y duración</h2>
        <p className="text-gray-700">
          El tratamiento tiene por objeto la prestación del Servicio y dura mientras esté vigente la
          relación contractual. A su término, los datos se eliminan o devuelven según la sección 7.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">3. Naturaleza de los datos</h2>
        <ul className="list-disc space-y-1 pl-6 text-gray-700">
          <li>
            <span className="font-medium">Categorías de interesados:</span> usuarios de la
            organización y, en su caso, clientes/contactos registrados.
          </li>
          <li>
            <span className="font-medium">Tipos de datos:</span> datos de identificación y contacto,
            credenciales (en forma cifrada/hash) y datos operativos del negocio.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">4. Obligaciones del Encargado</h2>
        <ul className="list-disc space-y-1 pl-6 text-gray-700">
          <li>Tratar los datos solo según instrucciones del Responsable.</li>
          <li>Garantizar la confidencialidad del personal autorizado.</li>
          <li>Aplicar medidas técnicas y organizativas de seguridad adecuadas.</li>
          <li>Asistir al Responsable ante solicitudes de los interesados y auditorías razonables.</li>
          <li>Notificar sin demora indebida las brechas de seguridad de las que tenga conocimiento.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">5. Subencargados</h2>
        <p className="text-gray-700">
          El Responsable autoriza el uso de subencargados (por ejemplo, proveedores de
          infraestructura en la nube y de modelos de IA) para prestar el Servicio. Argos impone a
          dichos subencargados obligaciones de protección de datos equivalentes a las de este DPA e
          informará de cambios relevantes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">6. Transferencias internacionales</h2>
        <p className="text-gray-700">
          Cuando el tratamiento implique transferencias fuera de la jurisdicción del Responsable, se
          aplicarán los mecanismos de transferencia exigidos por la normativa aplicable (por
          ejemplo, Cláusulas Contractuales Tipo para clientes en la UE/EEE).
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">7. Devolución y eliminación</h2>
        <p className="text-gray-700">
          A la finalización del Servicio, y a elección del Responsable, Argos eliminará o devolverá
          los datos personales, salvo obligación legal de conservación.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">8. Contacto</h2>
        <p className="text-gray-700">
          Para asuntos relativos a este DPA, escríbenos a{' '}
          <a href="mailto:privacidad@argos.app" className="text-blue-600 hover:underline">
            privacidad@argos.app
          </a>
          .
        </p>
      </section>
    </>
  );
}
