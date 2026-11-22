import { readFileSync } from "node:fs";
import { candidateCells } from "../src/candidateCells";
import type { Coordinate } from "../src/geo";

function isCoordinate(value: unknown): value is Coordinate {
  return typeof value === "object" && value !== null &&
    "latitude" in value && typeof value.latitude === "number" &&
    "longitude" in value && typeof value.longitude === "number";
}

// This local evaluator accepts normalized samples over stdin and emits only the
// result. An authenticated server must validate the original trace upstream.
function evaluate(request: unknown) {
  if (typeof request !== "object" || request === null ||
      !("version" in request) || typeof request.version !== "string") {
    return { cells: [], reason: "unsupported_version" };
  }
  if (!("samples" in request) || !Array.isArray(request.samples) ||
      !request.samples.every(isCoordinate)) {
    return { cells: [], reason: "invalid_coordinate" };
  }
  return candidateCells(request.version, request.samples);
}

const input: unknown = JSON.parse(readFileSync(0, "utf8"));
process.stdout.write(JSON.stringify(evaluate(input)) + "\n");
