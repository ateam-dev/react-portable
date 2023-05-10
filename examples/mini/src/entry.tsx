import { FC, useReducer } from "react";
import { Button } from "./Button";

const Entry: FC<{ n?: number }> = ({ n }) => {
  const [counter, increment] = useReducer((s) => s + 1, n ?? 0);
  return (
    <div>
      <span className="text-5xl text-green-500">{counter}</span>
      <Button className="text-5xl" onClick={increment}>
        インクリメント！
      </Button>
    </div>
  );
};

export default Entry;
