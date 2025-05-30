/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-29 11:55:22
 * @LastEditTime: 2025-05-30 16:36:06
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const appWebhookSecret = process.env.APP_WEBHOOK_SECRET;

if (!appWebhookSecret) {
  throw new Error('MISSING APP_WEBHOOK_SECRET!');
}

export async function POST(request: Request) {
  try {
    // 添加日志，输出服务端 APP_WEBHOOK_SECRET
    console.log('服务端 APP_WEBHOOK_SECRET:', process.env.APP_WEBHOOK_SECRET);
    const json = await request.json();
    const { status, tune } = json;

    // 从 URL 参数中获取信息
    const url = new URL(request.url);
    const user_id = url.searchParams.get('user_id');
    const model_id = url.searchParams.get('model_id');
    const webhook_secret = url.searchParams.get('webhook_secret');

    // 验证 webhook secret
    if (webhook_secret !== appWebhookSecret) {
      return NextResponse.json(
        { message: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    if (!user_id || !model_id) {
      return NextResponse.json(
        { message: 'Missing user_id or model_id' },
        { status: 400 }
      );
    }

    // 创建 Supabase 客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 业务流转状态映射
    let newStatus = '';
    if (tune?.status === 'done') {
      newStatus = 'finished';
    } else if (tune?.status === 'error') {
      newStatus = 'failed';
    } else if (tune?.status === 'in_progress') {
      newStatus = 'training';
    } else {
      newStatus = 'unknown';
    }

    // 更新模型状态
    const { error: updateError } = await supabase
      .from('models')
      .update({
        status: newStatus,
        tune_id: tune?.id,
        tune_status: tune?.status,
        tune_error: tune?.error,
      })
      .eq('user_id', user_id)
      .eq('id', model_id);

    if (updateError) {
      console.error('更新模型状态失败:', updateError);
      return NextResponse.json(
        { message: 'Failed to update model status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Model status updated' });
  } catch (error) {
    console.error('处理 webhook 失败:', error);
    return NextResponse.json(
      { message: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
