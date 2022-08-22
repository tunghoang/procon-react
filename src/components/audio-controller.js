import React, { useEffect, useRef, useState } from "react";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import { Chip } from "@mui/material";

export default function AudioController({ src, label, type = "audio/wav" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    audioRef.current.addEventListener("ended", () => setPlaying(false));
    return () => {
      audioRef.current.removeEventListener("ended", () => setPlaying(false));
    };
  }, []);

  const handleClick = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setPlaying(true);
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    }
  };

  const Icon = ({ color }) => {
    return playing ? (
      <PauseCircleIcon sx={{ color: color }} />
    ) : (
      <PlayCircleIcon sx={{ color: color }} />
    );
  };

  return (
    <>
      <Chip
        label={label}
        onClick={handleClick}
        onDelete={handleClick}
        deleteIcon={<Icon color={"rgba(18, 24, 40, 0.26)"} />}
      />
      <audio ref={audioRef} src={src} type={type} preload="metadata" />
    </>
  );
}
