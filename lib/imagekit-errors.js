import { NextResponse } from "next/server";

const connectivityMarkers = [
  "apiconnectionerror",
  "apiconnectiontimeouterror",
  "request timed out",
  "fetch failed",
  "connect timeout",
  "und_err_connect_timeout",
  "tls",
  "ssl",
  "certificate",
  "network",
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
  return getCauseChain(error)
    .flatMap((current) => [
      typeof current.name === "string" ? current.name : "",
      typeof current.code === "string" ? current.code : "",
      typeof current.message === "string" ? current.message : "",
    ])
    .join(" ")
    .toLowerCase();
}

export function isImageKitConnectivityError(error) {
  if (!error) {
    return false;
  }

  const haystack = getErrorParts(error);
  return connectivityMarkers.some((marker) => haystack.includes(marker));
}

export function imageKitUnavailableResponse() {
  return NextResponse.json(
    { error: "image upload service temporarily unavailable" },
    { status: 503 }
  );
}

export function logImageKitConnectivityError(routeName, error) {
  const causeChain = getCauseChain(error);
  const topLevelError = causeChain[0] ?? {};
  const nestedCode =
    causeChain.find(
      (current, index) => index > 0 && typeof current?.code === "string"
    )?.code ?? null;

  console.error("ImageKit connectivity error", {
    route: routeName,
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
