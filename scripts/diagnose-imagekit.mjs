import "dotenv/config";
import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";

const timeoutMs = Number(process.env.IMAGEKIT_TIMEOUT_MS ?? 20_000);

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
      socket.end();
      resolve({
        secureConnect: true,
        protocol,
        cipher: cipher?.name ?? null,
        authorized: socket.authorized,
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

async function fetchProbe(url, headers) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  return {
    status: response.status,
    ok: response.ok,
  };
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

async function diagnoseHost(host) {
  console.log(`\n=== HOST ${host} ===`);
  console.log(JSON.stringify(formatResult("dns", await runProbe(() => dnsProbe(host))), null, 2));
  console.log(JSON.stringify(formatResult("tcp", await runProbe(() => tcpProbe(host, 443))), null, 2));
  console.log(JSON.stringify(formatResult("tls", await runProbe(() => tlsProbe(host, 443))), null, 2));
  console.log(
    JSON.stringify(
      formatResult("fetch", await runProbe(() => fetchProbe(`https://${host}`))),
      null,
      2
    )
  );
}

async function diagnoseAuthenticatedApi() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  const password =
    process.env.OPTIONAL_IMAGEKIT_IGNORES_THIS?.trim() || "do_not_set";

  if (!privateKey) {
    console.log(
      JSON.stringify(
        {
          probe: "authenticated-api",
          ok: false,
          errorName: "ConfigurationError",
          errorCode: null,
          message: "missing IMAGEKIT_PRIVATE_KEY",
        },
        null,
        2
      )
    );
    return;
  }

  const auth = Buffer.from(`${privateKey}:${password}`).toString("base64");
  const result = await runProbe(() =>
    fetchProbe("https://api.imagekit.io/v1/files?skip=0&limit=1", {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    })
  );

  console.log("\n=== AUTHENTICATED API ===");
  console.log(JSON.stringify(formatResult("authenticated-api", result), null, 2));
}

async function main() {
  console.log(`ImageKit diagnostics timeout: ${timeoutMs}ms`);
  await diagnoseHost("upload.imagekit.io");
  await diagnoseHost("api.imagekit.io");
  await diagnoseAuthenticatedApi();
}

main().catch((error) => {
  console.error("ImageKit diagnostics crashed.");
  console.error(error);
  process.exitCode = 1;
});
