/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-28 15:33:03
 * @LastEditTime: 2025-05-28 22:28:26
 */
import Train from '@/components/blocks/train';
import { getTrainPage } from '@/services/page';

export default async function TrainPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getTrainPage(locale);

  return <>{page.train && <Train train={page.train} />}</>;
}
