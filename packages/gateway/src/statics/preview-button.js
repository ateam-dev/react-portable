import van from "https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.0.2.min.js";

const { button, input, form, p } = van.tags;

const containerStyle = `
position: fixed;
bottom: 20px;
right: 20px;
`;

const buttonStyle = `
background-color: black;
color: white;
border-radius: 5px;
padding: 10px;
font-size: 16px;
border: solid 1px black;
box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
`;

const inputStyle = `
margin-right: 2px;
padding: 10px;
width: 186px;
font-size: 16px;
border: solid 1px #464646;
border-radius: 5px;
box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
`;

const infoStyle = `
width: 100%;
background-color: #ececec;
color: black;
padding: 10px;
font-size: 16px;
border-radius: 5px;
margin-bottom: 8px;
box-shadow: 2px 2px 5px rgba(0,0,0,0.2);
`;

const Container = () => {
  const code = van.state(restoreCode() ?? "*");
  const dom = form(
    {
      style: containerStyle,
      onsubmit: (e) => {
        e.preventDefault();
        storeCode(code.val);

        const elements = preview(code.val);
        if (elements) {
          const info = Info(elements);
          dom.prepend(info);
          setTimeout(() => info.remove(), 3000);
        }
      },
    },
    Input(code),
    button(
      {
        style: buttonStyle,
        type: "submit",
      },
      "Preview",
    ),
  );

  return dom;
};

const Info = (elements) => {
  return p({ style: infoStyle }, "Previewing ", elements, " element(s)");
};

const Input = (state) => {
  return input({
    style: inputStyle,
    type: "text",
    placeholder: "input code to preview",
    title:
      'To preview multiple codes, input them separated by a space, or input "*" to preview them all at once.',
    value: state,
    onchange: (e) => (state.val = e.target.value),
  });
};

const preview = (codes) => {
  const selectors = !codes || codes === "*" ? [] : code.split(" ");
  let counter = 0;
  window.rpPreviewDispatchers.forEach(([code, dispatcher]) => {
    if (selectors.length > 0 && !selectors.includes(code)) return;

    dispatcher();
    counter++;
  });

  return counter;
};

const storeCode = (code) => {
  localStorage.setItem("rp-preview-selector-code", code);
};

const restoreCode = () => {
  return localStorage.getItem("rp-preview-selector-code");
};

van.add(document.body, Container());
