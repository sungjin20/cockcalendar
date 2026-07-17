import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/admin";
export function GET(request:Request){return isAdmin(request)?NextResponse.json({ok:true}):NextResponse.json({error:"Unauthorized"},{status:401});}
