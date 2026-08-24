import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #150D08, #0A0605)",
        }}
      >
        <div
          style={{
            width: 320,
            height: 320,
            borderRadius: 96,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(150deg, #FFD08A, #F2A63B 55%, #C9701A)",
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: "22px solid rgba(26,15,5,0.85)",
              display: "flex",
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
