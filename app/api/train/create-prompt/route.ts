import { NextResponse } from 'next/server';

const astriaApiKey = process.env.ASTRIA_API_KEY;

export async function POST(request: Request) {
  try {
    const { text, callback, tune_id } = await request.json();
    if (!astriaApiKey) {
      return NextResponse.json(
        { error: 'Missing Astria API Key' },
        { status: 500 }
      );
    }
    if (!text || !callback || !tune_id) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    const response = await fetch(
      `https://api.astria.ai/tunes/${tune_id}/prompts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${astriaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: {
            text,
            callback,
          },
        }),
      }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
