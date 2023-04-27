/** @jsxImportSource react */
import { useReducer } from "react";

const Sample = () => {
  const [counter, increment] = useReducer((s) => s + 1, 0);
  return (
    <div>
      <span className="text-5xl text-green-500">{counter}</span>
      <button className="text-5xl" onClick={increment}>
        +1
      </button>
    </div>
  );
};

export default Sample;
