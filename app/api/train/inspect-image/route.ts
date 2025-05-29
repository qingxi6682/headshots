/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-29 11:55:22
 * @LastEditTime: 2025-05-29 14:09:11
 */
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();

  try {
    const response = await fetch('https://api.astria.ai/images/inspect', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ASTRIA_API_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();
    console.log('Inspection response: here', data);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to inspect image' },
      { status: 500 }
    );
  }
}
