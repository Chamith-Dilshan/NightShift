import { VideoAppDispatch, VideoRootState } from "@/store/videoStore";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

/* Typed hooks */
export const useAppDispatch = () => useDispatch<VideoAppDispatch>();
export const useAppSelector: TypedUseSelectorHook<VideoRootState> = useSelector;
