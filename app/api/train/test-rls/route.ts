/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-28 22:36:57
 * @LastEditTime: 2025-05-29 11:25:45
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@/auth';

export async function POST(req: NextRequest) {
  // 获取当前登录用户
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  // 创建 Supabase 客户端（用 anon key）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 查询 user 表，假设 uuid 字段为主键
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', session.user.email)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  return NextResponse.json({
    message: 'RLS 验证通过',
    data,
    currentUser: {
      email: session.user.email,
      uuid: data?.uuid,
    },
  });
}
