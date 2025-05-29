'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { SubmitHandler, useForm } from 'react-hook-form';
import { FaFemale, FaImages, FaMale, FaRainbow } from 'react-icons/fa';
import * as z from 'zod';
import { fileUploadFormSchema } from '@/types/train/zod';
import { upload } from '@vercel/blob/client';
import axios from 'axios';
import { ImageInspector } from './ImageInspector';
import {
  ImageInspectionResult,
  aggregateCharacteristics,
} from '@/lib/imageInspection';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

type FormInput = z.infer<typeof fileUploadFormSchema>;

const stripeIsConfigured = process.env.NEXT_PUBLIC_STRIPE_IS_ENABLED === 'true';

export default function TrainModelZone({ packSlug }: { packSlug: string }) {
  const { data: session, status } = useSession();
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [characteristics, setCharacteristics] = useState<
    ImageInspectionResult[]
  >([]);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<FormInput>({
    resolver: zodResolver(fileUploadFormSchema),
    defaultValues: {
      name: '',
      type: 'man',
    },
  });

  const onSubmit: SubmitHandler<FormInput> = () => {
    trainModel();
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newFiles: File[] =
        acceptedFiles.filter(
          (file: File) => !files.some(f => f.name === file.name)
        ) || [];

      // if user tries to upload more than 10 files, display a toast
      if (newFiles.length + files.length > 10) {
        toast({
          title: 'Too many images',
          description:
            'You can only upload up to 10 images in total. Please try again.',
          duration: 5000,
        });
        return;
      }

      // display a toast if any duplicate files were found
      if (newFiles.length !== acceptedFiles.length) {
        toast({
          title: 'Duplicate file names',
          description:
            'Some of the files you selected were already added. They were ignored.',
          duration: 5000,
        });
      }

      // check that in total images do not exceed a combined 4.5MB
      const totalSize = files.reduce((acc, file) => acc + file.size, 0);
      const newSize = newFiles.reduce((acc, file) => acc + file.size, 0);

      if (totalSize + newSize > 50 * 1024 * 1024) {
        toast({
          title: 'Images exceed size limit',
          description:
            'The total combined size of the images cannot exceed 50MB.',
          duration: 5000,
        });
        return;
      }

      setFiles([...files, ...newFiles]);

      toast({
        title: 'Images selected',
        description: 'The images were successfully selected.',
        duration: 5000,
      });
    },
    [files, toast]
  );

  const removeFile = useCallback(
    (file: File) => {
      setFiles(files.filter(f => f.name !== file.name));
    },
    [files]
  );

  const handleInspectionComplete = (
    result: ImageInspectionResult,
    file: File
  ) => {
    setCharacteristics(prev => [...prev, result]);
  };

  const trainModel = useCallback(async () => {
    setIsLoading(true);
    // Upload each file to Vercel blob and store the resulting URLs
    const blobUrls = [];

    if (files) {
      const modelName = form.watch('name').trim();
      const timestamp = new Date().getTime();

      for (const file of files) {
        const newFileName = `${modelName}-${timestamp}-${file.name}`;
        const blob = await upload(newFileName, file, {
          access: 'public',
          handleUploadUrl: '/api/train/train-model/image-upload',
        });
        blobUrls.push(blob.url);
      }
    }

    // console.log(blobUrls, "blobUrls");
    const aggregatedCharacteristics = aggregateCharacteristics(characteristics);

    const payload = {
      urls: blobUrls,
      name: form.getValues('name').trim(),
      type: form.getValues('type'),
      pack: packSlug,
      characteristics: aggregatedCharacteristics,
    };

    // Send the JSON payload to the "/api/train/train-model" endpoint
    const response = await fetch('/api/train/train-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    setIsLoading(false);

    if (!response.ok) {
      const responseData = await response.json();
      console.error('训练模型失败:', {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
      });

      const responseMessage: string =
        responseData.message || responseData.error || '训练模型失败';
      const messageWithButton = (
        <div className="flex flex-col gap-4">
          {responseMessage}
          {responseMessage.includes('Not enough credits') && (
            <a href="/get-credits">
              <Button size="sm">Get Credits</Button>
            </a>
          )}
        </div>
      );
      toast({
        title: '训练失败',
        description: responseMessage.includes('Not enough credits')
          ? messageWithButton
          : responseMessage,
        duration: 5000,
      });
      return;
    }

    const successData = await response.json();
    console.log('训练模型成功:', successData);

    toast({
      title: '模型已开始训练',
      description: '模型已加入训练队列，训练完成后会通过邮件通知您。',
      duration: 5000,
    });

    router.push('/');
  }, [files, characteristics, form, packSlug, toast, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
  });

  const modelType = form.watch('type');

  return (
    <div>
      {status === 'loading' ? (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : status === 'unauthenticated' ? (
        <div className="flex flex-col items-center justify-center gap-4 p-4">
          <p>请先登录后再上传图片</p>
          <Button onClick={() => router.push('/auth/signin')}>去登录</Button>
        </div>
      ) : (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="rounded-md flex flex-col gap-8"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="w-full rounded-md">
                  <FormLabel>Name</FormLabel>
                  <FormDescription>
                    Give your model a name so you can easily identify it later.
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="e.g. Natalie Headshots"
                      {...field}
                      className="max-w-screen-sm"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col gap-4">
              <FormLabel>Type</FormLabel>
              <FormDescription>
                Select the type of headshots you want to generate.
              </FormDescription>
              <RadioGroup
                defaultValue={modelType}
                className="grid grid-cols-3 gap-4"
                value={modelType}
                onValueChange={value => {
                  form.setValue('type', value);
                }}
              >
                <div>
                  <RadioGroupItem
                    value="man"
                    id="man"
                    className="peer sr-only"
                    aria-label="man"
                  />
                  <Label
                    htmlFor="man"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <FaMale className="mb-3 h-6 w-6" />
                    Man
                  </Label>
                </div>

                <div>
                  <RadioGroupItem
                    value="woman"
                    id="woman"
                    className="peer sr-only"
                    aria-label="woman"
                  />
                  <Label
                    htmlFor="woman"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <FaFemale className="mb-3 h-6 w-6" />
                    Woman
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="person"
                    id="person"
                    className="peer sr-only"
                    aria-label="person"
                  />
                  <Label
                    htmlFor="person"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <FaRainbow className="mb-3 h-6 w-6" />
                    Unisex
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div
              {...getRootProps()}
              className=" rounded-md justify-center align-middle cursor-pointer flex flex-col gap-4"
            >
              <FormLabel>Samples</FormLabel>
              <FormDescription>
                Upload 4-10 images of the person you want to generate headshots
                for.
              </FormDescription>
              <div className="outline-dashed outline-2 outline-gray-100 hover:outline-blue-500 w-full h-full rounded-md p-4 flex justify-center align-middle">
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p className="self-center">Drop the files here ...</p>
                ) : (
                  <div className="flex justify-center flex-col items-center gap-2">
                    <FaImages size={32} className="text-gray-700" />
                    <p className="self-center">
                      Drag 'n' drop some files here, or click to select files.
                    </p>
                  </div>
                )}
              </div>
            </div>
            {files.length > 0 && (
              <div className="flex flex-row gap-4 flex-wrap">
                {files.map(file => (
                  <div key={file.name} className="flex flex-col gap-1">
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        className="rounded-md w-24 h-24 object-cover"
                        alt="Preview"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-1"
                        onClick={() => removeFile(file)}
                      >
                        Remove
                      </Button>

                      <ImageInspector
                        file={file}
                        type={form.getValues('type')}
                        onInspectionComplete={result =>
                          handleInspectionComplete(result, file)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              Train Model{' '}
              {stripeIsConfigured && <span className="ml-1">(1 Credit)</span>}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
