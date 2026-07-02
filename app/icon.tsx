import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Ícono/favicon de marca.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#ffd75e",
          color: "#17140f",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 38,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        CL
      </div>
    ),
    { ...size },
  );
}
