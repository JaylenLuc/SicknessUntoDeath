import type { CSSProperties } from "react";
import styles from "./StationZoomAnimation.module.css";

export default function StationAnimation({ size = 96 }: { size?: number }) {
  return <span className={styles.animation} aria-hidden="true"
    style={{ "--station-animation-size": `${size}px` } as CSSProperties} />;
}
