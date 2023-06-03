import { FC } from "react";

type Props = {
  imgSrc: string;
  name: string;
  types: string[];
};

export const Pokemon: FC<Props> = ({ imgSrc, name, types }) => {
  return (
    <div className="max-w-md py-4 px-8 bg-white shadow-lg rounded-lg my-20">
      <div className="flex justify-center -mt-16">
        <img
          className="w-20 h-20 object-cover rounded-full border border-gray-200 bg-white"
          alt={name}
          src={imgSrc}
        />
      </div>
      <div>
        <h2 className="text-gray-800 text-3xl font-semibold">{name}</h2>
        <p className="mt-2 text-gray-600">{types.join(", ")}</p>
      </div>
    </div>
  );
};
