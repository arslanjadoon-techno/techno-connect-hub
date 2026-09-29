
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySignedSession } from "../../../lib/auth";

const API_BASE_URL =
  process.env.REPORTING_API_BASE_URL?.trim() ||
  "https://leasingapi.techno-communications.com";

const allowedPaths = new Set([
  "Reporting/GetKpi",
  "Reporting/GetMarketWise",
  "Reporting/GetStoreWise",
  "Reporting/GetTrend",
  "Reporting/GetDetail",
  "Reporting/GetExport",
  "Reporting/GetFilterValues",
  "Reporting/StoreWisePD/GetKpi",
  "Reporting/StoreWisePD/GetFilterValues",
  "Reporting/StoreWisePD/GetMatrix",
  "Reporting/StoreWisePD/GetDoorCodeWise",
  "Reporting/StoreWisePD/GetTransactionTypeWise",
  "Reporting/StoreWisePD/GetMonthlyTrend",
  "Reporting/StoreWisePD/GetExport",
  "Reporting/RetentionActivation/GetKpi",
  "Reporting/RetentionActivation/GetMarketWise",
  "Reporting/RetentionActivation/GetStoreWise",
  "Reporting/RetentionActivation/GetEmployeeWise",
  "Reporting/RetentionActivation/GetTrend",
  "Reporting/RetentionActivation/GetExport",
]);

type ReportingRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: Request, context: ReportingRouteContext) {
  const { path } = await context.params;
  const signedSession = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
  const session = await verifySignedSession(signedSession);
  const upstreamPath = path.join("/");

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!allowedPaths.has(upstreamPath)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(upstreamPath, `${API_BASE_URL}/`);

  requestUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  let upstream: Response;
  const token = session.replace(/^Bearer\s+/i, "");

  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: request.headers.get("accept") ?? "*/*",
        Authorization: `Bearer ${token}`,
        token,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "The reporting API is unavailable." },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "application/json";
  const contentDisposition = upstream.headers.get("content-disposition");

  if (!upstream.ok) {
    await upstream.body?.cancel();
    return NextResponse.json(
      {
        message: `Reporting API returned ${upstream.status}.`,
      },
      { status: upstream.status },
    );
  }

  if (!contentDisposition && contentType.toLowerCase().includes("text/html")) {
    await upstream.body?.cancel();
    return NextResponse.json(
      { message: "Reporting API returned HTML instead of report data." },
      { status: 502 },
    );
  }

  // Preserve XLSX and all other upstream payloads byte-for-byte. Reading an
  // Excel response with text() corrupts its ZIP-based binary file structure.
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      ...(contentDisposition
        ? { "content-disposition": contentDisposition }
        : {}),
    },
  });
}
