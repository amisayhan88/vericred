// VeriCred — QR rendering helper. `qrcode` is dynamically imported so the
// encoder stays out of the main bundle and only loads where codes are shown.

export interface QrOptions {
  dark?: string;
  light?: string;
  size?: number;
}

async function loadQr(): Promise<typeof import('qrcode')> {
  const mod = (await import('qrcode')) as unknown as { default?: typeof import('qrcode') } & typeof import('qrcode');
  return mod.default ?? mod;
}

export async function qrDataUrl(value: string, options: QrOptions = {}): Promise<string> {
  const QRCode = await loadQr();
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: options.size ?? 320,
    color: {
      dark: options.dark ?? '#173B57',
      light: options.light ?? '#FFFFFF',
    },
  });
}
