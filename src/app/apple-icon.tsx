import { ImageResponse } from "next/og";

// The home-screen icon on iPhones and iPads: the same < > mark as the browser tab icon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B3D1E" }}>
        <svg width="124" height="124" viewBox="0 0 64 64">
          <polyline points="27,19 14,32 27,45" fill="none" stroke="#0DB031" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="37,19 50,32 37,45" fill="none" stroke="#A8E6B8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
