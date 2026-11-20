import { ImageResponse } from "next/og";

// The picture shown when the site link is shared (text messages, Slack, email, social media).
// Drawn in code with the design colours, so there is no image file to maintain.
export const alt = "CIC Launchpad: free Python lessons from Coding in Color";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#0B3D1E", color: "#FFFFFF", position: "relative" }}>
        <div style={{ position: "absolute", right: -40, top: -140, display: "flex", fontSize: 900, fontWeight: 700, color: "#0F4527", lineHeight: 1 }}>{">"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="84" height="84" viewBox="0 0 64 64">
            <polyline points="27,19 14,32 27,45" fill="none" stroke="#0DB031" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="37,19 50,32 37,45" fill="none" stroke="#A8E6B8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: "flex", fontSize: 60, fontWeight: 700, letterSpacing: -1 }}>Launchpad</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.03, letterSpacing: -3, maxWidth: 900 }}>Learn to code at your own pace</div>
          <div style={{ display: "flex", fontSize: 36, color: "#E0F1E5", maxWidth: 840 }}>Free Python lessons for high school students, from Coding in Color in Phoenix, Arizona.</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {["Videos", "Quick checks", "Code in your browser"].map((t) => (
            <div key={t} style={{ display: "flex", padding: "10px 20px", borderRadius: 12, background: "#D6F2DE", color: "#0B3D1E", fontSize: 28, fontWeight: 700 }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
