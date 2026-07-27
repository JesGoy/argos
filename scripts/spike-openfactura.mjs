/**
 * Fase 0 — Spike de integración con Openfactura (Haulmer) para emisión de DTE.
 *
 * Emite contra el sandbox público (dev-api.haulmer.com, CAF simulado, sin cuenta):
 *   1. Una Boleta Electrónica afecta (DTE 39) desde un carrito expresado en
 *      centavos (como almacena Argos) → valida el mapeo centavos→pesos CLP y
 *      el desglose de IVA (neto = round(total/1.19), iva = total - neto).
 *   2. Una Nota de Crédito (DTE 61) que ANULA la boleta anterior (CodRef 1).
 *
 * No toca la base de datos ni el código de la app. Artefactos (PDF 80mm,
 * timbre PNG, XML) se guardan en el directorio pasado como argumento o en
 * ./spike-output.
 *
 * Uso: node scripts/spike-openfactura.mjs [outputDir]
 */

const BASE_URL = 'https://dev-api.haulmer.com';
const ENDPOINT = `${BASE_URL}/v2/dte/document`;

// Empresa de prueba pública "Haulmer" del sandbox (datos oficiales de la doc).
const DEMO_API_KEY = '928e15a2d14d4a6292345f04960f4bd3';
const DEMO_EMISOR_BOLETA = {
  RUTEmisor: '76795561-8',
  // Boletas usan nomenclatura del formato de boletas del SII:
  // RznSocEmisor/GiroEmisor (no RznSoc/GiroEmis) y sin Acteco.
  RznSocEmisor: 'HAULMER SPA',
  GiroEmisor: 'VENTA AL POR MENOR EN EMPRESAS DE VENTA A DISTANCIA VÍA INTERNET',
  CdgSIISucur: '81303347',
  DirOrigen: 'ARTURO PRAT 527 CURICO',
  CmnaOrigen: 'Curicó',
};
const DEMO_EMISOR_FACTURA = {
  RUTEmisor: '76795561-8',
  RznSoc: 'HAULMER SPA',
  GiroEmis: 'VENTA AL POR MENOR EN EMPRESAS DE VENTA A DISTANCIA VÍA INTERNET',
  Acteco: 479100,
  DirOrigen: 'ARTURO PRAT 527 CURICO',
  CmnaOrigen: 'Curicó',
  CdgSIISucur: '81303347',
};

const RUT_CONSUMIDOR_FINAL = '66666666-6';
const IVA_RATE = 0.19;

// ─── Carrito de prueba en CENTAVOS, como lo almacena Argos (Sale/SaleItem) ───
const cartCents = [
  { sku: 'CAP-001', name: 'Cappuccino', quantity: 2, unitPriceCents: 250000 }, // $2.500 c/u
  { sku: 'CRO-001', name: 'Croissant', quantity: 1, unitPriceCents: 180000 }, // $1.800
];

/** Centavos → pesos CLP enteros. El dominio garantiza múltiplos de 100 en CLP. */
function centsToClp(cents) {
  if (cents % 100 !== 0) {
    throw new Error(`Monto en centavos no es múltiplo de 100: ${cents} (CLP no tiene decimales)`);
  }
  return cents / 100;
}

/** Desglose de IVA "hacia atrás" desde el total bruto (precios IVA incluido). */
function splitIva(totalClp) {
  const neto = Math.round(totalClp / (1 + IVA_RATE));
  return { neto, iva: totalClp - neto };
}

function todayIsoDate() {
  // Fecha local de Chile: el sandbox valida FchEmis contra fecha razonable.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date());
}

