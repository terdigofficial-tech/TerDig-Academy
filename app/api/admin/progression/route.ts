import { NextRequest, NextResponse } from 'next/server';
import { checkAndPromoteStudent } from '@/lib/progression';

export async function POST(req: NextRequest) {
  try {
    const { studentId } = await req.json();
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 });

    const result = await checkAndPromoteStudent(studentId);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
