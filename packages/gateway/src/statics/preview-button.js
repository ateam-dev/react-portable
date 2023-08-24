import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.0.2.min.js";

const { button, div, p } = van.tags;

const containerStyle = `
position: sticky;
bottom: 0;
left: 0;
width: 100%;
height: 50px;
display: flex;
justify-content: space-between;
align-items: center;
padding: 0 10px;
background-color: rgba(0, 0, 0, 50%);
backdrop-filter: blur(10px);
`;

const buttonStyle = `
background-color: black;
color: white;
border-radius: 5px;
padding: 10px;
height: 40px;
font-size: 16px;
border: solid 1px black;
box-shadow: 2px 2px 5px rgba(0, 0, 0, 20%);
line-height: 100%;
cursor: pointer;
`;

const infoStyle = `
font-size: 16px;
color: white;
line-height: 100%;
`;

let isPreviewing = false;
const statusMessage = van.state("🟠 Waiting for connection to server...");

const socket = new WebSocket(
  `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${
    window.location.host
  }`,
);
socket.addEventListener("open", function (event) {
  statusMessage.val = "🔵 Ready for preview.";
});
socket.addEventListener("message", function (event) {
  if (event.data === "reload") {
    if (isPreviewing) preview();
    else statusMessage.val = "🔵 Ready for preview.";
  }
  if (event.data === "rebuilding") statusMessage.val = "🟠 Rebuilding...";
});
socket.addEventListener("error", function (event) {
  console.error("WebSocket Error:", event);
});
socket.addEventListener("close", function () {
  statusMessage.val = `🔴 Disconnected from preview server.`;
});

const Container = () => {
  return div(
    {
      style: containerStyle,
    },
    Info(),
    button(
      {
        style: buttonStyle,
        type: "button",
        onclick: () => {
          isPreviewing = true;
          preview();
        },
      },
      "Preview",
    ),
  );
};

const Info = () => {
  return p({ style: infoStyle }, statusMessage);
};

const preview = () => {
  window.rpPreviewDispatchers?.forEach(([, dispatcher]) => {
    dispatcher();
  });

  statusMessage.val =
    window.rpPreviewDispatchers?.length > 0
      ? `🟢 Previewing ${window.rpPreviewDispatchers.length} element(s)`
      : `🟠 No elements for preview.`;
};

van.add(document.body, Container());
