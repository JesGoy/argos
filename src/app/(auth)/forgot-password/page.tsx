import { ForgotPasswordForm } from './ForgotPasswordForm';

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Recuperar contraseña</h1>
          <p className="text-sm text-gray-600">Te enviaremos un PIN de 6 dígitos al correo asociado.</p>
        </div>
        <ForgotPasswordForm />
        <p className="text-sm text-gray-600 text-center">
          Volver a{' '}
          <a href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}
