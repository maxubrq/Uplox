import http from "k6/http";
import { check, sleep } from "k6";
import crypto from "k6/crypto";
import { SharedArray } from "k6/data";
import encoding from "k6/encoding";

// Test configuration via environment variables
const VUS = parseInt(__ENV.K6_VUS || "100");
const DURATION = __ENV.K6_DURATION || "10m";
const TARGET_URL = __ENV.K6_TARGET_URL || "http://uplox:3000";
const DISTRIBUTED_MODE = __ENV.K6_DISTRIBUTED_MODE === "true";

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ["p(95)<5000"], // 95% of requests must complete within 5s
    http_req_failed: ["rate<0.5"], // Error rate should be less than 50%
  },
  // Distributed testing configuration
  ...(DISTRIBUTED_MODE && {
    executor: "ramping-vus",
    stages: [
      { duration: "2m", target: VUS * 0.1 }, // Ramp up to 10% of target
      { duration: "3m", target: VUS * 0.5 }, // Ramp up to 50% of target
      { duration: "2m", target: VUS }, // Ramp up to full target
      { duration: DURATION, target: VUS }, // Stay at target
      { duration: "3m", target: 0 }, // Ramp down
    ],
  }),
};

// Sample files configuration - will be populated from actual files
const SAMPLE_FILES = [
  "xlsx_test.xlsx",
  "zip_but_xls.zip",
  "pptx_infected.rar",
  "pptx_test.pptx",
  "rar_test.rar",
  "doc_infected.zip",
  "doc_test.doc",
  "docm_text.docm",
  "docx_password.docx",
  "doc_infected.doc",
  "malicious.pdf",
];

// File cache for storing file content and hashes
const fileCache = new Map();

// Pre-calculate hashes and store files as base64 encoded strings
let sampleFiles = new SharedArray("sample_files", () => {
  const ret: {
    name: string;
    content: string; // base64 encoded content
    hash: string;
  }[] = [];
  for (const f of SAMPLE_FILES) {
    const path = `../sample_files/${f}`;
    const fileContent = open(path, "b");
    const sha256 = crypto.createHash("sha256");
    sha256.update(fileContent);
    const fileHash = sha256.digest("hex");

    // Encode file content as base64 for safe storage in SharedArray
    const base64Content = encoding.b64encode(fileContent);

    ret.push({
      name: f,
      content: base64Content,
      hash: fileHash,
    });
  }
  return ret;
});

// Test file upload with real file content and hash
function testFileUpload(
  fileName: string,
  hash: string,
  base64Content: string
): void {
  // Decode base64 content back to binary
  const fileContent = encoding.b64decode(base64Content);

  const formData = {
    file: http.file(fileContent, fileName),
    sha256: hash,
  };

  let uploadResponse;
  let downloadResponse;

  // Test: upload
  uploadResponse = http.post(`${TARGET_URL}/files/upload`, formData, {
    timeout: "30s",
  });

  // Test: download
  if (uploadResponse.status === 200) {
    const fileId = uploadResponse.json().fileId;
    downloadResponse = http.get(`${TARGET_URL}/files/${fileId}/download`, {
      timeout: "30s",
    });
  }

  // Check response - both success and failure are acceptable
  const isSuccess = check(uploadResponse, {
    "status is 200 or 400 or 500": (r) => [200, 400, 500].includes(r.status),
    "response has message": (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return body.message !== undefined;
      } catch {
        return false;
      }
    },
    "response time < 30s": (r) => r.timings.duration < 30000,
  });

  if (!isSuccess) {
    // Upload failed - logged in metrics
  }

  // Log response for debugging (using simple logging in k6)
  if (uploadResponse.status === 200) {
    // Success - file uploaded and processed
  } else if (uploadResponse.status === 400) {
    // Expected failure (infected files, hash mismatch, etc.)
  } else {
    // Unexpected error
  }
}

// Main test function
export default function (): void {
  // Select a random file for this iteration
  const randomFile =
    sampleFiles[Math.floor(Math.random() * sampleFiles.length)];

  // Test file upload
  if (randomFile) {
    testFileUpload(randomFile.name, randomFile.hash, randomFile.content);
  }

  // Random sleep between 1-3 seconds to simulate realistic usage
  sleep(Math.random() * 2 + 1);
}

// Setup function (called once per VU)
export function setup(): void {
  sleep(30);
}

// Teardown function (called once at the end)
export function teardown(): void {
  // Clear file cache
  fileCache.clear();
}

// Custom summary export
export function handleSummary(data: any) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return {
    [`/shared/k6-results-${timestamp}.json`]: JSON.stringify(data, null, 2),
    stdout: JSON.stringify(data, null, 2),
  };
}
