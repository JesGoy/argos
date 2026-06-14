'use client';

import { useTransition, useState } from 'react';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_STATUS,
  USER_STATUS_LABELS,
  type UserRole,
  type UserStatus,
} from '@/core/domain/constants/UserConstants';
import { changeUserRoleAction, setUserStatusAction } from './actions';

export interface UserRow {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

interface Props {
  users: UserRow[];
  currentUserId: string;
}

export function UserList({ users, currentUserId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleChange = (userId: string, newRole: UserRole) => {
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      const result = await changeUserRoleAction(userId, newRole);
      if (result.error) setError(result.error);
      setPendingId(null);
    });
  };

  const handleToggleStatus = (userId: string, current: UserStatus) => {
    const next =
      current === USER_STATUS.ACTIVE ? USER_STATUS.SUSPENDED : USER_STATUS.ACTIVE;
    setError(null);
    setPendingId(userId);
    startTransition(async () => {
      const result = await setUserStatusAction(userId, next);
      if (result.error) setError(result.error);
      setPendingId(null);
    });
  };

  if (users.length === 0) {
    return <p className="text-sm text-gray-500">No hay usuarios en esta organización.</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2">Usuario</th>
            <th className="py-2">Email</th>
            <th className="py-2">Rol</th>
            <th className="py-2">Estado</th>
            <th className="py-2">Creado</th>
            <th className="py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const disabled = pending && pendingId === u.id;
            return (
              <tr key={u.id} className="border-t">
                <td className="py-2">
                  <div className="font-medium text-gray-900">{u.username}</div>
                  {u.fullName && <div className="text-xs text-gray-500">{u.fullName}</div>}
                </td>
                <td className="py-2 text-gray-700">{u.email}</td>
                <td className="py-2">
                  <select
                    value={u.role}
                    disabled={disabled || isSelf}
                    onChange={(e) => handleChange(u.id, e.target.value as UserRole)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {USER_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  {isSelf && (
                    <span className="ml-2 text-xs text-gray-500">(tú)</span>
                  )}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === USER_STATUS.ACTIVE
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {USER_STATUS_LABELS[u.status]}
                  </span>
                </td>
                <td className="py-2 text-gray-600">{u.createdAt}</td>
                <td className="py-2">
                  {isSelf ? (
                    <span className="text-xs text-gray-400">—</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u.id, u.status)}
                      disabled={disabled}
                      className={`text-sm font-medium disabled:opacity-50 ${
                        u.status === USER_STATUS.ACTIVE
                          ? 'text-red-600 hover:text-red-800'
                          : 'text-green-600 hover:text-green-800'
                      }`}
                    >
                      {u.status === USER_STATUS.ACTIVE ? 'Suspender' : 'Reactivar'}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
