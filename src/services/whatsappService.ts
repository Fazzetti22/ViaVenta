/**
 * SERVICIO DE GENERACIÓN Y ENVÍO DE TICKETS VÍA WHATSAPP API
 * Módulo 3 - PWA Móvil del Vendedor
 */

export interface PedidoItemTicket {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface TicketCompraPayload {
  nombreEmpresa: string;
  nombreComercio: string;
  direccionComercio?: string;
  telefonoCliente?: string;
  fecha: Date | string;
  items: PedidoItemTicket[];
  total: number;
  formaPago: 'Efectivo' | 'Transferencia' | 'Crédito / A cuenta' | string;
  vendedorNombre?: string;
  observaciones?: string;
}

/**
 * Genera el texto plano formateado con Markdown de WhatsApp (negritas, cursivas, listas)
 */
export function formatearTicketWhatsApp(payload: TicketCompraPayload): string {
  const fechaStr = payload.fecha instanceof Date 
    ? payload.fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : new Date(payload.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

  const detalleProductos = payload.items
    .map(
      (item) =>
        `- ${item.cantidad}x ${item.nombre} - $${item.subtotal.toLocaleString('es-AR')}`
    )
    .join('\n');

  const notasBloque = payload.observaciones 
    ? `\n*Nota:* ${payload.observaciones}\n----------------------------------------` 
    : '';

  const vendedorBloque = payload.vendedorNombre 
    ? `\n*Atendido por:* ${payload.vendedorNombre}` 
    : '';

  return (
`*COMPROBANTE DE COMPRA - ${payload.nombreEmpresa.toUpperCase()}*
----------------------------------------
*Cliente:* ${payload.nombreComercio}${payload.direccionComercio ? `\n*Dirección:* ${payload.direccionComercio}` : ''}
*Fecha:* ${fechaStr}${vendedorBloque}
----------------------------------------
*DETALLE DEL PEDIDO:*
${detalleProductos}
----------------------------------------
*TOTAL:* $${payload.total.toLocaleString('es-AR')}
*Forma de Pago:* ${payload.formaPago}${notasBloque}
----------------------------------------
¡Gracias por su compra!
_Generado por ViaVenta • Ruteo inteligente y ventas en calle_`
  );
}

/**
 * Normaliza el número de teléfono eliminando caracteres no numéricos y asegurando prefijo internacional
 */
export function normalizarTelefonoWhatsApp(telefonoRaw?: string): string {
  if (!telefonoRaw) return '';
  // Remover todo lo que no sea dígito
  let limpio = telefonoRaw.replace(/\D/g, '');
  
  // Si comienza con 0 (común en Argentina), removerlo
  if (limpio.startsWith('0')) {
    limpio = limpio.substring(1);
  }

  // Si tiene 10 dígitos (ej. 3855123456 en Argentina), anteponer código país '549'
  if (limpio.length === 10) {
    limpio = `549${limpio}`;
  } else if (limpio.length === 11 && limpio.startsWith('15')) {
    limpio = `549${limpio.substring(2)}`;
  } else if (!limpio.startsWith('54') && limpio.length >= 8 && limpio.length <= 11) {
    limpio = `549${limpio}`;
  }

  return limpio;
}

/**
 * Genera el link directo https://wa.me/[Teléfono]?text=[MensajeCodificado]
 */
export function generarWhatsAppUrl(payload: TicketCompraPayload): { url: string; mensajeTexto: string; telefonoDestino: string } {
  const mensajeTexto = formatearTicketWhatsApp(payload);
  const telefonoDestino = normalizarTelefonoWhatsApp(payload.telefonoCliente);
  const mensajeCodificado = encodeURIComponent(mensajeTexto);

  const url = telefonoDestino 
    ? `https://wa.me/${telefonoDestino}?text=${mensajeCodificado}`
    : `https://wa.me/?text=${mensajeCodificado}`;

  return {
    url,
    mensajeTexto,
    telefonoDestino,
  };
}

/**
 * Abre de forma directa la aplicación de WhatsApp o WhatsApp Web en una nueva pestaña/intent
 */
export function abrirWhatsAppTicket(payload: TicketCompraPayload): void {
  const { url } = generarWhatsAppUrl(payload);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
