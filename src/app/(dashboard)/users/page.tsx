import { requireRole } from '@/app/lib/auth';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { makeListOrganizationUsers } from '@/infra/container/auth';
import { UserList, type UserRow } from './UserList';
import { CreateUserForm } from './CreateUserForm';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const session = await requireRole([USER_ROLE.ADMIN]);
  const uc = makeListOrganizationUsers();
  const users = await uc.execute(session);

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    createdAt: u.createdAt.toISOString().slice(0, 10),
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-2 text-gray-600">
            Administra los miembros de tu organización y sus roles.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Agregar usuario</h2>
          <CreateUserForm />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <UserList users={rows} currentUserId={session.userId} />
        </div>
      </div>
    </div>
  );
}
