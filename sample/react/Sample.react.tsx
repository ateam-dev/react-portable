import { FC, useReducer } from "react";
import { ButtonReact } from "./Button.react";

const SampleReact: FC<{ n?: number }> = ({ n }) => {
  const [counter, increment] = useReducer((s) => s + 1, n ?? 0);
  return (
    <div>
      <span className="text-5xl text-green-500">{counter}</span>
      <ButtonReact className="text-5xl" onClick={increment}>
        +1
      </ButtonReact>
    </div>
  );
};

export default SampleReact;
