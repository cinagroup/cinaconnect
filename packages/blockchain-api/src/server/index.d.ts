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
/**
 * Request body:
 *   { address: string; chainId?: number; tokenAddresses?: string[] }
 * Response:
 *   { balances: Balance[] }
 */
export declare function POST_balance(req: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    balances: any;
}>>;
/**
 * Request body:
 *   { address: string; chainId?: number; limit?: number; cursor?: string }
 * Response:
 *   { transactions: Transaction[]; nextCursor?: string; hasMore: boolean }
 */
export declare function POST_history(req: NextRequest): Promise<NextResponse<any>>;
/**
 * Request body:
 *   { name?: string; address?: string }
 * Response (forward lookup):
 *   { address: string | null }
 * Response (reverse lookup):
 *   { name: string | null }
 */
export declare function POST_ens_resolve(req: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    address: any;
}> | NextResponse<{
    name: any;
}>>;
/**
 * Request body:
 *   { tokenAddress: string; chainId?: number }
 * Response:
 *   { metadata: TokenMetadata }
 */
export declare function POST_token_metadata(req: NextRequest): Promise<NextResponse<{
    error: string;
}> | NextResponse<{
    metadata: any;
}>>;
//# sourceMappingURL=index.d.ts.map