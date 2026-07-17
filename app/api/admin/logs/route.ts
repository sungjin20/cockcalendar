import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/admin";
import { dbQuery } from "../../../../db/postgres";

export async function GET(request:Request){
  if(!isAdmin(request))return NextResponse.json({error:"Unauthorized"},{status:401});
  const params=new URL(request.url).searchParams;const id=params.get("id");
  try{
    if(id){const detail=await dbQuery(`SELECT id,changes FROM collector_logs WHERE id=$1`,[id]);if(!detail.rowCount)return NextResponse.json({error:"Log not found"},{status:404});return NextResponse.json({data:detail.rows[0]});}
    const platform=params.get("platform")||"all";const page=Math.max(1,Number(params.get("page")||1));const pageSize=Math.min(50,Math.max(1,Number(params.get("pageSize")||10)));const where=platform!=="all"?"WHERE platform=$1":"";const values=platform!=="all"?[platform]:[];
    const [result,count]=await Promise.all([dbQuery(`SELECT id,CASE platform WHEN 'baddy' THEN '배프' WHEN 'wekkuk' THEN '위꾹' WHEN 'sponet' THEN '스포넷' WHEN 'facecock' THEN '페이스콕' ELSE platform END AS platform,status,started_at AS "startedAt",(added_count+updated_count+unchanged_count) AS fetched,(added_count+updated_count) AS upserted FROM collector_logs ${where} ORDER BY started_at DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`,values),dbQuery<{total:number}>(`SELECT count(*)::int AS total FROM collector_logs ${where}`,values)]);
    return NextResponse.json({data:result.rows,total:count.rows[0]?.total||0,page,pageSize});
  }catch(error){return NextResponse.json({data:[],error:error instanceof Error?error.message:"Database unavailable"},{status:503});}
}
