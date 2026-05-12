import "dotenv/config";
import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const timeoutMs = Number(process.env.NEON_DIAG_TIMEOUT_MS ?? 10000);

function getEndpointDetails(label, connectionString) {
  if (!connectionString) {
    return null;
  }

  const url = new URL(connectionString);
  return {
    label,
    host: url.hostname,
    port: Number(url.port || 443),
    mode: url.hostname.includes("-pooler.") ? "pooled" : "direct",
    connectionString,
  };
}

function formatResult(name, result) {
  if (result.ok) {
    return { probe: name, ok: true, ...result.data };
  }

  return {
    probe: name,
    ok: false,
    errorName: result.error?.name ?? "Error",
    errorCode:
      result.error?.code ??
      result.error?.cause?.code ??
      result.error?.cause?.cause?.code ??
      null,
    message: result.error?.message ?? String(result.error),
  };
}

async function runProbe(fn) {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error };
  }
}

function tcpProbe(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.destroy();
      resolve({ connected: true });
    });
    socket.once("timeout", () => {
      socket.destroy();
      const error = new Error(`TCP connect timeout after ${timeoutMs}ms`);
      error.code = "TCP_TIMEOUT";
      reject(error);
    });
    socket.once("error", reject);
  });
}

function tlsProbe(host, port) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: host,
      rejectUnauthorized: true,
    });

    socket.setTimeout(timeoutMs);
    socket.once("secureConnect", () => {
      const protocol = socket.getProtocol();
      const cipher = socket.getCipher();
      const authorized = socket.authorized;
      socket.end();
      resolve({
        secureConnect: true,
        protocol,
        cipher: cipher?.name ?? null,
        authorized,
      });
    });
    socket.once("timeout", () => {
      socket.destroy();
      const error = new Error(`TLS handshake timeout after ${timeoutMs}ms`);
      error.code = "TLS_TIMEOUT";
      reject(error);
    });
    socket.once("error", reject);
  });
}

async function fetchProbe(host) {
  const response = await fetch(`https://${host}`, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  });

  return {
    status: response.status,
    ok: response.ok,
  };
}

async function sqlProbe(connectionString) {
  const adapter = new PrismaNeon({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const rows = await prisma.$queryRaw`SELECT 1 AS ok`;
    return {
      rowCount: Array.isArray(rows) ? rows.length : 0,
      sample: Array.isArray(rows) ? rows[0] ?? null : null,
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

async function dnsProbe(host) {
  const lookup = await dns.lookup(host, { all: true });
  const ipv4 = await dns.resolve4(host).catch(() => []);
  const ipv6 = await dns.resolve6(host).catch(() => []);

  return {
    lookup,
    ipv4,
    ipv6,
  };
}

async function diagnoseEndpoint(endpoint) {
  const { label, host, port, mode, connectionString } = endpoint;
  console.log(`\n=== ${label} (${mode}) ===`);
  console.log(JSON.stringify({ host, port, mode }, null, 2));

  const dnsResult = await runProbe(() => dnsProbe(host));
  console.log(JSON.stringify(formatResult("dns", dnsResult), null, 2));

  const tcpResult = await runProbe(() => tcpProbe(host, port));
  console.log(JSON.stringify(formatResult("tcp", tcpResult), null, 2));

  const tlsResult = await runProbe(() => tlsProbe(host, port));
  console.log(JSON.stringify(formatResult("tls", tlsResult), null, 2));

  const fetchResult = await runProbe(() => fetchProbe(host));
  console.log(JSON.stringify(formatResult("fetch", fetchResult), null, 2));

  const sqlResult = await runProbe(() => sqlProbe(connectionString));
  console.log(JSON.stringify(formatResult("sql", sqlResult), null, 2));
}

async function diagnoseControlTarget() {
  const host = "example.com";
  console.log(`\n=== CONTROL (${host}) ===`);

  const tcpResult = await runProbe(() => tcpProbe(host, 443));
  console.log(JSON.stringify(formatResult("tcp", tcpResult), null, 2));

  const tlsResult = await runProbe(() => tlsProbe(host, 443));
  console.log(JSON.stringify(formatResult("tls", tlsResult), null, 2));

  const fetchResult = await runProbe(() => fetchProbe(host));
  console.log(JSON.stringify(formatResult("fetch", fetchResult), null, 2));
}

async function main() {
  const endpoints = [
    getEndpointDetails("DATABASE_URL", process.env.DATABASE_URL),
    getEndpointDetails("DIRECT_URL", process.env.DIRECT_URL),
  ].filter(Boolean);

  if (endpoints.length === 0) {
    console.error("No DATABASE_URL or DIRECT_URL found in environment.");
    process.exitCode = 1;
    return;
  }

  console.log(`Neon diagnostics timeout: ${timeoutMs}ms`);

  for (const endpoint of endpoints) {
    await diagnoseEndpoint(endpoint);
  }

  await diagnoseControlTarget();
}

main().catch((error) => {
  console.error("Neon diagnostics crashed.");
  console.error(error);
  process.exitCode = 1;
});
