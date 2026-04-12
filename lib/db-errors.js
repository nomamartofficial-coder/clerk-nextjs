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

function getErrorParts(error) {
  const parts = [];
  let current = error;
  const seen = new Set();

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);

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

    current = current.cause;
  }

  return parts.join(" ").toLowerCase();
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
