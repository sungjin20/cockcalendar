import { NextResponse } from "next/server";
import { ADMIN_COOKIE, expectedPassword, sessionToken } from "../../../../lib/admin";
export async function POST(request:Request){const body=await request.json() as {password?:string};if(!body.password||body.password!==expectedPassword())return NextResponse.json({error:"Unauthorized"},{status:401});const response=NextResponse.json({ok:true});response.cookies.set(ADMIN_COOKIE,sessionToken(),{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*12});return response;}
