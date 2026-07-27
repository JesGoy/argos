'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/app/lib/auth';
import { USER_ROLE } from '@/core/domain/constants/UserConstants';
import { makeUpdateDteConfig, makeTestDteConnection } from '@/infra/container/dte';
import { updateDteConfigSchema } from '@/infra/validation/dte';
import { APP_ROUTE } from '@/config/routes';

export interface DteSettingsFormState {
  success?: boolean;
  error?: string;
}

export async function updateDteConfigAction(
  _prevState: DteSettingsFormState,
  formData: FormData
): Promise<DteSettingsFormState> {
  const session = await requireRole([USER_ROLE.ADMIN]);

  // Fiscal fields (and apiKey) only exist in the DOM when environment is
  // 'produccion' (see DteSettingsForm's conditional rendering) — in
  // 'certificacion', formData.get(...) returns null, which the schema's
  // `.optional()` does not accept, only undefined/''.
  const parsed = updateDteConfigSchema.safeParse({
    enabled: formData.get('enabled') === 'on',
    environment: formData.get('environment'),
    rutEmisor: formData.get('rutEmisor') || undefined,
    razonSocial: formData.get('razonSocial') || undefined,
    giro: formData.get('giro') || undefined,
    acteco: formData.get('acteco') || undefined,
    direccion: formData.get('direccion') || undefined,
    comuna: formData.get('comuna') || undefined,
    apiKey: formData.get('apiKey') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
  }

  try {
    await makeUpdateDteConfig(session.organizationId).execute({
      enabled: parsed.data.enabled,
      environment: parsed.data.environment,
      rutEmisor: parsed.data.rutEmisor || undefined,
      razonSocial: parsed.data.razonSocial || undefined,
      giro: parsed.data.giro || undefined,
      acteco: parsed.data.acteco || undefined,
      direccion: parsed.data.direccion || undefined,
      comuna: parsed.data.comuna || undefined,
      apiKey: parsed.data.apiKey || undefined,
    });
    revalidatePath(APP_ROUTE.DTE);
    return { success: true };
  } catch {
    return { error: 'Error al guardar la configuración de boleta electrónica' };
  }
}

export interface TestDteConnectionState {
  status: 'success' | 'error';
  folio?: number;
  pdfBase64?: string;
  error?: string;
}

/**
 * Always exercises Openfactura's public sandbox (see TestDteConnection) —
 * never the organization's real production config — so this is safe to call
 * regardless of what's currently saved or being typed in the form.
 */
export async function testDteConnectionAction(): Promise<TestDteConnectionState> {
  await requireRole([USER_ROLE.ADMIN]);
  try {
    const result = await makeTestDteConnection().execute();
    return { status: 'success', folio: result.folio, pdfBase64: result.pdfBase64 };
  } catch {
    return { status: 'error', error: 'No se pudo conectar con el sandbox de Openfactura. Intenta nuevamente.' };
  }
}
