import { NextResponse } from "next/server";

const prismaConnectivityCodes = new Set(["P1001", "P1002", "P1008"]);
const connectivityMarkers = [
  "neondberror",
  "fetch failed",
  "connect timeout",
  "und_err_connect_timeout",
  "error connecting to database",
  "can't reach database server",
  "database temporarily unavailable",
];

function getCauseChain(error) {
  const chain = [];
  let current = error;
  const seen = new Set();

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}

function getErrorParts(error) {
  const parts = [];

  for (const current of getCauseChain(error)) {
    if (typeof current.name === "string") {
      parts.push(current.name);
    }

    if (typeof current.code === "string") {
      parts.push(current.code);
      if (prismaConnectivityCodes.has(current.code)) {
        parts.push("prisma connectivity");
      }
    }

    if (typeof current.message === "string") {
      parts.push(current.message);
    }
  }

  return parts.join(" ").toLowerCase();
}

function getConnectionTarget(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    return { host: "unknown", mode: "unknown" };
  }

  try {
    const url = new URL(connectionString);
    const host = url.hostname || "unknown";
    const mode = host.includes("-pooler.") ? "pooled" : "direct";

    return { host, mode };
  } catch {
    return { host: "unknown", mode: "unknown" };
  }
}

export function isDatabaseConnectivityError(error) {
  if (!error) {
    return false;
  }

  const haystack = getErrorParts(error);
  return connectivityMarkers.some((marker) => haystack.includes(marker));
}

export function databaseUnavailableResponse() {
  return NextResponse.json(
    { error: "database temporarily unavailable" },
    { status: 503 }
  );
}

export function logDatabaseConnectivityError(
  routeName,
  error,
  connectionString = process.env.DATABASE_URL
) {
  const causeChain = getCauseChain(error);
  const topLevelError = causeChain[0] ?? {};
  const nestedCode =
    causeChain.find(
      (current, index) => index > 0 && typeof current?.code === "string"
    )?.code ?? null;
  const { host, mode } = getConnectionTarget(connectionString);

  console.error("Database connectivity error", {
    route: routeName,
    host,
    mode,
    errorName: topLevelError.name ?? null,
    errorCode:
      typeof topLevelError.code === "string" ? topLevelError.code : null,
    causeCode: nestedCode,
    message:
      typeof topLevelError.message === "string"
        ? topLevelError.message
        : null,
  });
  console.error(error);
}
