import "./RowBuilder.css";
import { useState } from "react";

const conditions = ["min", "max", "avg", "range", "nunique", "histogram"];
function RowBuilder({
  data,
  setData,
  c_names,
  setCNames,
  tables,
  responseFromServer,
}) {
  const handleTableNameChange = (e, index) => {
    const newData = [...data];
    newData[index].tableName = e.target.value;
    setData(newData);

    let cName = [];
    for (let i = 0; i < responseFromServer.length; i++) {
      let tableName = Object.keys(responseFromServer[i]);
      if (tableName[0] === e.target.value) {
        console.log(responseFromServer[i][tableName]);
        cName = responseFromServer[i][tableName];
      }
    }
    // responseFromServer;
    setCNames(cName);

    // setCNames(global_tables[e.target.value]);
  };
  const handleTextChange = (e, index) => {
    const newData = [...data];
    newData[index].tempColName = e.target.value;
    setData(newData);
  };

  const handleColumnTypeChange = (e, index) => {
    const newData = [...data];
    newData[index].columnName = e.target.value;
    setData(newData);
  };

  const handleConditionTypeChange = (e, index) => {
    const newData = [...data];
    newData[index].condition = e.target.value;
    setData(newData);
  };

  const handleDeleteRow = (index) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };

  return (
    <div>
      <ul>
        {data.map((row, index) => (
          <li key={index}>
            <div>
              <label htmlFor={`referred from-${index}`}>table name</label>
              <select
                id={`columnName-${index}`}
                value={row.tableName}
                onChange={(e) => handleTableNameChange(e, index)}
              >
                <option value="">Select table name</option>
                {tables.map((val) => {
                  return <option value={val.toString()}>{val}</option>;
                })}
              </select>
            </div>
            <div>
              <label htmlFor={`dataType-${index}`}>column name</label>
              <select
                id={`dataType-${index}`}
                value={row.columnName}
                onChange={(e) => handleColumnTypeChange(e, index)}
              >
                <option value="">Select column name</option>
                {c_names.map((val) => {
                  return <option value={val.toString()}>{val}</option>;
                })}
              </select>
            </div>
            <div>
              <label htmlFor={`dataType-${index}`}>condition</label>
              <select
                id={`dataType-${index}`}
                value={row.condition}
                onChange={(e) => handleConditionTypeChange(e, index)}
              >
                <option value="">Select pls</option>
                {conditions.map((val) => {
                  return <option value={val}>{val}</option>;
                })}
              </select>
            </div>

            <button onClick={() => handleDeleteRow(index)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RowBuilder;
