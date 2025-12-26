import Link from 'next/link';
import { RegisterForm } from './RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Crear cuenta</h1>
          <p className="text-sm text-gray-600">Registra un nuevo usuario en Argos</p>
        </div>
        <RegisterForm />
        <p className="text-sm text-gray-600 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
