import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { logger } from "@client/src/lib/logger";

import { submitProblemFeedback } from "@client/src/api/actions";
import { Button } from "@client/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@client/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@client/src/components/ui/form";
import { Input } from "@client/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/src/components/ui/select";
import { Textarea } from "@client/src/components/ui/textarea";
import { useI18n } from "@client/src/hooks/use-i18n";
import {
  createMaterialDetailPt,
  type MaterialDetailPt,
} from "./material-detail-i18n";
import {
  PROBLEM_TYPE_LABEL_KEYS,
  PROBLEM_TYPE_VALUES,
  SEVERITY_LABEL_KEYS,
  SEVERITY_VALUES,
} from "./material-detail-utils";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialId: string;
  versionId: string | undefined;
}

function createFeedbackSchema(pt: MaterialDetailPt) {
  return z.object({
    problemTitle: z
      .string()
      .trim()
      .min(1, pt("feedback.err.titleRequired"))
      .max(100, pt("feedback.err.titleMax")),
    problemType: z.string().min(1, pt("feedback.err.typeRequired")),
    problemDescription: z
      .string()
      .trim()
      .min(1, pt("feedback.err.descRequired")),
    severityLevel: z.string().min(1, pt("feedback.err.severityRequired")),
  });
}

type FeedbackFormData = z.infer<ReturnType<typeof createFeedbackSchema>>;

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  open,
  onOpenChange,
  materialId,
  versionId,
}) => {
  const { language } = useI18n();
  const pt = useMemo(() => createMaterialDetailPt(language), [language]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const schema = useMemo(() => createFeedbackSchema(pt), [pt]);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      problemTitle: "",
      problemType: "",
      problemDescription: "",
      severityLevel: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async (data: FeedbackFormData): Promise<void> => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await submitProblemFeedback({
        materialId,
        versionId,
        problemTitle: data.problemTitle,
        problemType: data.problemType,
        problemDescription: data.problemDescription,
        severityLevel: data.severityLevel,
      });
      toast.success(pt("feedback.success"));
      onOpenChange(false);
    } catch (error: unknown) {
      logger.error(
        `Submit feedback failed: ${
          error instanceof Error ? error.stack ?? error.message : String(error)
        }`,
      );
      toast.error(pt("feedback.error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{pt("feedback.title")}</DialogTitle>
          <DialogDescription>{pt("feedback.desc")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data: FeedbackFormData) =>
              void onSubmit(data),
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="problemTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {pt("feedback.field.title")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={pt("feedback.ph.title")}
                      maxLength={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4">
              <FormField
                control={form.control}
                name="problemType"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {pt("feedback.field.type")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={pt("feedback.ph.type")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROBLEM_TYPE_VALUES.map((value: string) => (
                          <SelectItem key={value} value={value}>
                            {pt(PROBLEM_TYPE_LABEL_KEYS[value] ?? value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="severityLevel"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      {pt("feedback.field.severity")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={pt("feedback.ph.severity")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEVERITY_VALUES.map((value: string) => (
                          <SelectItem key={value} value={value}>
                            {pt(SEVERITY_LABEL_KEYS[value] ?? value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="problemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {pt("feedback.field.description")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder={pt("feedback.ph.description")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {pt("feedback.submit")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
