import React, { useState } from "react";
import "./Elements.css";
import axios from "axios";
function Elements(props) {
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    props.handler(true);
    props.setData([{ columnName: "", dataType: "", pk: 'f', nc: 'f', uc: 'f', fk: 'f' }])

    if (option == 'Option 2'){
      props.handler(false);
      props.modTable([...props.tables, props.data])
    }

    if (option == "Option 3") {
      axios
        .post("http://localhost:4000/schema", props.tables, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.error(error);
        });
        props.handler(false);
    }
  };

  return (
    <div>
      <ul>
        <button
          className="button-gap"
          onClick={() => handleOptionClick("Option 1")}
        >
          + Add Collection
        </button>

        <button
          className="button-gap"
          onClick={() => handleOptionClick("Option 2")}
        >
          Finalize Collection
        </button>
        <button
          className="button-gap"
          onClick={() => handleOptionClick("Option 3")}
        >
          Finalize Schema
        </button>
      </ul>
      {selectedOption && <p>You selected: {selectedOption}</p>}
    </div>
  );
}
export default Elements;
