/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-27 10:08:21
 * @LastEditTime: 2025-05-27 11:32:01
 */
import { Button } from '@/types/blocks/base/button';

export interface TrainGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
}

export interface TrainItem {
  title?: string;
  description?: string;
  label?: string;
  features_title?: string;
  features?: string[];
  button?: {
    title: string;
    icon?: string;
  };
  tip?: string;
  is_featured?: boolean;
  interval: 'month' | 'year' | 'one-time';
  product_id: string;
  product_name?: string;
  amount: number;
  cn_amount?: number;
  currency: string;
  credits?: number;
  valid_months?: number;
  group?: string;
}

export interface Train {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  card_title?: string;
  card_description?: string;
  items?: TrainItem[];
  groups?: TrainGroup[];
}
