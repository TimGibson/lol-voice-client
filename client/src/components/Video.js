import React, { useEffect, useRef } from "react";
import styles from './video.module.css';

const Video = (props) => {
  const ref = useRef();

  useEffect(() => {
      if (props.peer.on){
          props.peer.on("stream", stream => {
              ref.current.srcObject = stream;
          })
      }
  }, [props.peer]);

  return (
    <video className={styles.video} playsInline autoPlay ref={ref} />
  );
}

export default Video;