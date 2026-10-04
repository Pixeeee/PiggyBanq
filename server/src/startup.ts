import { existsSync, readFileSync } from 'node:fs';
import { isIP } from 'node:net';

type Environment = Record<string, string | undefined>;

export function loadLocalEnv(fileUrl: URL, environment: Environment = process.env) {
  if (!existsSync(fileUrl)) return;

  for (const line of readFileSync(fileUrl, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || environment[key] !== undefined) continue;
    const value = trimmed.slice(separator + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
    environment[key] = value;
  }
}

export function loadListenConfig(environment: Environment = process.env) {
  const host = environment.HOST ?? '0.0.0.0';
  if (!isIP(host) && !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host)) {
    throw new Error('HOST must be an IP address or hostname.');
  }
  const portText = environment.PORT ?? '4000';
  const port = Number(portText);
  if (!/^\d+$/.test(portText) || !Number.isSafeInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  return { host, port };
}

export function loadTrustProxy(environment: Environment = process.env): false | number | string[] {
  const value = environment.TRUST_PROXY;
  if (value === undefined || value === 'false') return false;
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    if (Number.isSafeInteger(hops) && hops >= 1 && hops <= 16) return hops;
    throw new Error('TRUST_PROXY hop count must be between 1 and 16.');
  }
  const aliases = new Set(['loopback', 'linklocal', 'uniquelocal']);
  const entries = value.split(',').map(entry => entry.trim());
  for (const entry of entries) {
    if (aliases.has(entry)) continue;
    const [address, prefix, extra] = entry.split('/');
    const version = isIP(address);
    if (!version || extra !== undefined || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > (version === 4 ? 32 : 128)))) {
      throw new Error('TRUST_PROXY must be false, a bounded hop count, or a list of trusted IP addresses, CIDRs, or named proxy aliases.');
    }
  }
  return entries;
}
