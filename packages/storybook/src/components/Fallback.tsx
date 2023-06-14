import React from "react";

export const Fallback = ({
  status,
  message,
}: {
  status: number;
  message: string;
}) => {
  return (
    <p
      style={{
        maxWidth: 600,
        margin: "auto",
        border: "1px solid #713fc2",
        borderRadius: 4,
        background: "white",
      }}
    >
      <strong
        style={{
          display: "inline-block",
          padding: 15,
          background: "#713fc2",
          color: "white",
        }}
      >
        {status}
      </strong>
      <span
        style={{
          display: "inline-block",
          padding: 15,
          background: "white",
        }}
      >
        {message}
      </span>
    </p>
  );
};
