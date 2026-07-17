import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/admin";
import { getBaddyAccessToken } from "../../../../lib/baddy-auth";
import { runCollector, type Platform } from "../../../../lib/collector";
const platforms:Platform[]=["baddy","wekkuk","sponet","facecock"];
export async function POST(request:Request){if(!isAdmin(request))return NextResponse.json({error:"Unauthorized"},{status:401});const body=await request.json() as {platform?:Platform};if(!body.platform||!platforms.includes(body.platform))return NextResponse.json({error:"Invalid platform"},{status:400});try{if(body.platform==="baddy")process.env.BADDY_TOKEN=await getBaddyAccessToken();const log=await runCollector(body.platform);return NextResponse.json({data:log,message:`${body.platform} collection finished`});}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Collection failed"},{status:502});}}
