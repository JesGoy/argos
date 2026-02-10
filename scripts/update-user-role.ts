/**
 * Script para actualizar el rol de un usuario
 * Uso: ts-node scripts/update-user-role.ts <username> <role>
 */

import { getDb } from '@/infra/db/client';
import { userTable } from '@/infra/db/schema';
import { eq } from 'drizzle-orm';

const validRoles = ['admin', 'warehouse_manager', 'operator', 'viewer'] as const;

async function updateUserRole(username: string, role: typeof validRoles[number]) {
  if (!validRoles.includes(role)) {
    console.error(`❌ Rol inválido. Debe ser uno de: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  const db = getDb();

  try {
    // Verificar que el usuario existe
    const [user] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1);

    if (!user) {
      console.error(`❌ Usuario '${username}' no encontrado`);
      process.exit(1);
    }

    console.log(`📝 Usuario actual:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol actual: ${user.role}`);
    console.log(`   Nuevo rol: ${role}`);

    // Actualizar el rol
    await db
      .update(userTable)
      .set({ role })
      .where(eq(userTable.username, username));

    console.log(`✅ Rol actualizado exitosamente a '${role}'`);
  } catch (error) {
    console.error('❌ Error al actualizar rol:', error);
    process.exit(1);
  }
}

// Obtener argumentos de línea de comandos
const [,, username, role] = process.argv;

if (!username || !role) {
  console.log('Uso: ts-node scripts/update-user-role.ts <username> <role>');
  console.log('');
  console.log('Roles disponibles:');
  console.log('  - admin: Acceso completo');
  console.log('  - warehouse_manager: Gestión de inventario y ventas');
  console.log('  - operator: Operaciones de venta y productos');
  console.log('  - viewer: Solo lectura');
  process.exit(1);
}

updateUserRole(username, role as any);
