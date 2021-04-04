import { Dispatch, SetStateAction, useState } from "react";

// https://dev.to/stanleyjovel/simplify-controlled-components-with-react-hooks-23nn
// use this hook for ALL the inputs
export const useInputChange = function<T>(): [
  T,
  Dispatch<SetStateAction<T>>,
  (e: React.ChangeEvent<HTMLInputElement>) => void
] {
  const [input, setInputInternal] = useState<T>({} as T);

  const setInput :Dispatch<SetStateAction<T>> = (obj:SetStateAction<T>) :void => {
    setInputInternal({
        ...input,
        ...obj,
      });
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
  {
    // console.log('e.currentTarget.name', e.currentTarget.name);
    // console.log('e.currentTarget.value', e.currentTarget.value);
    // console.log({
    //   ...input,
    //   [e.currentTarget.name]: e.currentTarget.value,
    // })
    setInputInternal({
      ...input,
      [e.currentTarget.name]: e.currentTarget.value,
    });
  }
  return [input, setInput, handleInputChange];
};
