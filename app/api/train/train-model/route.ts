import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const astriaApiKey = process.env.ASTRIA_API_KEY;
const astriaTestModeIsOn = process.env.ASTRIA_TEST_MODE === 'true';
const packsIsEnabled = process.env.NEXT_PUBLIC_TUNE_TYPE === 'packs';
// For local development, recommend using an Ngrok tunnel for the domain

const appWebhookSecret = process.env.APP_WEBHOOK_SECRET;
const stripeIsConfigured = process.env.NEXT_PUBLIC_STRIPE_IS_ENABLED === 'true';

if (!appWebhookSecret) {
  throw new Error('MISSING APP_WEBHOOK_SECRET!');
}

export async function POST(request: Request) {
  // 获取当前登录用户
  const session = await auth();
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  console.log('session:', session);

  const payload = await request.json();
  const images = payload.urls;
  const type = payload.type;
  const pack = payload.pack;
  const name = payload.name;
  const characteristics = payload.characteristics;

  if (!astriaApiKey) {
    return NextResponse.json(
      {
        message:
          'Missing API Key: Add your Astria API Key to generate headshots',
      },
      {
        status: 500,
      }
    );
  }

  if (images?.length < 4) {
    return NextResponse.json(
      {
        message: 'Upload at least 4 sample images',
      },
      { status: 500 }
    );
  }

  // 创建 Supabase 客户端
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 查询用户信息
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', session.user.email)
    .single();
  console.log('userData:', userData, 'userError:', userError);

  if (userError || !userData) {
    return NextResponse.json({ error: '用户信息获取失败' }, { status: 403 });
  }

  /*
  // 检查用户积分
  const { data: creditData, error: creditError } = await supabase
    .from('credits')
    .select('credits')
    .eq('user_id', userData.id)
    .single();
  console.log('creditData:', creditData, 'creditError:', creditError);

  if (creditError || !creditData) {
    return NextResponse.json({ error: '积分信息获取失败' }, { status: 403 });
  }

  if (creditData.credits < 1) {
    return NextResponse.json(
      { message: 'Not enough credits' },
      { status: 400 }
    );
  }
  */

  // 训练前插入模型记录
  const { data: modelRow, error: insertError } = await supabase
    .from('models')
    .insert({
      name,
      type,
      user_id: userData.id,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: '模型记录插入失败' }, { status: 500 });
  }

  // 创建模型训练请求
  try {
    const blobUrls = payload.urls;
    console.log('开始调用 Astria API，请求参数:', {
      tune: {
        callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/train/train-webhook?user_id=${userData.id}&model_id=${modelRow.id}&webhook_secret=${appWebhookSecret}`,
        title: `${name} - ${userData.id}`,
        name: type,
        branch: 'fast',
        image_urls: blobUrls,
      },
    });

    const response = await fetch('https://api.astria.ai/tunes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${astriaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tune: {
          callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/train/train-webhook?user_id=${userData.id}&model_id=${modelRow.id}&webhook_secret=${appWebhookSecret}`,
          title: `${name} - ${userData.id}`,
          name: type,
          branch: 'fast',
          image_urls: blobUrls,
        },
      }),
    });

    const responseData = await response.json();
    console.log('Astria API 响应:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
    });

    if (!response.ok) {
      console.error('Astria API 调用失败:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
      });
      return NextResponse.json(
        {
          message: responseData.message || 'Failed to create fine-tuned model',
        },
        { status: response.status }
      );
    }

    // Astria API 调用成功，开始更新数据库
    try {
      // 保存 tune_id 及相关信息到数据库
      const { error: modelError } = await supabase
        .from('models')
        .update({
          modelid: responseData.id,
          status: 'training',
          name: responseData.title,
          type: responseData.name,
          token: responseData.token, // 新增 token
          eta: responseData.eta, // 新增 eta
          callback: responseData.callback,
        })
        .eq('id', modelRow.id)
        .eq('user_id', userData.id);

      if (modelError) {
        console.error('更新模型状态失败:', modelError);
        return NextResponse.json(
          { error: '更新模型状态失败' },
          { status: 500 }
        );
      }

      // 批量插入 orig_images 到 images 表
      if (
        Array.isArray(responseData.orig_images) &&
        responseData.orig_images.length > 0
      ) {
        const imagesToInsert = (responseData.orig_images as string[]).map(
          (uri: string) => ({
            modelid: modelRow.id,
            uri,
            created_at: new Date().toISOString(),
          })
        );
        const { error: imagesError } = await supabase
          .from('images')
          .insert(imagesToInsert);
        if (imagesError) {
          console.error('图片信息写入失败:', imagesError);
          return NextResponse.json(
            { error: '图片信息写入失败' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        message: 'Model training started',
        tune_id: responseData.id,
      });
    } catch (dbError) {
      console.error('数据库操作失败:', dbError);
      return NextResponse.json({ message: '数据库操作失败' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating fine-tuned model:', error);
    return NextResponse.json(
      { message: 'Failed to create fine-tuned model' },
      { status: 500 }
    );
  }
}
