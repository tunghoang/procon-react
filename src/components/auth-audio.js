import React, { useContext, useEffect, useRef } from "react";
import Context from "../context";

export default function AuthAudio({
  src,
  type = "audio/wav",
  controls = true,
}) {
  const { token } = useContext(Context);
  const audioRef = useRef(null);
  useEffect(() => {
    initAudio();
  }, []);

  const initAudio = async () => {
    try {
      const result = await fetch(src, {
        method: "GET",
        headers: {
          Authorization: token,
        },
      });
      const blob = await result.blob();
      audioRef.current.src = URL.createObjectURL(blob);
    } catch (error) {
      console.error(error);
    }
  };
  return (
    <>
      <audio ref={audioRef} type={type} controls={controls} />
    </>
  );
}