async function emitDocument(payload, idempotencyKey) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: DEMO_API_KEY,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Respuesta no-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.error) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json, null, 2)}`);
  }
  return json;
}

async function main() {
  const { mkdir, writeFile } = await import('node:fs/promises');
  const outDir = process.argv[2] ?? './spike-output';
  await mkdir(outDir, { recursive: true });

  const fchEmis = todayIsoDate();
  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // ── 1. Construir boleta 39 desde el carrito en centavos ──
  const detalle = cartCents.map((item, i) => {
    const unitClp = centsToClp(item.unitPriceCents);
    return {
      NroLinDet: i + 1,
      NmbItem: item.name.slice(0, 80),
      QtyItem: item.quantity,
      PrcItem: unitClp, // precio unitario BRUTO (IVA incluido), como exige boleta
      MontoItem: unitClp * item.quantity,
    };
  });
  const totalClp = detalle.reduce((acc, l) => acc + l.MontoItem, 0);
  const { neto, iva } = splitIva(totalClp);

  console.log('── Boleta 39 ──');
  console.log(`Carrito: ${cartCents.map((c) => `${c.quantity}x ${c.name}`).join(', ')}`);
  console.log(`Total bruto: $${totalClp} CLP → Neto $${neto} + IVA $${iva} (check: ${neto + iva === totalClp ? 'OK' : 'DESCUADRE'})`);

  const boletaPayload = {
    response: ['XML', 'PDF', 'TIMBRE', 'FOLIO', 'RESOLUCION', '80MM'],
    dte: {
      Encabezado: {
        IdDoc: { TipoDTE: 39, Folio: 0, FchEmis: fchEmis, IndServicio: '3' },
        Emisor: DEMO_EMISOR_BOLETA,
        Receptor: { RUTRecep: RUT_CONSUMIDOR_FINAL },
        Totales: {
          MntNeto: neto,
          IVA: iva,
          MntTotal: totalClp,
          TotalPeriodo: totalClp,
          VlrPagar: totalClp,
        },
      },
      Detalle: detalle,
    },
  };

  const boleta = await emitDocument(boletaPayload, `ARGOS_SPIKE_B39_${runId}`);
  console.log(`✔ Boleta emitida — FOLIO: ${boleta.FOLIO} | TOKEN: ${boleta.TOKEN}`);
  console.log(`  Resolución: ${JSON.stringify(boleta.RESOLUCION)}`);

  if (boleta.PDF) await writeFile(`${outDir}/boleta-${boleta.FOLIO}-80mm.pdf`, Buffer.from(boleta.PDF, 'base64'));
  if (boleta.TIMBRE) await writeFile(`${outDir}/boleta-${boleta.FOLIO}-timbre.png`, Buffer.from(boleta.TIMBRE, 'base64'));
  if (boleta.XML) {
    const xml = Buffer.from(boleta.XML, 'base64').toString('latin1'); // ISO-8859-1
    await writeFile(`${outDir}/boleta-${boleta.FOLIO}.xml`, xml, 'latin1');
    const mntTotalInXml = xml.match(/<MntTotal>(\d+)<\/MntTotal>/)?.[1];
    const folioInXml = xml.match(/<Folio>(\d+)<\/Folio>/)?.[1];
    const tedPresent = xml.includes('<TED');
    console.log(`  XML: Folio=${folioInXml} MntTotal=${mntTotalInXml} TED=${tedPresent ? 'presente' : 'AUSENTE'} (esperado total ${totalClp})`);
  }

  // ── 2. Nota de Crédito 61 que ANULA la boleta (CodRef 1 = anulación) ──
  console.log('\n── Nota de Crédito 61 (anulación de la boleta) ──');
  const ncPayload = {
    response: ['XML', 'PDF', 'FOLIO', 'RESOLUCION'],
    dte: {
      Encabezado: {
        IdDoc: { TipoDTE: 61, Folio: 0, FchEmis: fchEmis },
        Emisor: DEMO_EMISOR_FACTURA, // NC usa nomenclatura de factura (RznSoc/GiroEmis/Acteco)
        // El esquema de NC (DTE_v10) exige Receptor estilo factura: al menos
        // RznSocRecep además del RUT. Para anular boleta a consumidor final se
        // usa el RUT genérico con glosa genérica.
        Receptor: {
          RUTRecep: RUT_CONSUMIDOR_FINAL,
          RznSocRecep: 'CONSUMIDOR FINAL',
          GiroRecep: 'PARTICULAR',
          DirRecep: 'SIN DIRECCION',
          CmnaRecep: 'Curicó',
        },
        Totales: {
          MntNeto: neto,
          TasaIVA: '19',
          IVA: iva,
          MntTotal: totalClp,
        },
      },
      // A diferencia de la boleta (líneas BRUTAS), en NC/factura las líneas
      // van en montos NETOS: la API valida MntNeto = Σ MontoItem e IVA = 19%
      // del neto. Para una anulación total se usa una única línea por el neto.
      Detalle: [
        {
          NroLinDet: 1,
          NmbItem: `Anula boleta electrónica folio ${boleta.FOLIO}`.slice(0, 80),
          QtyItem: 1,
          PrcItem: neto,
          MontoItem: neto,
        },
      ],
      Referencia: [
        {
          NroLinRef: 1,
          TpoDocRef: '39',
          FolioRef: String(boleta.FOLIO),
          FchRef: fchEmis,
          CodRef: '1', // 1 = anula documento de referencia
        },
      ],
    },
  };

  const nc = await emitDocument(ncPayload, `ARGOS_SPIKE_NC61_${runId}`);
  console.log(`✔ NC emitida — FOLIO: ${nc.FOLIO} | TOKEN: ${nc.TOKEN}`);
  if (nc.PDF) await writeFile(`${outDir}/nc-${nc.FOLIO}.pdf`, Buffer.from(nc.PDF, 'base64'));
  if (nc.XML) await writeFile(`${outDir}/nc-${nc.FOLIO}.xml`, Buffer.from(nc.XML, 'base64').toString('latin1'), 'latin1');

  // ── 3. Probar idempotencia: reenviar la MISMA boleta con la MISMA key ──
  console.log('\n── Idempotencia (reenvío con la misma Idempotency-Key) ──');
  try {
    await emitDocument(boletaPayload, `ARGOS_SPIKE_B39_${runId}`);
    console.log('✘ INESPERADO: el reenvío emitió un documento nuevo (no hubo error OF-06)');
  } catch (err) {
    const isOf06 = err.message.includes('OF-06');
    console.log(`${isOf06 ? '✔' : '✘'} Reenvío rechazado${isOf06 ? ' con OF-06 y token del documento original (comportamiento esperado)' : ` con error distinto: ${err.message.slice(0, 200)}`}`);
  }

  console.log(`\nArtefactos guardados en: ${outDir}`);
}

main().catch((err) => {
  console.error('SPIKE FALLÓ:', err.message);
  process.exit(1);
});
