import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
          <p className="text-sm text-gray-600">Accede al panel de inventario Argos</p>
        </div>
        <LoginForm />
        <p className="text-sm text-gray-600 text-center">
          ¿No tienes cuenta?{' '}
          <a href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
}
