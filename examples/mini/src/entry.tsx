import { FC, useReducer } from "react";
import { Button } from "./Button";

const Entry: FC<{ n?: number }> = ({ n }) => {
  const [counter, increment] = useReducer((s) => s + 1, n ?? 0);
  return (
    <div className="p-2">
      <Button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full"
        onClick={increment}
      >
        + 1
      </Button>
      <span className="ml-3 text-xl text-green-500">{counter}</span>
    </div>
  );
};

export default Entry;
