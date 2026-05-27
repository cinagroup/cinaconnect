/**
 * Server-side Next.js API route handlers for the blockchain-api package.
 *
 * Usage — import individual handlers into your Next.js app:
 *
 *   // app/api/balance/route.ts
 *   export { POST } from "@cinacoin/blockchain-api/server";
 *
 * Or copy the handler bodies if you need custom auth / middleware.
 */

import { NextRequest, NextResponse } from "next/server";
import { BlockchainApiClient } from "../../client.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const DEFAULT_CHAIN_ID = 1;

/**
 * Lazily create (or reuse) a client from env vars.
 * In production you may want a shared instance per process.
 */
function getClient(): BlockchainApiClient {
  return new BlockchainApiClient({
    rpcUrls: process.env.RPC_URLS ? JSON.parse(process.env.RPC_URLS) : {},
    metadataBaseUrl: process.env.METADATA_BASE_URL,
    defaultChainId: process.env.DEFAULT_CHAIN_ID
      ? Number(process.env.DEFAULT_CHAIN_ID)
      : DEFAULT_CHAIN_ID,
  });
}

/** Parse JSON body safely. */
async function parseBody<T = Record<string, unknown>>(
  req: NextRequest
): Promise<T> {
  return (await req.json()) as T;
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ---------------------------------------------------------------------------
// POST /api/balance
// ---------------------------------------------------------------------------

/**
 * Request body:
 *   { address: string; chainId?: number; tokenAddresses?: string[] }
 * Response:
 *   { balances: Balance[] }
 */
export async function POST_balance(req: NextRequest) {
  try {
    const body = await parseBody<{
      address: string;
      chainId?: number;
      tokenAddresses?: string[];
    }>(req);

    if (!body.address) {
      return errorResponse("Missing required field: address");
    }

    const client = getClient();
    const balances = await client.getTokenBalances(
      body.address,
      body.chainId,
      body.tokenAddresses
    );

    return NextResponse.json({ balances });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(msg, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/history
// ---------------------------------------------------------------------------

/**
 * Request body:
 *   { address: string; chainId?: number; limit?: number; cursor?: string }
 * Response:
 *   { transactions: Transaction[]; nextCursor?: string; hasMore: boolean }
 */
export async function POST_history(req: NextRequest) {
  try {
    const body = await parseBody<{
      address: string;
      chainId?: number;
      limit?: number;
      cursor?: string;
    }>(req);

    if (!body.address) {
      return errorResponse("Missing required field: address");
    }

    const client = getClient();
    const result = await client.getTransactionHistory(
      body.address,
      body.chainId,
      body.limit ?? 20,
      body.cursor
    );

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(msg, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/ens/resolve
// ---------------------------------------------------------------------------

/**
 * Request body:
 *   { name?: string; address?: string }
 * Response (forward lookup):
 *   { address: string | null }
 * Response (reverse lookup):
 *   { name: string | null }
 */
export async function POST_ens_resolve(req: NextRequest) {
  try {
    const body = await parseBody<{
      name?: string;
      address?: string;
      chainId?: number;
    }>(req);

    const client = getClient();

    if (body.name) {
      const address = await client.resolveENS(body.name);
      return NextResponse.json({ address });
    }

    if (body.address) {
      const name = await client.reverseENS(body.address, body.chainId);
      return NextResponse.json({ name });
    }

    return errorResponse("Provide either 'name' or 'address'");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(msg, 500);
  }
}

// ---------------------------------------------------------------------------
// POST /api/token/metadata
// ---------------------------------------------------------------------------

/**
 * Request body:
 *   { tokenAddress: string; chainId?: number }
 * Response:
 *   { metadata: TokenMetadata }
 */
export async function POST_token_metadata(req: NextRequest) {
  try {
    const body = await parseBody<{
      tokenAddress: string;
      chainId?: number;
    }>(req);

    if (!body.tokenAddress) {
      return errorResponse("Missing required field: tokenAddress");
    }

    const client = getClient();
    const metadata = await client.getTokenMetadata(
      body.tokenAddress,
      body.chainId
    );

    return NextResponse.json({ metadata });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(msg, 500);
  }
}
