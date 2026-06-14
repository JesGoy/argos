import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos de Servicio · Argos',
};

const LAST_UPDATED = '14 de junio de 2026';

/**
 * Plantilla de Términos de Servicio. Es un punto de partida razonable para el
 * MVP; debe ser revisada por asesoría legal antes de comercializar.
 */
export default function TermsPage() {
  return (
    <>
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900">Términos de Servicio</h1>
        <p className="text-sm text-gray-500">Última actualización: {LAST_UPDATED}</p>
      </header>

      <p className="text-gray-700">
        Estos Términos de Servicio (los &quot;Términos&quot;) regulan el acceso y uso de Argos
        (el &quot;Servicio&quot;), una plataforma de control de inventario y ventas con asistencia
        por IA. Al crear una cuenta o usar el Servicio, aceptas estos Términos.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">1. Cuentas y organizaciones</h2>
        <p className="text-gray-700">
          Para usar el Servicio debes crear una cuenta y una organización. Eres responsable de la
          veracidad de los datos entregados, de mantener la confidencialidad de tus credenciales y
          de toda la actividad realizada bajo tu cuenta. El primer usuario de una organización es su
          administrador y puede invitar a otros miembros según los límites de su plan.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">2. Planes y facturación</h2>
        <p className="text-gray-700">
          El Servicio ofrece planes con distintos límites (usuarios, productos y llamadas de IA por
          mes). Los planes de pago se facturan por adelantado y de forma recurrente. Puedes cambiar
          de plan en cualquier momento; los cambios de plan se aplican según se describe en la
          plataforma. No se realizan reembolsos por períodos parciales salvo que la ley aplicable lo
          exija.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">3. Uso aceptable</h2>
        <p className="text-gray-700">
          Te comprometes a no usar el Servicio para fines ilícitos, a no intentar vulnerar su
          seguridad, a no acceder a datos de otras organizaciones y a no sobrecargar la
          infraestructura. Podemos suspender cuentas que infrinjan estas reglas.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">4. Asistente de IA</h2>
        <p className="text-gray-700">
          El asistente de IA genera respuestas y sugerencias a partir de tus datos. Las acciones que
          modifican información (crear, eliminar, ajustar stock, registrar mermas) requieren tu
          confirmación explícita. Las sugerencias analíticas y predicciones son orientativas y no
          sustituyen tu criterio comercial.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">5. Tus datos</h2>
        <p className="text-gray-700">
          Conservas la titularidad de los datos que cargas. Nos otorgas una licencia limitada para
          procesarlos con el único fin de prestar el Servicio. El tratamiento de datos personales se
          rige por nuestra{' '}
          <a href="/legal/privacy" className="text-blue-600 hover:underline">
            Política de Privacidad
          </a>{' '}
          y, cuando corresponda, por el{' '}
          <a href="/legal/dpa" className="text-blue-600 hover:underline">
            Acuerdo de Tratamiento de Datos (DPA)
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">6. Disponibilidad y garantías</h2>
        <p className="text-gray-700">
          El Servicio se ofrece &quot;tal cual&quot; y &quot;según disponibilidad&quot;. Hacemos
          esfuerzos razonables por mantenerlo operativo, pero no garantizamos disponibilidad
          ininterrumpida ni la ausencia de errores.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">7. Limitación de responsabilidad</h2>
        <p className="text-gray-700">
          En la máxima medida permitida por la ley, no seremos responsables por daños indirectos,
          incidentales o lucro cesante derivados del uso o la imposibilidad de uso del Servicio.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">8. Cambios y contacto</h2>
        <p className="text-gray-700">
          Podemos actualizar estos Términos; los cambios relevantes se comunicarán por medios
          razonables. Para consultas, escríbenos a{' '}
          <a href="mailto:soporte@argos.app" className="text-blue-600 hover:underline">
            soporte@argos.app
          </a>
          .
        </p>
      </section>
    </>
  );
}
