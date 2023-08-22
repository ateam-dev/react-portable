import { FC, MouseEventHandler, ReactNode } from "react";
import { previewify } from "@react-portable/core";

type Props = {
  imgSrc?: string;
  name?: string | ReactNode;
  types?: string[];
  onClick?: MouseEventHandler<HTMLDivElement>;
  children?: ReactNode;
};

const Component: FC<Props> = ({ imgSrc, name, types, onClick, children }) => {
  return (
    <div
      className="max-w-md py-4 px-8 bg-white shadow-lg rounded-lg my-20"
      onClick={onClick}
    >
      <div className="flex justify-center -mt-16">
        <img
          className="w-20 h-20 object-cover rounded-full border border-gray-200 bg-white"
          alt=""
          src={imgSrc}
        />
      </div>
      <div>
        <h2 className="text-gray-800 text-3xl font-semibold">{name}</h2>
        <p className="mt-2 text-gray-600">{types?.join(", ")}</p>
        {children}
      </div>
    </div>
  );
};

export const Pokemon = previewify(Component, "pokemon");
