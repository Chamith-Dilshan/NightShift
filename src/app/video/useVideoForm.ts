import { videoSchema } from "@/store/videoTool/videoSchema";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";

type VideoFormValues = z.infer<typeof videoSchema>;

export function useVideoForm(defaultValues: VideoFormValues) {
  return useForm({
    defaultValues,

    validators: {
      onChange: videoSchema,
    },

    onSubmit: async ({ value }) => {
      console.log("Final Export:", value);
    },
  });
}
