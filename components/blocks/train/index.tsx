/*
 * @version: 1.0.0
 * @Author: Eblis
 * @Date: 2025-05-27 11:02:22
 * @LastEditTime: 2025-05-30 11:35:09
 */
'use client';

import { Check, Loader, UploadIcon } from 'lucide-react';
import { Train as TrainType } from '@/types/blocks/train';
import { useEffect, useState } from 'react';
import TrainModelZone from '@/components/blocks/train/TrainModelZone';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/icon';
import { Label } from '@/components/ui/label';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { useAppContext } from '@/contexts/app';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Train({ train }: { train: TrainType }) {
  if (train.disabled) {
    return null;
  }

  const { user, setShowSignModal } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user === null) {
      setShowSignModal(true);
    }
  }, [user, setShowSignModal]);

  return (
    <section id={train.name} className="py-16">
      <div className="container">
        <div className="mx-auto mb-12 text-center">
          <h2 className="mb-4 text-4xl font-semibold lg:text-5xl">
            {train.title}
          </h2>
          <p className="text-muted-foreground lg:text-lg">
            {train.description}
          </p>
        </div>
        <div className="w-full max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{train.card_title}</CardTitle>
              <CardDescription>{train.card_description}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <TrainModelZone packSlug="default" />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
