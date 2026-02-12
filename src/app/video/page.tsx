import { videoSchema } from "@/lib/ffmpeg/videoSchema";
import { useVideoForm } from "./useVideoForm";


const VideoToolPage = () => {
    const form = useVideoForm(videoSchema.parse({}));
    
  return (
    <div className="cyber-root">
      <h1 className="neo-title">NightShift Video Tool</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        {/* Next step: Inputs + Settings */}
      </form>
    </div>
  );
};
export default VideoToolPage;
