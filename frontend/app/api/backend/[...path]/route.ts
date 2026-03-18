import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBackendApiUrl() {
  const backendApiUrl = process.env.BACKEND_API_URL?.trim();

  if (!backendApiUrl) {
    throw new Error("Missing BACKEND_API_URL environment variable");
  }

  return backendApiUrl.replace(/\/+$/, "");
}

function getBackendInternalApiKey() {
  const internalApiKey = process.env.BACKEND_INTERNAL_API_KEY?.trim();

  if (!internalApiKey) {
    throw new Error("Missing BACKEND_INTERNAL_API_KEY environment variable");
  }

  return internalApiKey;
}

function buildTargetUrl(request: NextRequest, path: string[]) {
  const search = request.nextUrl.search;
  const normalizedPath = path.map((segment) => encodeURIComponent(segment)).join("/");

  return `${getBackendApiUrl()}/${normalizedPath}${search}`;
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetUrl = buildTargetUrl(request, path);
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  headers.set("x-internal-api-key", getBackendInternalApiKey());

  try {
    const upstreamResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
      cache: "no-store",
      // Required by Node.js fetch when forwarding a streaming request body.
      duplex: "half"
    } as RequestInit & { duplex: "half" });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.delete("content-length");

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `Backend API unreachable: ${error.message}`
        : "Backend API unreachable";

    return Response.json(
      {
        message
      },
      {
        status: 502
      }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, context);
}
